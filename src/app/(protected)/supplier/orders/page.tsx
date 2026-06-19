"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingBag, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { listOrders, Order } from "@/lib/api/procurement";

const fmt = (n: number | null | undefined, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur || "INR", maximumFractionDigits: 0 }).format(Number(n));

const STATUS: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700 border-blue-200",
    COMPLETED: "bg-green-100 text-green-700 border-green-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

export default function SupplierOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        (async () => {
            try { setOrders(await listOrders()); }
            catch { toast.error("Failed to load purchase orders"); }
            finally { setLoading(false); }
        })();
    }, []);

    const filtered = useMemo(() => orders.filter((o) =>
        !search || o.ordernumber?.toLowerCase().includes(search.toLowerCase())), [orders, search]);

    const open = orders.filter((o) => o.status === "OPEN").length;
    const totalValue = orders.reduce((s, o) => s + Number(o.totalamount || 0), 0);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg"><ShoppingBag className="h-6 w-6 text-indigo-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Purchase Orders</h1>
                    <p className="text-muted-foreground">Purchase orders issued to you by buyers.</p>
                </div>
            </div>

            {!loading && orders.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total POs</div><div className="text-2xl font-bold">{orders.length}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Open</div><div className="text-2xl font-bold text-blue-600">{open}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Value</div><div className="text-2xl font-bold">{fmt(totalValue)}</div></CardContent></Card>
                </div>
            )}

            <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search by PO number…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                        filtered.length === 0 ? <div className="py-24 text-center text-muted-foreground">No purchase orders yet.</div> : (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>PO Number</TableHead><TableHead>Order Date</TableHead><TableHead>Amount</TableHead>
                                    <TableHead>Expected Delivery</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filtered.map((o) => (
                                        <TableRow key={o.orderid}>
                                            <TableCell className="font-medium">{o.ordernumber}</TableCell>
                                            <TableCell>{o.orderdate ? new Date(o.orderdate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell className="font-mono">{fmt(o.totalamount, o.currency)}</TableCell>
                                            <TableCell>{o.expecteddeliverydate ? new Date(o.expecteddeliverydate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell><Badge variant="outline" className={STATUS[o.status] || ""}>{o.status}</Badge></TableCell>
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
