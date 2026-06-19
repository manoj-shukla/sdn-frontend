"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart2, Loader2, TrendingDown, Layers, Activity, Gavel } from "lucide-react";
import { toast } from "sonner";
import { getBidAnalysis, BidAnalysis } from "@/lib/api/sourcing";

const fmt = (n: number | null | undefined, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur || "INR", maximumFractionDigits: 0 }).format(Number(n));

export default function BuyerBidAnalysisPage() {
    const router = useRouter();
    const [data, setData] = useState<BidAnalysis | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try { setData(await getBidAnalysis()); }
            catch { toast.error("Failed to load bid analysis"); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    if (!data) return null;
    const k = data.kpis;

    const chart = data.events.filter((e) => e.savings && e.savings > 0).map((e) => ({ name: e.name.slice(0, 14), Savings: e.savings as number }));

    const open = (e: { kind: string; id: string }) => router.push(e.kind === "AUCTION" ? `/buyer/auctions/${e.id}` : `/buyer/rfp/${e.id}`);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg"><BarChart2 className="h-6 w-6 text-indigo-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Bid Analysis</h1>
                    <p className="text-muted-foreground">Bids and savings across your RFPs and auctions.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Layers className="h-4 w-4" /> Events</div><div className="text-2xl font-bold mt-1">{k.totalEvents}</div><div className="text-xs text-muted-foreground">{k.auctions} auctions · {k.rfps} RFPs</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-4 w-4" /> Total Bids</div><div className="text-2xl font-bold mt-1">{k.totalBids}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-4 w-4 text-green-600" /> Identified Savings</div><div className="text-2xl font-bold mt-1 text-green-600">{fmt(k.totalSavings)}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Gavel className="h-4 w-4" /> Live</div><div className="text-2xl font-bold mt-1">{k.liveEvents}</div></CardContent></Card>
            </div>

            {chart.length > 0 && (
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Savings by Event</CardTitle></CardHeader>
                    <CardContent className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chart}>
                                <XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                <Tooltip formatter={(v: any) => fmt(v)} />
                                <Bar dataKey="Savings" fill="#16a34a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-0">
                    {data.events.length === 0 ? <div className="py-24 text-center text-muted-foreground">No sourcing events yet.</div> : (
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Type</TableHead><TableHead>Event</TableHead><TableHead>Status</TableHead>
                                <TableHead>Participants</TableHead><TableHead>Bids</TableHead><TableHead>Best / Lowest</TableHead>
                                <TableHead>Baseline</TableHead><TableHead>Savings</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data.events.map((e) => (
                                    <TableRow key={`${e.kind}-${e.id}`} className="cursor-pointer" onClick={() => open(e)}>
                                        <TableCell><Badge variant="outline">{e.kind}</Badge></TableCell>
                                        <TableCell className="font-medium">{e.name}</TableCell>
                                        <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                                        <TableCell>{e.participants}</TableCell>
                                        <TableCell>{e.bids}</TableCell>
                                        <TableCell className="font-mono">{fmt(e.best, e.currency)}</TableCell>
                                        <TableCell className="font-mono">{fmt(e.baseline, e.currency)}</TableCell>
                                        <TableCell className="font-mono">{e.savings != null ? <span className="text-green-600">{fmt(e.savings, e.currency)}{e.savingsPct != null ? ` (${e.savingsPct}%)` : ""}</span> : "—"}</TableCell>
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
