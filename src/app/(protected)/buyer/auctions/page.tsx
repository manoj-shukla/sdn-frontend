"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, Plus, Loader2, Eye, Radio } from "lucide-react";
import { toast } from "sonner";
import { listAuctions, AuctionEvent, AuctionStatus } from "@/lib/api/auctions";

const STATUS_STYLES: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    SCHEDULED: "bg-blue-100 text-blue-700 border-blue-200",
    LIVE: "bg-green-100 text-green-700 border-green-200",
    SOFT_CLOSE: "bg-red-100 text-red-700 border-red-200",
    PAUSED: "bg-amber-100 text-amber-700 border-amber-200",
    ENDED: "bg-zinc-100 text-zinc-700 border-zinc-200",
    AWARDED: "bg-violet-100 text-violet-700 border-violet-200",
    CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function BuyerAuctionsPage() {
    const router = useRouter();
    const [auctions, setAuctions] = useState<AuctionEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setLoading(true);
            const res = await listAuctions();
            setAuctions(Array.isArray(res) ? res : []);
        } catch {
            toast.error("Failed to load auctions");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Zap className="h-6 w-6 text-amber-600" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Auctions</h1>
                    </div>
                    <p className="text-muted-foreground ml-11">Run real-time reverse and forward auctions.</p>
                </div>
                <Button onClick={() => router.push("/buyer/auctions/create")} className="gap-2">
                    <Plus className="h-4 w-4" /> New Auction
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-24 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
                        </div>
                    ) : auctions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <Zap className="h-10 w-10 text-slate-300 mb-3" />
                            <p className="text-slate-500">No auctions yet. Create your first event.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Lots</TableHead>
                                    <TableHead>Suppliers</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {auctions.map((a) => (
                                    <TableRow key={a.auction_id} className="cursor-pointer" onClick={() => router.push(`/buyer/auctions/${a.auction_id}`)}>
                                        <TableCell className="font-medium">
                                            {a.name}
                                            {a.reference_code && <span className="block text-xs text-muted-foreground">{a.reference_code}</span>}
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{a.event_type}</Badge></TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={STATUS_STYLES[a.status]}>
                                                {(a.status === "LIVE" || a.status === "SOFT_CLOSE") && <Radio className="h-3 w-3 mr-1 inline animate-pulse" />}
                                                {a.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{a.lot_count ?? 0}</TableCell>
                                        <TableCell>{a.supplier_count ?? 0}</TableCell>
                                        <TableCell>{a.base_currency}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/buyer/auctions/${a.auction_id}`); }}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
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
