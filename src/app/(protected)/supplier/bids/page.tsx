"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hammer, Loader2, Radio, ArrowRight, Trophy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { myActiveBids } from "@/lib/api/auctions";

const fmt = (n: number | null | undefined, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

export default function SupplierBidsPage() {
    const router = useRouter();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try { setRows(await myActiveBids()); }
            catch { toast.error("Failed to load your bids"); }
            finally { setLoading(false); }
        })();
    }, []);

    const leading = rows.filter((r) => r.isLeading).length;

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Hammer className="h-6 w-6 text-blue-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">My Bids</h1>
                    <p className="text-muted-foreground">Your live standing across active auction lots.</p>
                </div>
            </div>

            {!loading && rows.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Active Lots</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Leading (L1)</div><div className="text-2xl font-bold text-green-600">{leading}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Outbid</div><div className="text-2xl font-bold text-amber-600">{rows.length - leading}</div></CardContent></Card>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                        rows.length === 0 ? <div className="py-24 text-center text-muted-foreground">No active bids. Join a live auction to start bidding.</div> : (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Auction</TableHead><TableHead>Lot</TableHead><TableHead>Your Best</TableHead>
                                    <TableHead>Current Lead</TableHead><TableHead>Standing</TableHead><TableHead /></TableRow></TableHeader>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow key={r.lotId} className="cursor-pointer" onClick={() => router.push(`/supplier/auctions/${r.auctionId}`)}>
                                            <TableCell>
                                                <div className="font-medium">{r.auctionName}</div>
                                                <div className="text-xs text-muted-foreground"><Badge variant="outline" className="mr-1">{r.eventType}</Badge>{["LIVE", "SOFT_CLOSE"].includes(r.auctionStatus) && <span className="text-green-600"><Radio className="h-3 w-3 inline animate-pulse" /> live</span>}</div>
                                            </TableCell>
                                            <TableCell>Lot {r.lotNumber}: {r.lotTitle}</TableCell>
                                            <TableCell className="font-mono">{fmt(r.myBest, r.currency)}</TableCell>
                                            <TableCell className="font-mono">{r.currentLead != null ? fmt(r.currentLead, r.currency) : "Hidden"}</TableCell>
                                            <TableCell>
                                                {r.isLeading
                                                    ? <Badge className="bg-green-100 text-green-700 border-green-300 gap-1"><Trophy className="h-3 w-3" /> Leading</Badge>
                                                    : <Badge variant="outline" className="bg-amber-50 text-amber-700 gap-1"><AlertTriangle className="h-3 w-3" /> Outbid{r.gapToLead != null ? ` · ${fmt(r.gapToLead, r.currency)}` : ""}</Badge>}
                                            </TableCell>
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
