"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3, Loader2, Package, CheckCircle2, CreditCard, FileCheck, Star, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { getMyPerformance, PerformanceSummary } from "@/lib/api/supplierCompliance";

const fmt = (n: number | null | undefined) =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: string }) {
    return (
        <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
            <div className={`text-2xl font-bold mt-1 ${accent || ""}`}>{value}</div>
        </CardContent></Card>
    );
}

export default function SupplierPerformancePage() {
    const [data, setData] = useState<PerformanceSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try { setData(await getMyPerformance()); }
            catch { toast.error("Failed to load performance"); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    if (!data) return null;
    const k = data.kpis;

    const trend = data.scorecards.map((s) => ({
        period: s.period || new Date(s.createdat).toLocaleDateString(),
        Overall: Number(s.overallscore || 0),
        Delivery: Number(s.deliveryscore || 0),
        Quality: Number(s.qualityscore || 0),
    }));

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg"><BarChart3 className="h-6 w-6 text-violet-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Performance</h1>
                    <p className="text-muted-foreground">Your delivery, quality, and commercial scorecard.</p>
                </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                <Kpi icon={<Package className="h-4 w-4" />} label="Total Orders" value={k.totalOrders} />
                <Kpi icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} label="Completion" value={`${k.completionRate}%`} accent="text-green-600" />
                <Kpi icon={<CreditCard className="h-4 w-4" />} label="Invoices Paid" value={`${k.invoicesPaid}/${k.invoicesTotal}`} />
                <Kpi icon={<CreditCard className="h-4 w-4 text-amber-600" />} label="Outstanding" value={fmt(k.outstandingAmount)} accent="text-amber-600" />
                <Kpi icon={<FileCheck className="h-4 w-4 text-teal-600" />} label="Active Certs" value={k.certifications.active} accent="text-teal-600" />
                <Kpi icon={<Star className="h-4 w-4 text-violet-600" />} label="Latest Score" value={k.latestOverallScore != null ? `${k.latestOverallScore}/100` : "—"} accent="text-violet-600" />
            </div>

            {(k.certifications.expiring > 0 || k.certifications.expired > 0) && (
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-4 text-sm text-amber-800">
                        {k.certifications.expiring > 0 && <span>{k.certifications.expiring} certification(s) expiring soon. </span>}
                        {k.certifications.expired > 0 && <span>{k.certifications.expired} expired — renew to stay compliant.</span>}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Scorecard Trend</CardTitle></CardHeader>
                <CardContent className="h-64">
                    {trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trend}>
                                <XAxis dataKey="period" fontSize={11} />
                                <YAxis domain={[0, 100]} fontSize={11} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="Overall" stroke="#7c3aed" strokeWidth={2} />
                                <Line type="monotone" dataKey="Delivery" stroke="#2563eb" strokeWidth={1.5} />
                                <Line type="monotone" dataKey="Quality" stroke="#16a34a" strokeWidth={1.5} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No scorecards yet — buyers will rate your performance per period.</div>}
                </CardContent>
            </Card>

            {data.scorecards.length > 0 && (
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Scorecard History</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Period</TableHead><TableHead>Delivery</TableHead><TableHead>Quality</TableHead>
                                <TableHead>Cost</TableHead><TableHead>Responsiveness</TableHead><TableHead>On-Time %</TableHead><TableHead>Overall</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {[...data.scorecards].reverse().map((s) => (
                                    <TableRow key={s.perfid}>
                                        <TableCell className="font-medium">{s.period || new Date(s.createdat).toLocaleDateString()}</TableCell>
                                        <TableCell>{s.deliveryscore ?? "—"}</TableCell>
                                        <TableCell>{s.qualityscore ?? "—"}</TableCell>
                                        <TableCell>{s.costscore ?? "—"}</TableCell>
                                        <TableCell>{s.responsivenessscore ?? "—"}</TableCell>
                                        <TableCell>{s.ontimedeliverypct != null ? `${s.ontimedeliverypct}%` : "—"}</TableCell>
                                        <TableCell><Badge className="bg-violet-100 text-violet-700 border-violet-200">{s.overallscore ?? "—"}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
