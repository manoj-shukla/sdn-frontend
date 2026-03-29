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

export default function SupplierTaxPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [taxInfo, setTaxInfo] = useState({
        taxId: "",
        gstin: ""
    });

    const isLocked = ['PENDING', 'SUBMITTED', 'PRE_APPROVED'].includes(user?.approvalStatus || '');

    const fetchData = async () => {
        if (!user?.supplierId) return;
        try {
            setLoading(true);
            const data = await apiClient.get(`/api/suppliers/${user.supplierId}`) as any;
            setTaxInfo({
                taxId: data.taxId || data.taxid || "",
                gstin: data.gstin || ""
            });
        } catch (error) {
            console.error("Failed to fetch tax info", error);
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
            const res = await apiClient.put(`/api/suppliers/${user.supplierId}`, taxInfo);

            // Check for Change Request Response
            if ((res as any).status === 'PENDING_APPROVAL') {
                toast.success("Your tax details change has been submitted as a Change Request and is pending approval.");
            } else if ((res as any).status === 'APPLIED') {
                toast.success("Tax details updated successfully.");
            } else {
                toast.success("Tax information saved successfully.");
            }

            if (user.approvalStatus === 'DRAFT' || user.approvalStatus === 'REWORK_REQUIRED') {
                router.push('/supplier/bank');
            }
        } catch (error) {
            console.error("Failed to save tax info", error);
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
                    <h1 className="text-3xl font-bold tracking-tight">Tax Information</h1>
                    <p className="text-muted-foreground">Manage your tax registrations and IDs.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tax Details</CardTitle>
                    <CardDescription>Required for regulatory compliance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="taxId">Tax ID / PAN / EIN</Label>
                        <Input
                            id="taxId"
                            value={taxInfo.taxId}
                            onChange={(e) => setTaxInfo(prev => ({ ...prev, taxId: e.target.value }))}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gstin">GSTIN (Optional)</Label>
                        <Input
                            id="gstin"
                            value={taxInfo.gstin}
                            onChange={(e) => setTaxInfo(prev => ({ ...prev, gstin: e.target.value }))}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
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
                                <Button variant="outline" onClick={() => router.push('/supplier/bank')}>
                                    Next: Bank Details
                                </Button>
                            </div>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
