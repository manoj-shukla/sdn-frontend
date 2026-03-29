"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Landmark, CheckCircle, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupplierRole } from "@/app/(protected)/supplier/context/SupplierRoleContext";
import { toast } from "sonner";

interface BankAccount {
    bankId: number;
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    swiftCode?: string;
    currency: string;
    status: string;
    isPrimary: boolean;
}

interface SupplierBankManagementProps {
    title?: string;
    description?: string;
}

export function SupplierBankManagement({
    title = "Bank Accounts",
    description = "Manage your payout details."
}: SupplierBankManagementProps) {
    const { user } = useAuthStore();
    const { allPendingRequests, refreshChangeRequests } = useSupplierRole();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const isLocked = ['PENDING', 'SUBMITTED', 'PRE_APPROVED'].includes(user?.approvalStatus || '');

    // Form State
    const [formData, setFormData] = useState({
        bankName: "",
        accountNumber: "",
        routingNumber: "",
        swiftCode: "",
        currency: "USD",
        isPrimary: false
    });

    const fetchAccounts = async () => {
        if (!user?.supplierId) return;
        try {
            setLoading(true);
            const res = await apiClient.get<BankAccount[]>(`/api/suppliers/${user.supplierId}/bank-accounts`);
            const data = Array.isArray(res) ? res : (res as any).data || [];

            const mapped = data.map((a: any) => ({
                ...a,
                bankId: a.bankId || a.bankid,
                bankName: a.bankName || a.bankname,
                accountNumber: a.accountNumber || a.accountnumber,
                routingNumber: a.routingNumber || a.routingnumber,
                swiftCode: a.swiftCode || a.swiftcode,
                currency: a.currency,
                status: a.status,
                isPrimary: a.isPrimary || a.isprimary
            }));

            setAccounts(mapped);
        } catch (error) {
            console.error("Failed to fetch bank accounts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [user?.supplierId]);

    const handleAdd = async () => {
        if (!user?.supplierId) return;
        setSaving(true);
        try {
            await apiClient.post(`/api/suppliers/${user.supplierId}/bank-accounts`, formData);
            setIsAddOpen(false);
            setFormData({
                bankName: "",
                accountNumber: "",
                routingNumber: "",
                swiftCode: "",
                currency: "USD",
                isPrimary: false
            });
            fetchAccounts();
            refreshChangeRequests();
        } catch (error) {
            toast.error("Failed to add bank account");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this bank account?")) {
            try {
                await apiClient.delete(`/api/suppliers/bank-accounts/${id}`);
                fetchAccounts();
                refreshChangeRequests();
            } catch (error) {
                toast.error("Failed to delete bank account");
            }
        }
    };

    const handleSetPrimary = async (account: BankAccount) => {
        if (!confirm("Set this as your primary payout account? This will update your main profile.")) return;
        try {
            await apiClient.put(`/api/suppliers/bank-accounts/${account.bankId}`, {
                ...account,
                isPrimary: true
            });
            fetchAccounts();
            refreshChangeRequests();
        } catch (error) {
            toast.error("Failed to set primary");
        }
    };

    // Pending Requests Logic
    const pendingAdditions = allPendingRequests.flatMap(r =>
        (r.items || []).filter(i => i.fieldName === 'bank_account').map(i => {
            try {
                const data = typeof i.newValue === 'string' ? JSON.parse(i.newValue) : i.newValue;
                if (!data.bankId) {
                    return { ...data, requestId: r.requestId, isPending: true };
                }
            } catch (e) { }
            return null;
        }).filter(Boolean)
    ) as any[];

    const getPendingStatus = (id: number): string | null => {
        for (const req of allPendingRequests) {
            if (req.status !== 'PENDING') continue;
            for (const item of (req.items || [])) {
                if (item.fieldName === 'bank_account') {
                    try {
                        const data = typeof item.newValue === 'string' ? JSON.parse(item.newValue) : item.newValue;
                        if (data.bankId === id) return 'UPDATE';
                    } catch (e) { }
                }
            }
        }
        return null;
    };


    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col space-y-1.5">
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    {!isLocked && (
                        <Button onClick={() => setIsAddOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Bank Account
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Bank Name</TableHead>
                                <TableHead>Account Number</TableHead>
                                <TableHead>Routing / SWIFT</TableHead>
                                <TableHead>Currency</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Pending Additions */}
                            {pendingAdditions.map((acc, idx) => (
                                <TableRow key={`pending-${idx}`} className="bg-yellow-50/50 hover:bg-yellow-50/60">
                                    <TableCell>
                                        <Clock className="h-4 w-4 text-yellow-600" />
                                    </TableCell>
                                    <TableCell className="font-medium opacity-75">{acc.bankName}</TableCell>
                                    <TableCell className="opacity-75">{acc.accountNumber?.replace(/.(?=.{4})/g, '*')}</TableCell>
                                    <TableCell className="opacity-75">{acc.routingNumber || acc.swiftCode || '-'}</TableCell>
                                    <TableCell className="opacity-75">{acc.currency}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                            Pending Approval
                                        </Badge>
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            ))}

                            {/* Existing Accounts */}
                            {accounts.length === 0 && pendingAdditions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No bank accounts added yet.
                                    </TableCell>
                                </TableRow>
                            )}
                            {accounts.map((acc) => {
                                const pendingStatus = getPendingStatus(acc.bankId);
                                return (
                                    <TableRow key={acc.bankId} className={`${acc.isPrimary ? 'bg-primary/5' : ''} ${pendingStatus ? 'bg-yellow-50/20' : ''}`}>
                                        <TableCell>
                                            <Landmark className="h-4 w-4 text-muted-foreground" />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {acc.bankName}
                                            {acc.isPrimary && (
                                                <Badge variant="secondary" className="ml-2 gap-1 text-[10px] bg-primary/10 text-primary hover:bg-primary/20">
                                                    <CheckCircle className="h-3 w-3" /> Primary
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{acc.accountNumber.replace(/.(?=.{4})/g, '*')}</TableCell>
                                        <TableCell>{acc.routingNumber || acc.swiftCode || '-'}</TableCell>
                                        <TableCell>{acc.currency}</TableCell>
                                        <TableCell>
                                            {pendingStatus ? (
                                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
                                                    <Clock className="h-3 w-3" /> {pendingStatus === 'DELETE' ? 'Deletion Pending' : 'Update Pending'}
                                                </Badge>
                                            ) : (
                                                <Badge variant={acc.status === 'APPROVED' ? 'default' : 'secondary'}>
                                                    {acc.status}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {!acc.isPrimary && !isLocked && !pendingStatus && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleSetPrimary(acc)}>
                                                        Set Primary
                                                    </Button>
                                                )}
                                                {!isLocked && !acc.isPrimary && !pendingStatus && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(acc.bankId)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Bank Account</DialogTitle>
                        <DialogDescription>Enter your bank details. New accounts require verification.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} placeholder="Bank Name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Account Number / IBAN</Label>
                            <Input value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} placeholder="Account Number" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Routing Number</Label>
                                <Input value={formData.routingNumber} onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })} placeholder="Sort Code / ABA" />
                            </div>
                            <div className="space-y-2">
                                <Label>SWIFT / BIC (Optional)</Label>
                                <Input value={formData.swiftCode} onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })} placeholder="SWIFT Code" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isPrimaryBank"
                                checked={formData.isPrimary}
                                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="isPrimaryBank">Set as Primary Payout Account</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAdd} disabled={saving || !formData.bankName || !formData.accountNumber}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
