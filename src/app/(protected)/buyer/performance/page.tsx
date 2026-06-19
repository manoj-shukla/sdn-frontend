"use client";

import { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Loader2, Star, Plus, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getSupplierPerformance, addScorecard, PerformanceSummary } from "@/lib/api/supplierCompliance";

const fmt = (n: number | null | undefined) =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));

const emptyScore = { period: "", deliveryScore: "", qualityScore: "", costScore: "", responsivenessScore: "", onTimeDeliveryPct: "", notes: "" };

export default function BuyerPerformancePage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [supplierId, setSupplierId] = useState("");
    const [data, setData] = useState<PerformanceSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<any>(emptyScore);

    useEffect(() => {
        (async () => {
            try {
                const res = (await apiClient.get("/api/suppliers")) as any;
                const raw = res?.content || (Array.isArray(res) ? res : []);
                setSuppliers(raw.map((s: any) => ({ id: Number(s.supplierId || s.supplierid), name: s.legalName || s.legalname })));
            } catch { toast.error("Failed to load suppliers"); }
        })();
    }, []);

    const loadPerf = async (id: string) => {
        if (!id) return;
        setLoading(true);
        try { setData(await getSupplierPerformance(Number(id))); }
        catch { toast.error("Failed to load performance"); }
        finally { setLoading(false); }
    };

    const onSelect = (id: string) => { setSupplierId(id); loadPerf(id); };

    const submit = async () => {
        if (!supplierId) return;
        setSaving(true);
        try {
            await addScorecard(Number(supplierId), {
                period: form.period || undefined,
                deliveryScore: Number(form.deliveryScore) || 0,
                qualityScore: Number(form.qualityScore) || 0,
                costScore: Number(form.costScore) || 0,
                responsivenessScore: Number(form.responsivenessScore) || 0,
                onTimeDeliveryPct: form.onTimeDeliveryPct ? Number(form.onTimeDeliveryPct) : undefined,
                notes: form.notes || undefined,
            });
            toast.success("Scorecard added");
            setOpen(false); setForm(emptyScore);
            await loadPerf(supplierId);
        } catch (e: any) { toast.error(e?.response?.data?.error || "Failed to add scorecard"); }
        finally { setSaving(false); }
    };

    const k = data?.kpis;
    const trend = useMemo(() => (data?.scorecards || []).map((s) => ({
        period: s.period || new Date(s.createdat).toLocaleDateString(),
        Overall: Number(s.overallscore || 0), Delivery: Number(s.deliveryscore || 0), Quality: Number(s.qualityscore || 0),
    })), [data]);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg"><TrendingUp className="h-6 w-6 text-violet-600" /></div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Supplier Performance</h1>
                        <p className="text-muted-foreground">Review and rate supplier delivery, quality, and cost.</p>
                    </div>
                </div>
                {supplierId && <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Scorecard</Button>}
            </div>

            <Card>
                <CardContent className="p-4 flex items-center gap-3">
                    <Label className="text-sm whitespace-nowrap">Supplier</Label>
                    <Select value={supplierId} onValueChange={onSelect}>
                        <SelectTrigger className="w-96"><SelectValue placeholder="Select a supplier…" /></SelectTrigger>
                        <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div> : data && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="h-4 w-4" /> Orders</div><div className="text-2xl font-bold mt-1">{k!.totalOrders}</div></CardContent></Card>
                        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-green-600" /> Completion</div><div className="text-2xl font-bold mt-1 text-green-600">{k!.completionRate}%</div></CardContent></Card>
                        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Invoices Paid</div><div className="text-2xl font-bold mt-1">{k!.invoicesPaid}/{k!.invoicesTotal}</div></CardContent></Card>
                        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Active Certs</div><div className="text-2xl font-bold mt-1 text-teal-600">{k!.certifications.active}</div></CardContent></Card>
                        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Star className="h-4 w-4 text-violet-600" /> Latest Score</div><div className="text-2xl font-bold mt-1 text-violet-600">{k!.latestOverallScore != null ? `${k!.latestOverallScore}/100` : "—"}</div></CardContent></Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Scorecard Trend</CardTitle></CardHeader>
                        <CardContent className="h-64">
                            {trend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trend}>
                                        <XAxis dataKey="period" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip /><Legend />
                                        <Line type="monotone" dataKey="Overall" stroke="#7c3aed" strokeWidth={2} />
                                        <Line type="monotone" dataKey="Delivery" stroke="#2563eb" strokeWidth={1.5} />
                                        <Line type="monotone" dataKey="Quality" stroke="#16a34a" strokeWidth={1.5} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No scorecards yet — add one to start tracking.</div>}
                        </CardContent>
                    </Card>

                    {data.scorecards.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">History</CardTitle></CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Delivery</TableHead><TableHead>Quality</TableHead><TableHead>Cost</TableHead><TableHead>Responsiveness</TableHead><TableHead>Overall</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {[...data.scorecards].reverse().map((s) => (
                                            <TableRow key={s.perfid}>
                                                <TableCell className="font-medium">{s.period || new Date(s.createdat).toLocaleDateString()}</TableCell>
                                                <TableCell>{s.deliveryscore ?? "—"}</TableCell><TableCell>{s.qualityscore ?? "—"}</TableCell>
                                                <TableCell>{s.costscore ?? "—"}</TableCell><TableCell>{s.responsivenessscore ?? "—"}</TableCell>
                                                <TableCell><Badge className="bg-violet-100 text-violet-700 border-violet-200">{s.overallscore ?? "—"}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Scorecard</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><Label>Period</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2026-Q1" /></div>
                        <div><Label>Delivery (0-100)</Label><Input type="number" value={form.deliveryScore} onChange={(e) => setForm({ ...form, deliveryScore: e.target.value })} /></div>
                        <div><Label>Quality (0-100)</Label><Input type="number" value={form.qualityScore} onChange={(e) => setForm({ ...form, qualityScore: e.target.value })} /></div>
                        <div><Label>Cost (0-100)</Label><Input type="number" value={form.costScore} onChange={(e) => setForm({ ...form, costScore: e.target.value })} /></div>
                        <div><Label>Responsiveness (0-100)</Label><Input type="number" value={form.responsivenessScore} onChange={(e) => setForm({ ...form, responsivenessScore: e.target.value })} /></div>
                        <div><Label>On-Time Delivery %</Label><Input type="number" value={form.onTimeDeliveryPct} onChange={(e) => setForm({ ...form, onTimeDeliveryPct: e.target.value })} /></div>
                        <div className="col-span-2 text-xs text-muted-foreground">Overall is auto-computed as the average of the four scores.</div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
