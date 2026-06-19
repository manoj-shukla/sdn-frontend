"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSignature, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listContracts, createContract, updateContractStatus, deleteContract, Contract } from "@/lib/api/sourcing";
import SupplierSelect from "@/components/SupplierSelect";

const fmt = (n: number | null | undefined, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur || "INR", maximumFractionDigits: 0 }).format(Number(n));

const STATUSES = ["DRAFT", "ACTIVE", "SIGNED", "EXPIRED", "TERMINATED"];
const STATUS_STYLE: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600", ACTIVE: "bg-blue-100 text-blue-700",
    SIGNED: "bg-green-100 text-green-700", EXPIRED: "bg-amber-100 text-amber-700", TERMINATED: "bg-red-100 text-red-700",
};

const empty = { title: "", supplierId: "", value: "", currency: "INR", startDate: "", endDate: "", notes: "" };

// Pin the native calendar icon to the right edge of date inputs.
const dateCls = "relative pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer";

export default function BuyerContractsPage() {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<any>(empty);

    const load = async () => {
        try { setContracts(await listContracts()); }
        catch { toast.error("Failed to load contracts"); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const submit = async () => {
        if (!form.title.trim()) return toast.error("Title is required");
        setSaving(true);
        try {
            await createContract({
                title: form.title, supplierId: form.supplierId ? Number(form.supplierId) : undefined,
                value: form.value ? Number(form.value) : undefined, currency: form.currency,
                startDate: form.startDate || undefined, endDate: form.endDate || undefined, notes: form.notes || undefined,
            });
            toast.success("Contract created"); setOpen(false); setForm(empty); await load();
        } catch (e: any) { toast.error(e?.response?.data?.error || "Failed to create contract"); }
        finally { setSaving(false); }
    };

    const changeStatus = async (c: Contract, status: string) => {
        try { await updateContractStatus(c.contractid, status); toast.success("Status updated"); await load(); }
        catch { toast.error("Failed to update status"); }
    };

    const remove = async (id: number) => {
        try { await deleteContract(id); toast.success("Deleted"); await load(); }
        catch { toast.error("Failed to delete"); }
    };

    const count = (s: string) => contracts.filter((c) => c.status === s).length;

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg"><FileSignature className="h-6 w-6 text-emerald-600" /></div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Contracts</h1>
                        <p className="text-muted-foreground">Manage post-award contracts and their lifecycle.</p>
                    </div>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Contract</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                            <div className="col-span-2"><Label>Supplier</Label><SupplierSelect value={form.supplierId ? Number(form.supplierId) : null} onChange={(id) => setForm({ ...form, supplierId: id ? String(id) : "" })} /></div>
                            <div><Label>Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                            <div><Label>Start Date</Label><Input type="date" className={dateCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                            <div><Label>End Date</Label><Input type="date" className={dateCls} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {!loading && contracts.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {STATUSES.map((s) => <Card key={s}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{s}</div><div className="text-2xl font-bold">{count(s)}</div></CardContent></Card>)}
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                        contracts.length === 0 ? <div className="py-24 text-center text-muted-foreground">No contracts yet. Create one or generate from an award.</div> : (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Title</TableHead><TableHead>Supplier</TableHead><TableHead>Source</TableHead>
                                    <TableHead>Value</TableHead><TableHead>Term</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                                <TableBody>
                                    {contracts.map((c) => (
                                        <TableRow key={c.contractid}>
                                            <TableCell className="font-medium">{c.title}</TableCell>
                                            <TableCell>{c.supplier_name || (c.supplierid ? `Supplier ${c.supplierid}` : "—")}</TableCell>
                                            <TableCell><Badge variant="outline">{c.sourcetype}</Badge></TableCell>
                                            <TableCell className="font-mono">{fmt(c.value, c.currency)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{c.startdate ? new Date(c.startdate).toLocaleDateString() : "—"} – {c.enddate ? new Date(c.enddate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell>
                                                <Select value={c.status} onValueChange={(v) => changeStatus(c, v)}>
                                                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => remove(c.contractid)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
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
