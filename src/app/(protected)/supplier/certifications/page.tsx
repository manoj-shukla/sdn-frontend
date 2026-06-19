"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCheck, Loader2, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { listCerts, createCert, deleteCert, Certification } from "@/lib/api/supplierCompliance";

const STATUS: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 border-green-200",
    EXPIRING: "bg-amber-100 text-amber-700 border-amber-200",
    EXPIRED: "bg-red-100 text-red-700 border-red-200",
    PENDING: "bg-slate-100 text-slate-600 border-slate-200",
};

const emptyForm = { name: "", category: "", issuingBody: "", certNumber: "", issueDate: "", expiryDate: "", notes: "" };

export default function SupplierCertificationsPage() {
    const [certs, setCerts] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<any>(emptyForm);

    const load = async () => {
        try { setCerts(await listCerts()); }
        catch { toast.error("Failed to load certifications"); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const submit = async () => {
        if (!form.name.trim()) return toast.error("Certification name is required");
        setSaving(true);
        try {
            await createCert(form);
            toast.success("Certification added");
            setOpen(false); setForm(emptyForm);
            await load();
        } catch (e: any) { toast.error(e?.response?.data?.error || "Failed to add certification"); }
        finally { setSaving(false); }
    };

    const remove = async (id: number) => {
        try { await deleteCert(id); toast.success("Removed"); await load(); }
        catch { toast.error("Failed to remove"); }
    };

    const count = (s: string) => certs.filter((c) => c.status === s).length;

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg"><FileCheck className="h-6 w-6 text-teal-600" /></div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Certifications</h1>
                        <p className="text-muted-foreground">Manage your compliance certifications and renewals.</p>
                    </div>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Certification</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add Certification</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ISO 9001:2015" /></div>
                            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Quality" /></div>
                            <div><Label>Issuing Body</Label><Input value={form.issuingBody} onChange={(e) => setForm({ ...form, issuingBody: e.target.value })} placeholder="TÜV / BSI" /></div>
                            <div><Label>Certificate No.</Label><Input value={form.certNumber} onChange={(e) => setForm({ ...form, certNumber: e.target.value })} /></div>
                            <div /><div><Label>Issue Date</Label><Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></div>
                            <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
                            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {!loading && certs.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{certs.length}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-bold text-green-600">{count("ACTIVE")}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Expiring Soon</div><div className="text-2xl font-bold text-amber-600">{count("EXPIRING")}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Expired</div><div className="text-2xl font-bold text-red-600">{count("EXPIRED")}</div></CardContent></Card>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                        certs.length === 0 ? <div className="py-24 text-center text-muted-foreground">No certifications yet. Add your first one.</div> : (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Issuing Body</TableHead>
                                    <TableHead>Cert No.</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                                <TableBody>
                                    {certs.map((c) => (
                                        <TableRow key={c.certid}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell>{c.category || "—"}</TableCell>
                                            <TableCell>{c.issuingbody || "—"}</TableCell>
                                            <TableCell>{c.certnumber || "—"}</TableCell>
                                            <TableCell>{c.expirydate ? new Date(c.expirydate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={STATUS[c.status] || ""}>
                                                    {(c.status === "EXPIRING" || c.status === "EXPIRED") && <AlertTriangle className="h-3 w-3 mr-1 inline" />}{c.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => remove(c.certid)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                </CardContent>
            </Card>
        </div>
    );
}
