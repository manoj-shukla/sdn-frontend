"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, Radio, Rocket, Pause, Square, Trophy, Loader2, TrendingDown, Activity, Gauge, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import {
    getAuction, getKpis, getLeaderboard, launchAuction, pauseAuction, endAuction,
    endLot, awardLot, surrogateBid, approveEmd, exemptEmd, listAuctionSuppliers,
    AuctionEvent, AuctionLot, Kpis, LeaderRow,
} from "@/lib/api/auctions";
import { useAuctionSocket } from "@/lib/hooks/useAuctionSocket";

const fmt = (n?: number | null, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

function Countdown({ end, status }: { end?: string; status: string }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    if (!end || !["LIVE", "SOFT_CLOSE"].includes(status)) return <span className="font-mono text-2xl">{status}</span>;
    const s = Math.max(0, Math.round((new Date(end).getTime() - now) / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    const soft = status === "SOFT_CLOSE";
    return <span className={`font-mono text-3xl font-bold ${soft ? "text-red-600 animate-pulse" : s < 60 ? "text-amber-600" : "text-slate-800"}`}>{mm}:{ss}</span>;
}

export default function CommandCenter() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [auction, setAuction] = useState<AuctionEvent | null>(null);
    const [kpis, setKpis] = useState<Kpis | null>(null);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedLot, setSelectedLot] = useState<string>("");
    const [board, setBoard] = useState<LeaderRow[]>([]);
    const [trend, setTrend] = useState<{ t: number; price: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [surrogate, setSurrogate] = useState<{ supplierId: string; amount: string }>({ supplierId: "", amount: "" });

    const lots: AuctionLot[] = auction?.lots || [];
    const lot = lots.find((l) => l.lot_id === selectedLot);
    const cur = auction?.base_currency || "INR";

    const loadAuction = useCallback(async () => {
        const a = await getAuction(id);
        setAuction(a);
        if (!selectedLot && a.lots?.length) setSelectedLot(a.lots[0].lot_id);
        return a;
    }, [id, selectedLot]);

    const loadBoard = useCallback(async (lotId: string) => {
        if (!lotId) return;
        const [b, k] = await Promise.all([getLeaderboard(id, lotId), getKpis(id)]);
        setBoard(b); setKpis(k);
        const lead = b.find((r) => r.rank === 1)?.bidAmount;
        if (lead != null) setTrend((prev) => [...prev.slice(-40), { t: Date.now(), price: lead }]);
    }, [id]);

    useEffect(() => {
        (async () => {
            try {
                await loadAuction();
                setSuppliers(await listAuctionSuppliers(id));
            } catch { toast.error("Failed to load auction"); }
            finally { setLoading(false); }
        })();
    }, [id]); // eslint-disable-line

    useEffect(() => { if (selectedLot) loadBoard(selectedLot); }, [selectedLot, loadBoard]);

    const { connected, latencyMs } = useAuctionSocket(id, {
        onBid: () => { loadBoard(selectedLot); loadAuction(); },
        onTimer: () => loadAuction(),
        onLotClosed: () => loadAuction(),
        onAuctionClosed: () => loadAuction(),
        poll: () => { if (auction && ["LIVE", "SOFT_CLOSE"].includes(auction.status)) { loadBoard(selectedLot); loadAuction(); } },
        pollIntervalMs: 2000,
    });

    const act = async (fn: () => Promise<any>, ok: string) => {
        try { await fn(); toast.success(ok); await loadAuction(); await loadBoard(selectedLot); }
        catch (e: any) { toast.error(e?.response?.data?.error || "Action failed"); }
    };

    const doSurrogate = async () => {
        if (!lot || !surrogate.supplierId || !surrogate.amount) return;
        await act(() => surrogateBid(id, lot.lot_id, Number(surrogate.supplierId), Number(surrogate.amount)), "Surrogate bid placed");
        setSurrogate({ supplierId: "", amount: "" });
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    if (!auction) return null;

    const live = ["LIVE", "SOFT_CLOSE"].includes(auction.status);

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/auctions")}><ArrowLeft className="h-4 w-4" /></Button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-[#1e293b]">{auction.name}</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{auction.event_type}</Badge>
                            <Badge variant="outline">{auction.status}</Badge>
                            {auction.reference_code && <span>{auction.reference_code}</span>}
                            <span className="flex items-center gap-1">{connected ? <Wifi className="h-3 w-3 text-green-600" /> : <WifiOff className="h-3 w-3 text-amber-600" />}{connected ? `Live${latencyMs != null ? ` ${latencyMs}ms` : ""}` : "Polling"}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {["DRAFT", "SCHEDULED"].includes(auction.status) && <Button onClick={() => act(() => launchAuction(id), "Auction launched")} className="gap-2"><Rocket className="h-4 w-4" /> Launch</Button>}
                    {live && <Button variant="outline" onClick={() => act(() => pauseAuction(id), "Paused")} className="gap-2"><Pause className="h-4 w-4" /> Pause</Button>}
                    {live && <Button variant="destructive" onClick={() => act(() => endAuction(id), "Auction ended")} className="gap-2"><Square className="h-4 w-4" /> End</Button>}
                </div>
            </div>

            {/* KPI banner */}
            <div className="grid grid-cols-4 gap-4">
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Gauge className="h-4 w-4" /> Baseline</div><div className="text-2xl font-bold mt-1">{fmt(kpis?.baseline, cur)}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-4 w-4 text-green-600" /> Current Savings</div><div className="text-2xl font-bold mt-1 text-green-600">{fmt(kpis?.savings, cur)} <span className="text-sm">({kpis?.savingsPct ?? 0}%)</span></div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-4 w-4 text-red-500" /> Tension (5m)</div><div className="text-2xl font-bold mt-1">{kpis?.tensionIndex ?? 0}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Clock {lot ? `· Lot ${lot.lot_number}` : ""}</div><div className="mt-1"><Countdown end={lot?.scheduled_end} status={lot?.status || auction.status} /></div></CardContent></Card>
            </div>

            <div className="grid grid-cols-3 gap-5">
                {/* Lots + leaderboard */}
                <div className="col-span-2 space-y-5">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Lots</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {lots.map((l) => (
                                <button key={l.lot_id} onClick={() => setSelectedLot(l.lot_id)}
                                    className={`px-3 py-2 rounded-lg border text-sm text-left ${selectedLot === l.lot_id ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}>
                                    <div className="font-medium">Lot {l.lot_number}: {l.title}</div>
                                    <div className="text-xs text-muted-foreground">Lead {fmt(l.current_price, cur)} · {l.status}</div>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">{live && <Radio className="h-4 w-4 text-green-600 animate-pulse" />} Supplier Leaderboard</CardTitle>
                            {lot && live && <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => act(() => endLot(id, lot.lot_id), "Lot closed")}>Close Lot</Button>
                                <Button size="sm" onClick={() => act(() => awardLot(id, lot.lot_id), "Lot awarded")} className="gap-1"><Trophy className="h-4 w-4" /> Award L1</Button>
                            </div>}
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Supplier</TableHead><TableHead>Bid</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {board.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No bids yet</TableCell></TableRow> :
                                        board.map((r) => (
                                            <TableRow key={r.rank} className={r.rank === 1 ? "bg-green-50" : ""}>
                                                <TableCell><Badge variant="outline" className={r.rank === 1 ? "bg-green-100 text-green-700 border-green-300" : r.rank <= 3 ? "bg-amber-50 text-amber-700" : ""}>#{r.rank}</Badge></TableCell>
                                                <TableCell>{r.label || `Supplier ${r.supplierId}`}</TableCell>
                                                <TableCell className="font-mono">{fmt(r.bidAmount, cur)}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "—"}</TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Price Discovery</CardTitle></CardHeader>
                        <CardContent className="h-48">
                            {trend.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trend}>
                                        <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString().slice(0, 5)} fontSize={10} />
                                        <YAxis domain={["auto", "auto"]} fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                        <Tooltip formatter={(v: any) => fmt(v, cur)} labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
                                        <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Trend builds as bids arrive</div>}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: suppliers / EMD / surrogate */}
                <div className="space-y-5">
                    {live && lot && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">Surrogate Bid</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-xs text-muted-foreground">Place a bid on behalf of a supplier (audited).</p>
                                <Input placeholder="Supplier ID" value={surrogate.supplierId} onChange={(e) => setSurrogate((s) => ({ ...s, supplierId: e.target.value }))} />
                                <Input placeholder="Amount" type="number" value={surrogate.amount} onChange={(e) => setSurrogate((s) => ({ ...s, amount: e.target.value }))} />
                                <Button size="sm" className="w-full" onClick={doSurrogate}>Submit on behalf</Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Suppliers & EMD</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {suppliers.length === 0 && <p className="text-xs text-muted-foreground">No suppliers invited.</p>}
                            {suppliers.map((s) => (
                                <div key={s.id} className="flex items-center justify-between border rounded-lg p-2">
                                    <div className="text-sm">
                                        <div className="font-medium">{s.supplier_name || s.masked_label || `Supplier ${s.supplier_id}`}</div>
                                        <div className="text-xs text-muted-foreground">EMD: <span className={s.emd_status === "VERIFIED" || s.emd_status === "EXEMPT" ? "text-green-600" : "text-amber-600"}>{s.emd_status}</span></div>
                                    </div>
                                    {auction.emd_required && !["VERIFIED", "EXEMPT"].includes(s.emd_status) && (
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="outline" onClick={() => act(() => approveEmd(id, s.supplier_id), "EMD approved")}>Approve</Button>
                                            <Button size="sm" variant="ghost" onClick={() => act(() => exemptEmd(id, s.supplier_id), "Exempted")}>Exempt</Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
