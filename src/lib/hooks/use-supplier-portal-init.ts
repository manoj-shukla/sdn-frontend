/**
 * Shared initialization hook for the supplier portal.
 *
 * Used by both:
 *   - /supplier/dashboard                 (portal home — shows ApprovedSupplierDashboard)
 *   - /supplier/onboarding/[section]      (onboarding sub-pages — path-based routing)
 *
 * Responsibilities:
 *   - Fetch /auth/me to sync approval status.
 *   - Fetch supplier, addresses, contacts, documents.
 *   - Hydrate the supplier onboarding Zustand store.
 *   - Compute completedSections for the "Submit Profile" gating.
 *
 * Returns { info, loading, handleFinalSubmit, isSubmitting } so callers can
 * wire up the Submit Profile button + success modal.
 */

"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { useSupplierOnboardingStore } from "@/lib/store/supplier-onboarding-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

export function useSupplierPortalInit() {
    const {
        setActiveSection,
        setCompanyDetails,
        setTaxDetails,
        setBankDetails,
        setSupplierId,
        setStatus,
        reset: resetOnboardingStore,
    } = useSupplierOnboardingStore();

    const { user, updateBuyer } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [info, setInfo] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const init = async () => {
            // Clear any stale data from a previous supplier's session before
            // fetching the current supplier's data.
            resetOnboardingStore();
            try {
                const meRes = (await apiClient.get("/auth/me")) as any;
                if (!meRes.supplierId) return;

                // Sync latest status to store
                if (meRes.userId && updateBuyer) {
                    updateBuyer(meRes.userId, {
                        approvalStatus: meRes.approvalStatus,
                        supplierName: meRes.supplierName,
                    });
                }

                const supRes = (await apiClient.get(`/api/suppliers/${meRes.supplierId}`)) as any;
                setInfo(supRes);
                setStatus(supRes.approvalStatus || supRes.approvalstatus || "DRAFT");

                const addrResRaw = (await apiClient.get(`/api/suppliers/${meRes.supplierId}/addresses`)) as any;
                const contResRaw = (await apiClient.get(`/api/suppliers/${meRes.supplierId}/contacts`)) as any;
                // apiClient interceptor returns response.data directly, so these ARE the data already
                const addrRes = Array.isArray(addrResRaw) ? addrResRaw : addrResRaw?.data || addrResRaw || [];
                const contRes = Array.isArray(contResRaw) ? contResRaw : contResRaw?.data || contResRaw || [];

                const mainAddr =
                    (Array.isArray(addrRes) ? addrRes.find((a: any) => a.isPrimary) : null) || addrRes[0] || {};
                const mainContact =
                    (Array.isArray(contRes) ? contRes.find((c: any) => c.isPrimary) : null) || contRes[0] || {};

                // Initialize Store
                setSupplierId(meRes.supplierId);
                setCompanyDetails({
                    legalName: supRes.legalName || supRes.legalname,
                    country: supRes.country,
                    description: supRes.description,
                    website: supRes.website,
                    businessType: supRes.businessType || supRes.businesstype,
                    addressId: mainAddr.addressId || mainAddr.addressid,
                    address: mainAddr.addressLine1 || mainAddr.addressline1,
                    city: mainAddr.city,
                    zip: mainAddr.postalCode || mainAddr.postalcode,
                    contactId: mainContact.contactId || mainContact.contactid,
                    contactName:
                        mainContact.firstName || mainContact.firstname
                            ? `${mainContact.firstName || mainContact.firstname} ${
                                  mainContact.lastName || mainContact.lastname || ""
                              }`.trim()
                            : "",
                    position: mainContact.designation,
                });

                const isGstReg =
                    supRes.isGstRegistered !== undefined ? supRes.isGstRegistered : supRes.isgstregistered;
                let gstRegString = "No";
                if (isGstReg === true || isGstReg === "true") gstRegString = "Yes";

                setTaxDetails({
                    taxId: supRes.taxId || supRes.taxid,
                    pan: supRes.taxId || supRes.taxid,
                    gstin: supRes.gstin,
                    gstRegistered: gstRegString,
                });

                setBankDetails({
                    bankName: supRes.bankName || supRes.bankname,
                    accountNumber: supRes.accountNumber || supRes.accountnumber,
                    routingNumber: supRes.routingNumber || supRes.routingnumber,
                });

                // Fetch and match documents (non-fatal — portal still loads if this fails)
                let apiDocs: any[] = [];
                try {
                    const docsRaw = (await apiClient.get<any[]>(
                        `/api/suppliers/${meRes.supplierId}/documents`
                    )) as any;
                    apiDocs = Array.isArray(docsRaw) ? docsRaw : docsRaw?.data || docsRaw || [];
                } catch {
                    // Documents endpoint temporarily unavailable — skip silently
                }

                if (Array.isArray(apiDocs)) {
                    const store = useSupplierOnboardingStore.getState();
                    apiDocs.forEach((d) => {
                        const dType = (d.documentType || d.documenttype || "").toLowerCase();
                        const dName = (d.documentName || d.documentname || d.name || "").toLowerCase();

                        const match = store.documents.find((sd) => {
                            const sName = sd.name.toLowerCase();
                            return (
                                sName === dType ||
                                sName === dName ||
                                (sName === "w-9 form" && (dType.includes("w-9") || dName.includes("w-9"))) ||
                                (sName === "pan card" && (dType.includes("pan") || dName.includes("pan"))) ||
                                (sName === "gst certificate" && (dType.includes("gst") || dName.includes("gst"))) ||
                                (sName === "tax registration certificate" &&
                                    (dType.includes("tax") || dName.includes("tax")))
                            );
                        });

                        if (match) {
                            const filePath = d.filePath || d.filepath;
                            let vStatus = (d.verificationStatus || d.verificationstatus || "UPLOADED").toUpperCase();
                            if (vStatus === "APPROVED") vStatus = "VERIFIED";
                            // PENDING / PENDING_APPROVAL means the document WAS uploaded
                            // but is awaiting buyer verification — treat as UPLOADED in the store.
                            if (vStatus === "PENDING" || vStatus === "PENDING_APPROVAL") vStatus = "UPLOADED";
                            store.updateDocumentStatus(match.id, vStatus, filePath);
                        }
                    });
                }

                // Final Validations for Submit Button
                const companyValid = !!(supRes.legalName || supRes.legalname);
                const addressValid =
                    !!(mainAddr.addressLine1 || mainAddr.addressline1) &&
                    !!mainAddr.city &&
                    !!(mainAddr.postalCode || mainAddr.postalcode);
                const contactValid =
                    !!(mainContact.firstName || mainContact.firstname) && !!mainContact.designation;
                const countryNorm = (supRes.country || "").toLowerCase();

                let taxValid = false;
                if (countryNorm === "india" || countryNorm === "ind") {
                    taxValid = !!(supRes.taxId || supRes.taxid) && (isGstReg !== "Yes" || !!supRes.gstin);
                } else {
                    taxValid = !!(supRes.taxId || supRes.taxid);
                }

                let bankValid =
                    !!(supRes.bankName || supRes.bankname) && !!(supRes.accountNumber || supRes.accountnumber);
                if (countryNorm === "india" || countryNorm === "ind") {
                    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
                    bankValid = bankValid && ifscRegex.test(supRes.routingNumber || supRes.routingnumber || "");
                } else {
                    bankValid = bankValid && !!(supRes.routingNumber || supRes.routingnumber);
                }

                let requiredDocs: string[] = ["Certificate of Incorporation"];
                if (countryNorm === "india" || countryNorm === "ind" || countryNorm === "in") {
                    requiredDocs = ["PAN Card", "GST Certificate"];
                } else if (countryNorm === "usa" || countryNorm === "united states" || countryNorm === "us") {
                    requiredDocs = ["W-9 Form"];
                }

                const allRequiredUploaded = requiredDocs.every((name) => {
                    const doc = useSupplierOnboardingStore.getState().documents.find((d: any) => d.name === name);
                    return doc && (doc.status === "UPLOADED" || doc.status === "VERIFIED" || doc.status === "APPROVED");
                });

                useSupplierOnboardingStore.setState((state) => ({
                    completedSections: {
                        ...state.completedSections,
                        company: companyValid,
                        address: addressValid,
                        contact: contactValid,
                        tax: taxValid,
                        bank: bankValid,
                        documents: allRequiredUploaded,
                    },
                }));
            } catch (e) {
                console.error("Init failed", e);
            } finally {
                setLoading(false);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFinalSubmit = async (onSuccess?: () => void) => {
        if (!info?.supplierId) return;
        setIsSubmitting(true);
        try {
            await apiClient.post(`/api/suppliers/${info.supplierId}/reviews/submit`);
            setInfo({ ...info, approvalStatus: "SUBMITTED" });
            setStatus("SUBMITTED");
            if (user?.userId && updateBuyer) {
                updateBuyer(user.userId, { approvalStatus: "SUBMITTED" });
            }
            onSuccess?.();
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to submit profile.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        info,
        setInfo,
        loading,
        isSubmitting,
        handleFinalSubmit,
        // Re-exported for convenience so pages don't need to import the store twice
        setActiveSection,
    };
}
