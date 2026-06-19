"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listPayments, Payment } from "@/lib/api/procurement";

const fmt = (n: number | null | undefined, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur || "INR", maximumFractionDigits: 0 }).format(Number(n));

const STATUS: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700 border-green-200",
    INITIATED: "bg-amber-100 text-amber-700 border-amber-200",
    FAILED: "bg-red-100 text-red-700 border-red-200",
};

export default function SupplierPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try { setPayments(await listPayments()); }
            catch { toast.error("Failed to load payments"); }
            finally { setLoading(false); }
        })();
    }, []);

    const received = payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + Number(p.amount || 0), 0);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg"><CreditCard className="h-6 w-6 text-emerald-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Payments</h1>
                    <p className="text-muted-foreground">Payments received against your invoices.</p>
                </div>
            </div>

            {!loading && payments.length > 0 && (
                <div className="grid grid-cols-2 gap-4 max-w-lg">
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Payments</div><div className="text-2xl font-bold">{payments.length}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Received</div><div className="text-2xl font-bold text-emerald-600">{fmt(received)}</div></CardContent></Card>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                        payments.length === 0 ? <div className="py-24 text-center text-muted-foreground">No payments received yet.</div> : (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Payment #</TableHead><TableHead>Invoice</TableHead><TableHead>Date</TableHead>
                                    <TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {payments.map((p) => (
                                        <TableRow key={p.paymentid}>
                                            <TableCell className="font-medium">{p.paymentnumber}</TableCell>
                                            <TableCell>{p.invoice_number || "—"}</TableCell>
                                            <TableCell>{p.paymentdate ? new Date(p.paymentdate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell>{p.method}</TableCell>
                                            <TableCell className="font-mono">{fmt(p.amount, p.currency)}</TableCell>
                                            <TableCell><Badge variant="outline" className={STATUS[p.status] || ""}>{p.status}</Badge></TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{p.reference || "—"}</TableCell>
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
