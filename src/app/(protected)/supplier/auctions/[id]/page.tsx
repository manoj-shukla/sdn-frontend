"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Wifi, WifiOff, ShieldCheck, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { getAuction, getBidConsole, placeBid, joinAuction, verifyEmd, AuctionLot } from "@/lib/api/auctions";
import { useAuctionSocket } from "@/lib/hooks/useAuctionSocket";

const fmt = (n?: number | null, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

function Timer({ end, status }: { end?: string; status?: string }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    if (!end || !["LIVE", "SOFT_CLOSE"].includes(status || "")) return <div className="font-mono text-3xl font-bold text-slate-500">{status}</div>;
    const s = Math.max(0, Math.round((new Date(end).getTime() - now) / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, "0"), ss = String(s % 60).padStart(2, "0");
    const soft = status === "SOFT_CLOSE";
    return <div className={`font-mono text-4xl font-bold ${soft ? "text-red-600 animate-pulse" : s < 60 ? "text-amber-600" : "text-blue-600"}`}>{mm}:{ss}</div>;
}

export default function BiddingCockpit() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [lots, setLots] = useState<AuctionLot[]>([]);
    const [lotId, setLotId] = useState("");
    const [console_, setConsole] = useState<any>(null);
    const [bidVal, setBidVal] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [lastAlert, setLastAlert] = useState<string>("");
    const lastBidAt = useRef<number>(0);

    const cur = console_?.auction?.base_currency || "INR";
    const lot = console_?.lot;
    const emd = console_?.auction?.emd_required && !console_?.canBid;

    const loadConsole = useCallback(async (lid: string) => {
        if (!lid) return;
        const c = await getBidConsole(id, lid);
        setConsole(c);
        if (c.nextAllowedBid != null && !bidVal) setBidVal(String(Math.floor(c.nextAllowedBid)));
    }, [id, bidVal]);

    useEffect(() => {
        (async () => {
            try {
                await joinAuction(id).catch(() => {});
                const a = await getAuction(id);
                setLots(a.lots || []);
                if (a.lots?.length) setLotId(a.lots[0].lot_id);
            } catch { toast.error("Failed to open auction"); }
            finally { setLoading(false); }
        })();
    }, [id]);

    useEffect(() => { if (lotId) loadConsole(lotId); }, [lotId]); // eslint-disable-line

    const { connected, latencyMs } = useAuctionSocket(id, {
        onBid: (p) => { if (!lotId || p.lotId === lotId) loadConsole(lotId); },
        onTimer: (p) => { setLastAlert(`Soft close: +${p.extensionSec}s added`); loadConsole(lotId); },
        onPriceDrop: (p) => { if (p.lotId === lotId) loadConsole(lotId); },
        onAuctionClosed: () => loadConsole(lotId),
        onLotClosed: () => loadConsole(lotId),
        poll: () => loadConsole(lotId),
        pollIntervalMs: 1500,
    });

    const isDutch = console_?.auction?.event_type === "DUTCH";

    const acceptDutch = async () => {
        if (!lot || console_?.currentLead == null) return;
        setSubmitting(true);
        try {
            const res = await placeBid(id, lot.lot_id, Number(console_.currentLead));
            if (res.accepted) toast.success("Accepted at current price — you win this lot");
            else toast.error(res.reason || res.status);
            await loadConsole(lot.lot_id);
        } catch (e: any) { toast.error(e?.response?.data?.error || "Accept failed"); }
        finally { setSubmitting(false); }
    };

    const rank = console_?.myRank;
    const rankColor = rank === 1 ? "bg-green-500" : rank && rank <= 3 ? "bg-amber-500" : rank ? "bg-red-500" : "bg-slate-300";
    const rankText = rank === 1 ? "You are LEADING (L1)" : rank ? `Rank ${rank} — Outbid` : "No bid yet";

    const quickDrop = (pct?: number, abs?: number) => {
        const base = console_?.nextAllowedBid ?? (lot?.current_price ?? lot?.start_price ?? 0);
        const lead = lot?.current_price ?? lot?.start_price ?? base;
        let v = base;
        if (pct) v = Math.floor(lead * (1 - pct / 100));
        if (abs) v = Math.floor(lead - abs);
        setBidVal(String(v));
    };

    // Client-side pre-flight validation (mirror of SRE decrement check)
    const preflightError = (() => {
        if (!lot || console_?.nextAllowedBid == null || !bidVal) return null;
        const v = Number(bidVal);
        const dir = ["ENGLISH"].includes(console_?.auction?.event_type) ? "UP" : "DOWN";
        if (dir === "DOWN" && v > console_.nextAllowedBid) return `Bid must be ${fmt(console_.nextAllowedBid, cur)} or lower`;
        if (dir === "UP" && v < console_.nextAllowedBid) return `Bid must be ${fmt(console_.nextAllowedBid, cur)} or higher`;
        return null;
    })();

    const submit = async () => {
        if (!lot || !bidVal || preflightError) { if (preflightError) toast.error(preflightError); return; }
        setSubmitting(true);
        const t0 = Date.now();
        try {
            const latency = lastBidAt.current ? undefined : (latencyMs ?? undefined);
            const res = await placeBid(id, lot.lot_id, Number(bidVal), latency);
            lastBidAt.current = t0;
            if (res.accepted) { toast.success(`Accepted — Rank ${res.myRank}`); if (res.extended) setLastAlert("Soft close triggered (+time)"); }
            else toast.error(res.reason || res.status);
            await loadConsole(lot.lot_id);
        } catch (e: any) { toast.error(e?.response?.data?.error || "Bid failed"); }
        finally { setSubmitting(false); }
    };

    const verify = async () => {
        try { await verifyEmd(id, { mode: "ONLINE", amount: console_?.lot?.reserve_price || undefined, reference: "Manual" }); toast.success("EMD submitted for verification"); await loadConsole(lotId); }
        catch (e: any) { toast.error(e?.response?.data?.error || "EMD failed"); }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin" /></div>;

    return (
        <div className="w-full space-y-4 p-4 bg-[#0f172a] min-h-screen text-slate-100 rounded-lg">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/supplier/auctions")} className="text-slate-300"><ArrowLeft className="h-4 w-4" /></Button>
                    <div>
                        <h1 className="text-xl font-bold">{console_?.auction?.name}</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Badge variant="outline" className="text-slate-200 border-slate-600">{console_?.auction?.event_type}</Badge>
                            <span className="flex items-center gap-1">{connected ? <Wifi className="h-3 w-3 text-green-400" /> : <WifiOff className="h-3 w-3 text-amber-400" />}{connected ? `Connected${latencyMs != null ? ` · ${latencyMs}ms` : ""}` : "Polling mode"}</span>
                            {latencyMs != null && latencyMs > 500 && <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> High latency — bid early</span>}
                        </div>
                    </div>
                </div>
                {lots.length > 1 && (
                    <Select value={lotId} onValueChange={setLotId}>
                        <SelectTrigger className="w-64 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                        <SelectContent>{lots.map((l) => <SelectItem key={l.lot_id} value={l.lot_id}>Lot {l.lot_number}: {l.title}</SelectItem>)}</SelectContent>
                    </Select>
                )}
            </div>

            {emd && (
                <Card className="bg-amber-950/40 border-amber-700">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-200"><ShieldCheck className="h-5 w-5" /> EMD not verified — bidding is disabled until your deposit is confirmed.</div>
                        <Button size="sm" onClick={verify}>Submit EMD</Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-12 gap-4">
                {/* Left: context */}
                <Card className="col-span-3 bg-slate-800/60 border-slate-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Auction Context</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center"><div className="text-xs text-slate-400 mb-1">Time Remaining</div><Timer end={lot?.scheduled_end} status={lot?.status} /></div>
                        <div className="text-sm space-y-1 text-slate-300">
                            <div className="flex justify-between"><span className="text-slate-400">Quantity</span><span>{lot?.quantity} {lot?.uom}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Incoterms</span><span>{lot?.incoterms || "—"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Start Price</span><span>{fmt(lot?.start_price, cur)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Min Decrement</span><span>{lot?.decrement_type === "PERCENTAGE" ? `${lot?.min_decrement}%` : fmt(lot?.min_decrement, cur)}</span></div>
                        </div>
                    </CardContent>
                </Card>

                {/* Center: action zone */}
                <Card className="col-span-5 bg-slate-800/60 border-slate-700">
                    <CardContent className="p-6 space-y-5">
                        {isDutch ? (
                            <>
                                <div className="rounded-xl py-5 text-center bg-blue-600 text-white">
                                    <div className="text-xs uppercase tracking-wide opacity-80">Current Asking Price (falling)</div>
                                    <div className="text-4xl font-bold font-mono mt-1">{fmt(console_?.currentLead, cur)}</div>
                                </div>
                                <p className="text-xs text-slate-400 text-center">The price drops over time. Click accept to win the lot at the current price.</p>
                                <Button className="w-full h-14 text-lg gap-2" onClick={acceptDutch} disabled={submitting || !!emd}>
                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Accept Current Price
                                </Button>
                                {lastAlert && <div className="text-center text-xs text-amber-300">{lastAlert}</div>}
                            </>
                        ) : (
                        <>
                        <div className={`rounded-xl py-5 text-center text-white font-bold text-lg ${rankColor}`}>{rankText}</div>
                        <div>
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Your Bid</span>
                                <span>Next allowed: {fmt(console_?.nextAllowedBid, cur)}</span>
                            </div>
                            <Input type="number" value={bidVal} onChange={(e) => setBidVal(e.target.value)}
                                className="bg-slate-900 border-slate-600 text-2xl h-14 text-center font-mono" disabled={!!emd} />
                            {preflightError && <p className="text-xs text-red-400 mt-1">{preflightError}</p>}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => quickDrop(undefined, Number(lot?.min_decrement) || 0)} disabled={!!emd}>− Decrement</Button>
                            <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => quickDrop(1)} disabled={!!emd}>− 1%</Button>
                            <Button variant="outline" className="border-slate-600 text-slate-200" onClick={() => quickDrop(2)} disabled={!!emd}>− 2%</Button>
                        </div>
                        <Button className="w-full h-12 text-lg gap-2" onClick={submit} disabled={submitting || !!emd || !!preflightError}>
                            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Submit Bid
                        </Button>
                        {lastAlert && <div className="text-center text-xs text-amber-300">{lastAlert}</div>}
                        </>
                        )}
                    </CardContent>
                </Card>

                {/* Right: market intelligence + history */}
                <Card className="col-span-4 bg-slate-800/60 border-slate-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Market Intelligence</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-slate-900/60 rounded-lg p-3"><div className="text-xs text-slate-400">Current Lead</div><div className="font-mono text-lg">{console_?.currentLead != null ? fmt(console_.currentLead, cur) : "Hidden"}</div></div>
                            <div className="bg-slate-900/60 rounded-lg p-3"><div className="text-xs text-slate-400">Gap to Lead</div><div className="font-mono text-lg">{console_?.gapToLead != null ? fmt(console_.gapToLead, cur) : "—"}</div></div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 mb-1">Your Bid History</div>
                            <div className="space-y-1 max-h-64 overflow-auto">
                                {(console_?.history || []).length === 0 && <div className="text-xs text-slate-500">No bids yet</div>}
                                {(console_?.history || []).map((h: any) => (
                                    <div key={h.bid_id} className="flex items-center justify-between text-xs bg-slate-900/40 rounded px-2 py-1">
                                        <span className="font-mono">{fmt(h.bid_amount, cur)}</span>
                                        <span className={h.bid_status === "ACCEPTED" ? "text-green-400" : "text-red-400"}>{h.bid_status.replace("REJECTED_", "REJ ")}</span>
                                        <span className="text-slate-500">{new Date(h.server_timestamp).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
