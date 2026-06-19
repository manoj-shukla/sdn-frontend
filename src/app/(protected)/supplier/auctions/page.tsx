"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hammer, Loader2, Radio, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { mySupplierAuctions } from "@/lib/api/auctions";

const STATUS_STYLES: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700", SCHEDULED: "bg-blue-100 text-blue-700",
    LIVE: "bg-green-100 text-green-700", SOFT_CLOSE: "bg-red-100 text-red-700",
    PAUSED: "bg-amber-100 text-amber-700", ENDED: "bg-zinc-100 text-zinc-700",
    AWARDED: "bg-violet-100 text-violet-700",
};

export default function SupplierAuctionsPage() {
    const router = useRouter();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try { setRows(await mySupplierAuctions()); }
            catch { toast.error("Failed to load auctions"); }
            finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg"><Hammer className="h-6 w-6 text-amber-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b]">Live Auctions</h1>
                    <p className="text-muted-foreground">Auctions you have been invited to bid in.</p>
                </div>
            </div>
            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                        rows.length === 0 ? <div className="py-24 text-center text-muted-foreground">No auction invitations yet.</div> : (
                            <Table>
                                <TableHeader><TableRow><TableHead>Auction</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Lots</TableHead><TableHead>EMD</TableHead><TableHead /></TableRow></TableHeader>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow key={r.auction_id} className="cursor-pointer" onClick={() => router.push(`/supplier/auctions/${r.auction_id}`)}>
                                            <TableCell className="font-medium">{r.name}</TableCell>
                                            <TableCell><Badge variant="outline">{r.event_type}</Badge></TableCell>
                                            <TableCell><Badge variant="outline" className={STATUS_STYLES[r.status]}>{["LIVE", "SOFT_CLOSE"].includes(r.status) && <Radio className="h-3 w-3 mr-1 inline animate-pulse" />}{r.status}</Badge></TableCell>
                                            <TableCell>{r.lot_count}</TableCell>
                                            <TableCell><span className={["VERIFIED", "EXEMPT", "NOT_REQUIRED"].includes(r.emd_status) ? "text-green-600" : "text-amber-600"}>{r.emd_status}</span></TableCell>
                                            <TableCell className="text-right"><Button variant="ghost" size="sm"><ArrowRight className="h-4 w-4" /></Button></TableCell>
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
