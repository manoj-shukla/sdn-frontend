"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { listInvoices, listOrders, createInvoice, Invoice, Order } from "@/lib/api/procurement";

const fmt = (n: number | null | undefined, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur || "INR", maximumFractionDigits: 0 }).format(Number(n));

const STATUS: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
    PAID: "bg-green-100 text-green-700 border-green-200",
    OVERDUE: "bg-red-100 text-red-700 border-red-200",
    REJECTED: "bg-red-100 text-red-700 border-red-200",
};

export default function SupplierInvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<{ orderId: string; amount: string; dueDate: string }>({ orderId: "", amount: "", dueDate: "" });

    const load = async () => {
        try {
            const [inv, ord] = await Promise.all([listInvoices(), listOrders()]);
            setInvoices(inv); setOrders(ord);
        } catch { toast.error("Failed to load invoices"); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const openOrders = useMemo(() => orders.filter((o) => o.status === "OPEN"), [orders]);

    const submit = async () => {
        if (!form.amount) return toast.error("Enter an amount");
        setSaving(true);
        try {
            await createInvoice({
                orderId: form.orderId ? Number(form.orderId) : undefined,
                amount: Number(form.amount),
                dueDate: form.dueDate || undefined,
            });
            toast.success("Invoice raised");
            setOpen(false); setForm({ orderId: "", amount: "", dueDate: "" });
            await load();
        } catch (e: any) { toast.error(e?.response?.data?.error || "Failed to raise invoice"); }
        finally { setSaving(false); }
    };

    const outstanding = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + Number(i.amount || 0), 0);
    const paid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.amount || 0), 0);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg"><FileText className="h-6 w-6 text-indigo-600" /></div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Invoices</h1>
                        <p className="text-muted-foreground">Raise and track invoices against your purchase orders.</p>
                    </div>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Raise Invoice</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Raise an Invoice</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                            <div>
                                <Label>Against Purchase Order</Label>
                                <Select value={form.orderId} onValueChange={(v) => {
                                    const o = openOrders.find((x) => String(x.orderid) === v);
                                    setForm((f) => ({ ...f, orderId: v, amount: o ? String(o.totalamount) : f.amount }));
                                }}>
                                    <SelectTrigger><SelectValue placeholder="Select an open PO (optional)" /></SelectTrigger>
                                    <SelectContent>
                                        {openOrders.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No open POs</div>}
                                        {openOrders.map((o) => <SelectItem key={o.orderid} value={String(o.orderid)}>{o.ordernumber} · {fmt(o.totalamount, o.currency)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
                            <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {!loading && invoices.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Invoices</div><div className="text-2xl font-bold">{invoices.length}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-2xl font-bold text-amber-600">{fmt(outstanding)}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Paid</div><div className="text-2xl font-bold text-green-600">{fmt(paid)}</div></CardContent></Card>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                        invoices.length === 0 ? <div className="py-24 text-center text-muted-foreground">No invoices yet. Raise one against a purchase order.</div> : (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Invoice #</TableHead><TableHead>PO</TableHead><TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {invoices.map((i) => (
                                        <TableRow key={i.invoiceid}>
                                            <TableCell className="font-medium">{i.invoicenumber}</TableCell>
                                            <TableCell>{i.order_number || "—"}</TableCell>
                                            <TableCell>{i.invoicedate ? new Date(i.invoicedate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell className="font-mono">{fmt(i.amount)}</TableCell>
                                            <TableCell>{i.duedate ? new Date(i.duedate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell><Badge variant="outline" className={STATUS[i.status] || ""}>{i.status}</Badge></TableCell>
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
