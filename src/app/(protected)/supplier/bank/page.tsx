"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

export default function SupplierBankPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bankInfo, setBankInfo] = useState({
        bankName: "",
        accountNumber: "",
        routingNumber: ""
    });

    const isLocked = ['PENDING', 'SUBMITTED', 'PRE_APPROVED'].includes(user?.approvalStatus || '');

    const fetchData = async () => {
        if (!user?.supplierId) return;
        try {
            setLoading(true);
            const data = await apiClient.get(`/api/suppliers/${user.supplierId}`) as any;
            setBankInfo({
                bankName: data.bankName || data.bankname || "",
                accountNumber: data.accountNumber || data.accountnumber || "",
                routingNumber: data.routingNumber || data.routingnumber || ""
            });
        } catch (error) {
            console.error("Failed to fetch bank info", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.supplierId]);

    const handleSaveAndNext = async () => {
        if (!user?.supplierId) return;
        try {
            setSaving(true);
            const res = await apiClient.put(`/api/suppliers/${user.supplierId}`, bankInfo);

            // Check for Change Request Response
            if ((res as any).status === 'PENDING_APPROVAL') {
                toast.success("Your bank details change has been submitted as a Change Request and is pending approval.");
            } else if ((res as any).status === 'APPLIED') {
                toast.success("Bank details updated successfully.");
            } else {
                toast.success("Bank information saved successfully.");
            }

            // Only redirect if it's the initial onboarding flow (Draft), otherwise stay or minimal redirect?
            // User likely expects to stay if editing profile.
            if (user.approvalStatus === 'DRAFT' || user.approvalStatus === 'REWORK_REQUIRED') {
                router.push('/supplier/documents');
            }
        } catch (error) {
            console.error("Failed to save bank info", error);
            toast.error("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bank Details</h1>
                    <p className="text-muted-foreground">Manage your banking and payment information.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Banking Information</CardTitle>
                    <CardDescription>Provide details for receiving payments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                            id="bankName"
                            value={bankInfo.bankName}
                            onChange={(e) => setBankInfo(prev => ({ ...prev, bankName: e.target.value }))}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="routingNumber">Routing / IFSC Number</Label>
                            <Input
                                id="routingNumber"
                                value={bankInfo.routingNumber}
                                onChange={(e) => setBankInfo(prev => ({ ...prev, routingNumber: e.target.value }))}
                                disabled={isLocked}
                                className={isLocked ? "bg-muted" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input
                                id="accountNumber"
                                type="password"
                                value={bankInfo.accountNumber}
                                onChange={(e) => setBankInfo(prev => ({ ...prev, accountNumber: e.target.value }))}
                                disabled={isLocked}
                                className={isLocked ? "bg-muted" : ""}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="flex justify-end w-full">
                        {!isLocked ? (
                            <Button onClick={handleSaveAndNext} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {user?.approvalStatus === 'APPROVED' ? 'Save Changes' : 'Next Step'}
                            </Button>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Fields are locked
                                </div>
                                <Button variant="outline" onClick={() => router.push('/supplier/documents')}>
                                    Next: Documents
                                </Button>
                            </div>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
