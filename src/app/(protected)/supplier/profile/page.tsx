"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { SupplierContactManagement } from "@/components/supplier/contact-management";
import { SupplierAddressManagement } from "@/components/supplier/address-management";
import { SupplierDocumentManagement } from "@/components/supplier/document-management";
import { useSupplierRole } from "../context/SupplierRoleContext";
import { useAuthStore } from "@/lib/store/auth-store";
import { SupplierBankManagement } from "@/components/supplier/bank-management";
import { Supplier, SupplierStatus } from "@/types/supplier";
import { toast } from "sonner";

export default function SupplierProfilePage() {
    const { role, status, isReadOnly, canSubmit, setStatus } = useSupplierRole();
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [companyInfo, setCompanyInfo] = useState({
        companyName: "",
        taxId: "",
        website: "",
        description: "",
        bankName: "",
        accountNumber: "",
        routingNumber: "",
        legalName: "",
        businessType: "",
        country: "",
        gstin: "",
        isGstRegistered: false
    });

    const [pendingChanges, setPendingChanges] = useState<any[]>([]);

    const fetchProfile = async () => {
        if (!user) return; // Wait for store initialization

        const sId = user?.supplierId || (user as any)?.activeSupplierId;
        if (!sId || String(sId) === 'undefined') {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = (await apiClient.get(`/api/suppliers/${sId}`)) as unknown as Supplier;
            const data = res as any; // Cast to access any props
            setCompanyInfo({
                companyName: data.legalName || data.legalname || "",
                taxId: data.taxId || data.taxid || "",
                website: data.website || "",
                description: data.description || "",
                bankName: data.bankName || data.bankname || "",
                accountNumber: data.accountNumber || data.accountnumber || "",
                routingNumber: data.routingNumber || data.routingnumber || "",
                legalName: data.legalName || data.legalname || "",
                businessType: data.businessType || data.businesstype || "",
                country: data.country || "",
                gstin: data.gstin || "",
                isGstRegistered: !!(data.isGstRegistered || data.isgstregistered)
            });
            // Map backend approvalStatus to frontend SupplierStatus
            const backendStatus = data.approvalStatus || data.approvalstatus || "DRAFT";
            const statusMap: Record<string, SupplierStatus> = {
                "DRAFT": "DRAFT",
                "SUBMITTED": "SUBMITTED",
                "APPROVED": "APPROVED",
                "REWORK_REQUIRED": "REWORK_REQUIRED",
                "REJECTED": "SUSPENDED"
            };
            setStatus((statusMap[backendStatus] || "DRAFT") as SupplierStatus);

            // Fetch Pending Changes
            if (backendStatus === 'APPROVED') {
                try {
                    const changesRes = await apiClient.get('/api/change-requests/my-requests');
                    setPendingChanges(changesRes as any || []);
                } catch (e) {
                    console.warn("Failed to fetch pending changes", e);
                }
            }

        } catch (error) {
            console.error("Failed to fetch supplier profile", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [user?.supplierId]);

    const handleCompanyChange = (field: string, value: string) => {
        setCompanyInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveCompany = async () => {
        const sId = user?.supplierId || (user as any)?.activeSupplierId;
        if (!sId || sId === 'undefined') return;
        try {
            const res = await apiClient.put(`/api/suppliers/${sId}`, {
                legalName: companyInfo.companyName,
                businessType: companyInfo.businessType,
                country: companyInfo.country,
                taxId: companyInfo.taxId,
                website: companyInfo.website,
                description: companyInfo.description,
                gstin: companyInfo.gstin,
                isGstRegistered: companyInfo.isGstRegistered
            });

            // Check for Change Request Response
            if ((res as any).status === 'PENDING_APPROVAL') {
                toast.success("Your changes have been submitted as a Change Request and are pending approval.");
            } else if ((res as any).status === 'APPLIED') {
                toast.success("Minor changes auto-applied successfully.");
            } else {
                toast.success("Company information saved successfully.");
            }
            fetchProfile();
        } catch (error) {
            console.error("Failed to save supplier profile", error);
            toast.error("Failed to save changes.");
        }
    };

    const handleSaveAndNext = async () => {
        await handleSaveCompany();
        // router.push('/supplier/addresses'); // Just save for now to test flow
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const allPendingItems = pendingChanges.flatMap(r => r.items || []);
    const filteredPendingItems = allPendingItems.filter((item: any) => item.fieldName !== 'documents');
    const showPendingAlert = filteredPendingItems.length > 0;

    return (
        <div className="space-y-6">

            {isReadOnly && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
                    <strong>ReadOnly Mode:</strong> Critical fields are locked because your profile is {status === "APPROVED" ? "APPROVED" : "being viewed as a restrictred user"}.
                </div>
            )}

            {/* {showPendingAlert && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm mb-4">
                    <strong>Pending Changes:</strong> You have submitted changes that are waiting for approval.
                    <ul className="list-disc ml-5 mt-1">
                        {filteredPendingItems.map((item: any, idx: number) => (
                            <li key={idx}>{item.fieldName}: {item.oldValue} &rarr; {item.newValue}</li>
                        ))}
                    </ul>
                </div>
            )} */}

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="tax">Tax Details</TabsTrigger>
                    <TabsTrigger value="addresses">Addresses</TabsTrigger>
                    <TabsTrigger value="contacts">Contacts</TabsTrigger>
                    <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Information</CardTitle>
                            <CardDescription>
                                Provide your official company details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="legalName">Company Legal Name</Label>
                                    <Input
                                        id="legalName"
                                        value={companyInfo.companyName}
                                        onChange={(e) => handleCompanyChange("companyName", e.target.value)}
                                        placeholder="Acme Inc."
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="businessType">Business Type</Label>
                                    <Input
                                        id="businessType"
                                        value={companyInfo.businessType}
                                        onChange={(e) => handleCompanyChange("businessType", e.target.value)}
                                        placeholder="Corporation"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        value={companyInfo.country}
                                        onChange={(e) => handleCompanyChange("country", e.target.value)}
                                        placeholder="United States"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input
                                        id="website"
                                        value={companyInfo.website}
                                        onChange={(e) => handleCompanyChange("website", e.target.value)}
                                        placeholder="https://example.com"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Business Description</Label>
                                <Input
                                    id="description"
                                    value={companyInfo.description}
                                    onChange={(e) => handleCompanyChange("description", e.target.value)}
                                    placeholder="Briefly describe your business activities..."
                                    disabled={isReadOnly}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            {!isReadOnly && <Button onClick={handleSaveAndNext}>Save Changes</Button>}
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="tax">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tax & Regulatory Information</CardTitle>
                            <CardDescription>
                                Provide your tax identification and GST details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="taxId">Tax ID / PAN</Label>
                                    <Input
                                        id="taxId"
                                        value={companyInfo.taxId}
                                        onChange={(e) => handleCompanyChange("taxId", e.target.value)}
                                        placeholder="Tax Identification Number"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gstin">GSTIN (if applicable)</Label>
                                    <Input
                                        id="gstin"
                                        value={companyInfo.gstin}
                                        onChange={(e) => handleCompanyChange("gstin", e.target.value)}
                                        placeholder="GST Registration Number"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isGstRegistered"
                                    checked={companyInfo.isGstRegistered}
                                    onChange={(e) => handleCompanyChange("isGstRegistered", e.target.checked ? "true" : "false")}
                                    className="h-4 w-4 rounded border-gray-300"
                                    disabled={isReadOnly}
                                />
                                <Label htmlFor="isGstRegistered">I am registered for GST / VAT</Label>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            {!isReadOnly && <Button onClick={handleSaveCompany}>Save Tax Details</Button>}
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="addresses">
                    <SupplierAddressManagement
                        title="Company Addresses"
                        description="Physical locations, headquarters, and facilities."
                    />
                </TabsContent>

                <TabsContent value="contacts">
                    <SupplierContactManagement
                        title="Authorized Personnel"
                        description="Primary and secondary contacts for business operations."
                    />
                </TabsContent>

                <TabsContent value="bank">
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm mb-4">
                        <strong>Security Note:</strong> Bank updates trigger enhanced identity verification.
                    </div>
                    <SupplierBankManagement />
                </TabsContent>
            </Tabs>

        </div>
    );
}


