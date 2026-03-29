"use client";

import { useEffect, useState, Suspense } from "react";
import apiClient from "@/lib/api/client";
import { PortalHeader, PortalNav } from "@/components/supplier/portal-shell";
import { DashboardOverview, CompanySection, AddressSection, ContactSection, TaxSection, BankSection, DocumentsSection, MessagesSection } from "@/components/supplier/portal-sections";
import { useSupplierOnboardingStore } from "@/lib/store/supplier-onboarding-store";
import { ApprovedSupplierDashboard } from "@/components/supplier/approved-dashboard";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

function SupplierDashboardContent() {
    const {
        activeSection,
        setActiveSection,
        setCompanyDetails,
        country,
        completedSections,
        companyDetails,
        taxDetails,
        bankDetails,
        setTaxDetails,
        setBankDetails,
        setSupplierId,
        setStatus,
        status: onboardingStatus
    } = useSupplierOnboardingStore();

    const { user, updateBuyer } = useAuthStore();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [info, setInfo] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const router = useRouter();

    // Sync section from URL
    useEffect(() => {
        const section = searchParams.get('section');
        if (section) {
            setActiveSection(section as any);
        }
    }, [searchParams]);

    useEffect(() => {
        const init = async () => {
            try {
                const meRes = await apiClient.get('/auth/me') as any;
                if (!meRes.supplierId) return;

                // Sync latest status to store
                if (meRes.userId && updateBuyer) {
                    updateBuyer(meRes.userId, {
                        approvalStatus: meRes.approvalStatus,
                        supplierName: meRes.supplierName
                    });
                }

                const supRes = await apiClient.get(`/api/suppliers/${meRes.supplierId}`) as any;
                setInfo(supRes);
                setStatus(supRes.approvalStatus || supRes.approvalstatus || 'DRAFT');

                const addrResRaw = await apiClient.get(`/api/suppliers/${meRes.supplierId}/addresses`) as any;
                const contResRaw = await apiClient.get(`/api/suppliers/${meRes.supplierId}/contacts`) as any;
                // apiClient interceptor returns response.data directly, so these ARE the data already
                const addrRes = Array.isArray(addrResRaw) ? addrResRaw : (addrResRaw?.data || addrResRaw || []);
                const contRes = Array.isArray(contResRaw) ? contResRaw : (contResRaw?.data || contResRaw || []);

                const mainAddr = (Array.isArray(addrRes) ? addrRes.find((a: any) => a.isPrimary) : null) || addrRes[0] || {};
                const mainContact = (Array.isArray(contRes) ? contRes.find((c: any) => c.isPrimary) : null) || contRes[0] || {};

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
                    contactName: (mainContact.firstName || mainContact.firstname) ? `${mainContact.firstName || mainContact.firstname} ${mainContact.lastName || mainContact.lastname || ''}`.trim() : '',
                    position: mainContact.designation,
                });

                const isGstReg = supRes.isGstRegistered !== undefined ? supRes.isGstRegistered : supRes.isgstregistered;
                let gstRegString = 'No';
                if (isGstReg === true || isGstReg === 'true') gstRegString = 'Yes';

                setTaxDetails({
                    taxId: supRes.taxId || supRes.taxid,
                    pan: supRes.taxId || supRes.taxid,
                    gstin: supRes.gstin,
                    gstRegistered: gstRegString
                });

                setBankDetails({
                    bankName: supRes.bankName || supRes.bankname,
                    accountNumber: supRes.accountNumber || supRes.accountnumber,
                    routingNumber: supRes.routingNumber || supRes.routingnumber
                });

                // Fetch and match documents
                // Note: apiClient interceptor returns response.data directly (not an axios response)
                const docsRaw = await apiClient.get<any[]>(`/api/suppliers/${meRes.supplierId}/documents`) as any;
                const apiDocs: any[] = Array.isArray(docsRaw) ? docsRaw : (docsRaw?.data || docsRaw || []);

                if (Array.isArray(apiDocs)) {
                    const store = useSupplierOnboardingStore.getState();
                    apiDocs.forEach(d => {
                        const dType = (d.documentType || d.documenttype || '').toLowerCase();
                        const dName = (d.documentName || d.documentname || d.name || '').toLowerCase();

                        const match = store.documents.find(sd => {
                            const sName = sd.name.toLowerCase();
                            return sName === dType ||
                                sName === dName ||
                                (sName === 'w-9 form' && (dType.includes('w-9') || dName.includes('w-9'))) ||
                                (sName === 'pan card' && (dType.includes('pan') || dName.includes('pan'))) ||
                                (sName === 'gst certificate' && (dType.includes('gst') || dName.includes('gst'))) ||
                                (sName === 'tax registration certificate' && (dType.includes('tax') || dName.includes('tax')));
                        });

                        if (match) {
                            const filePath = d.filePath || d.filepath;
                            let vStatus = (d.verificationStatus || d.verificationstatus || 'UPLOADED').toUpperCase();
                            if (vStatus === 'APPROVED') vStatus = 'VERIFIED';
                            store.updateDocumentStatus(match.id, vStatus, filePath);
                        }
                    });
                }

                // Final Validations for Submit Button
                const companyValid = !!(supRes.legalName || supRes.legalname);
                const addressValid = !!(mainAddr.addressLine1 || mainAddr.addressline1) && !!mainAddr.city && !!(mainAddr.postalCode || mainAddr.postalcode);
                const contactValid = !!(mainContact.firstName || mainContact.firstname) && !!mainContact.designation;
                const countryNorm = (supRes.country || '').toLowerCase();

                let taxValid = false;
                if (countryNorm === 'india' || countryNorm === 'ind') {
                    taxValid = !!(supRes.taxId || supRes.taxid) && (isGstReg !== 'Yes' || !!supRes.gstin);
                } else {
                    taxValid = !!(supRes.taxId || supRes.taxid);
                }

                let bankValid = !!(supRes.bankName || supRes.bankname) && !!(supRes.accountNumber || supRes.accountnumber);
                if (countryNorm === 'india' || countryNorm === 'ind') {
                    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
                    bankValid = bankValid && ifscRegex.test(supRes.routingNumber || supRes.routingnumber || '');
                } else {
                    bankValid = bankValid && !!(supRes.routingNumber || supRes.routingnumber);
                }

                let requiredDocs: string[] = ['Certificate of Incorporation'];
                if (countryNorm === 'india' || countryNorm === 'ind' || countryNorm === 'in') {
                    requiredDocs = ['PAN Card', 'GST Certificate'];
                } else if (countryNorm === 'usa' || countryNorm === 'united states' || countryNorm === 'us') {
                    requiredDocs = ['W-9 Form'];
                }

                const allRequiredUploaded = requiredDocs.every(name => {
                    const doc = useSupplierOnboardingStore.getState().documents.find((d: any) => d.name === name);
                    return doc && (doc.status === 'UPLOADED' || doc.status === 'VERIFIED' || doc.status === 'APPROVED');
                });

                useSupplierOnboardingStore.setState((state) => ({
                    completedSections: {
                        ...state.completedSections,
                        company: companyValid,
                        address: addressValid,
                        contact: contactValid,
                        tax: taxValid,
                        bank: bankValid,
                        documents: allRequiredUploaded
                    }
                }));

            } catch (e) {
                console.error("Init failed", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleFinalSubmit = async () => {
        if (!info?.supplierId) return;
        setIsSubmitting(true);
        try {
            await apiClient.post(`/api/suppliers/${info.supplierId}/reviews/submit`);
            setShowSuccessModal(true);
            setInfo({ ...info, approvalStatus: 'SUBMITTED' });
            setStatus('SUBMITTED');
            if (user?.userId && updateBuyer) {
                updateBuyer(user.userId, { approvalStatus: 'SUBMITTED' });
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to submit profile.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSubmitEnabled = Object.values(completedSections).every(Boolean);

    const renderSection = () => {
        switch (activeSection) {
            case 'dashboard': return <DashboardOverview />;
            case 'company': return <CompanySection />;
            case 'address': return <AddressSection />;
            case 'contact': return <ContactSection />;
            case 'tax': return <TaxSection />;
            case 'bank': return <BankSection />;
            case 'documents': return <DocumentsSection />;
            case 'messages': return <MessagesSection />;
            default: return <CompanySection />;
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    if (info?.approvalStatus === 'APPROVED') {
        return <ApprovedSupplierDashboard supplierData={info} />;
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="flex-1 p-8 bg-muted/10 h-[calc(100vh-64px)] overflow-auto">
                <div className="w-full max-w-none space-y-6">
                    {renderSection()}
                    {isSubmitEnabled && info?.approvalStatus !== 'SUBMITTED' && info?.approvalStatus !== 'APPROVED' && info?.approvalStatus !== 'PRE_APPROVED' && (
                        <div className="flex justify-end pt-4 border-t mt-8">
                            <Button size="lg" onClick={handleFinalSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Submit Profile
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-md text-center">
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50/50">
                            <CheckCircle2 className="h-10 w-10 text-green-500" strokeWidth={1.5} />
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-xl font-semibold">Profile Submitted!</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                                Thank you! Your profile has been submitted successfully and is now pending approval. You will be notified once it has been reviewed.
                            </DialogDescription>
                        </div>
                        <div className="w-full rounded-lg bg-muted/50 border px-4 py-3 text-xs text-muted-foreground text-left space-y-1">
                            <p className="font-medium text-foreground">What happens next?</p>
                            <p>• Our team will review your submitted information</p>
                            <p>• You may be contacted if additional details are needed</p>
                            <p>• You&apos;ll receive a notification when your profile is approved</p>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button className="w-full sm:w-auto" onClick={() => setShowSuccessModal(false)}>
                            Got it, thanks!
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function SupplierDashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SupplierDashboardContent />
        </Suspense>
    );
}
