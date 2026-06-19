"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Loader2, Search, CheckCircle2, XCircle, UserCog } from "lucide-react";
import { toast } from "sonner";
import { myBids } from "@/lib/api/auctions";

const fmt = (n: number | null | undefined, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

const statusBadge = (s: string) => {
    if (s === "ACCEPTED") return <Badge className="bg-green-100 text-green-700 border-green-300 gap-1"><CheckCircle2 className="h-3 w-3" /> Accepted</Badge>;
    if (s === "SUPERSEDED") return <Badge variant="outline" className="bg-slate-100 text-slate-600">Superseded</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-700 gap-1"><XCircle className="h-3 w-3" /> {s.replace("REJECTED_", "Rejected: ")}</Badge>;
};

export default function SupplierHistoryPage() {
    const router = useRouter();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");

    useEffect(() => {
        (async () => {
            try { setRows(await myBids()); }
            catch { toast.error("Failed to load bid history"); }
            finally { setLoading(false); }
        })();
    }, []);

    const filtered = useMemo(() => rows.filter((r) => {
        const matchStatus = status === "ALL" || (status === "ACCEPTED" ? r.bid_status === "ACCEPTED" : status === "REJECTED" ? String(r.bid_status).startsWith("REJECTED") : true);
        const q = search.toLowerCase();
        const matchSearch = !q || `${r.auction_name} ${r.lot_title || ""}`.toLowerCase().includes(q);
        return matchStatus && matchSearch;
    }), [rows, status, search]);

    const accepted = rows.filter((r) => r.bid_status === "ACCEPTED").length;

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg"><History className="h-6 w-6 text-slate-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Bid History</h1>
                    <p className="text-muted-foreground">Every bid you have placed across all auctions.</p>
                </div>
            </div>

            {!loading && rows.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Bids</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Accepted</div><div className="text-2xl font-bold text-green-600">{accepted}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Rejected</div><div className="text-2xl font-bold text-red-600">{rows.length - accepted}</div></CardContent></Card>
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Search by auction or lot…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All statuses</SelectItem>
                        <SelectItem value="ACCEPTED">Accepted only</SelectItem>
                        <SelectItem value="REJECTED">Rejected only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                        filtered.length === 0 ? <div className="py-24 text-center text-muted-foreground">No bids found.</div> : (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Time</TableHead><TableHead>Auction</TableHead><TableHead>Lot</TableHead>
                                    <TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filtered.map((r) => (
                                        <TableRow key={r.bid_id} className="cursor-pointer" onClick={() => router.push(`/supplier/auctions/${r.auction_id}`)}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.server_timestamp).toLocaleString()}</TableCell>
                                            <TableCell><div className="font-medium">{r.auction_name}</div><div className="text-xs text-muted-foreground">{r.event_type}</div></TableCell>
                                            <TableCell>{r.lot_title ? `Lot ${r.lot_number}: ${r.lot_title}` : "—"}</TableCell>
                                            <TableCell className="font-mono">{fmt(r.bid_amount, r.currency)}</TableCell>
                                            <TableCell>{statusBadge(r.bid_status)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {r.reject_reason || (r.triggered_extension ? "Triggered soft-close" : "")}
                                                {r.is_surrogate ? <span className="inline-flex items-center gap-1 ml-1 text-violet-600"><UserCog className="h-3 w-3" /> by admin</span> : null}
                                            </TableCell>
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
