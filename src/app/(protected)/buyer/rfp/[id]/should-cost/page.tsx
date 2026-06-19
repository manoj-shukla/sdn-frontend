"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Calculator, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { listCostModels, getCostModel, calculateCost, CostModel, CalcResult } from "@/lib/api/costModels";

const SEV: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700 border-red-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW: "bg-green-100 text-green-700 border-green-200",
    INFO: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function RFPShouldCostPage() {
    const { id: rfpId } = useParams<{ id: string }>();
    const router = useRouter();
    const [models, setModels] = useState<CostModel[]>([]);
    const [modelId, setModelId] = useState("");
    const [model, setModel] = useState<CostModel | null>(null);
    const [inputs, setInputs] = useState<Record<string, any>>({});
    const [quote, setQuote] = useState("");
    const [result, setResult] = useState<CalcResult | null>(null);
    const [loading, setLoading] = useState(true);

    const fmt = useCallback((n?: number | null) =>
        n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: model?.currency || "INR", maximumFractionDigits: 2 }).format(n),
        [model?.currency]);

    useEffect(() => {
        (async () => {
            try { setModels(await listCostModels()); }
            catch { toast.error("Failed to load cost models"); }
            finally { setLoading(false); }
        })();
    }, []);

    useEffect(() => {
        if (!modelId) return;
        (async () => {
            const m = await getCostModel(modelId);
            setModel(m);
            const init: Record<string, any> = {};
            (m.variables || []).forEach((v) => { init[v.var_key] = v.default_value ?? 0; });
            setInputs(init);
            setResult(null);
        })();
    }, [modelId]);

    const groups = useMemo(() => {
        const g: Record<string, any[]> = {};
        (model?.variables || []).forEach((v) => { const k = v.var_group || "Inputs"; (g[k] ||= []).push(v); });
        return g;
    }, [model]);

    const compute = async () => {
        if (!modelId) return;
        try {
            const res = await calculateCost(modelId, inputs, { rfpId, supplierQuote: quote ? Number(quote) : undefined });
            setResult(res);
        } catch { toast.error("Calculation failed"); }
    };

    return (
        <div className="w-full space-y-5">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push(`/buyer/rfp/${rfpId}`)}><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h1 className="text-2xl font-extrabold text-[#1e293b]">Should-Cost Analysis</h1>
                    <p className="text-xs text-muted-foreground">Benchmark a supplier quote for this RFP against a cost model.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-4 flex items-center gap-3">
                    <Label className="text-sm whitespace-nowrap">Cost Model</Label>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <Select value={modelId} onValueChange={setModelId}>
                            <SelectTrigger className="w-96"><SelectValue placeholder="Select a cost model…" /></SelectTrigger>
                            <SelectContent>
                                {models.map((m) => <SelectItem key={m.model_id} value={m.model_id}>{m.name}{m.is_template ? " (template)" : ""}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {model && (
                <div className="grid grid-cols-3 gap-5">
                    <div className="col-span-2 space-y-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">Inputs</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {Object.entries(groups).map(([grp, vars]) => (
                                    <div key={grp}>
                                        <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{grp}</div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {vars.map((v) => (
                                                <div key={v.var_key}>
                                                    <Label className="text-xs">{v.label}{v.unit ? ` (${v.unit})` : ""}</Label>
                                                    <Input type="number" value={inputs[v.var_key] ?? ""} onChange={(e) => setInputs((s) => ({ ...s, [v.var_key]: e.target.value }))} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <Button className="gap-2" onClick={compute}><Calculator className="h-4 w-4" /> Calculate Should-Cost</Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card className="border-indigo-200">
                            <CardHeader className="pb-2"><CardTitle className="text-base">Result</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-center py-2">
                                    <div className="text-xs text-muted-foreground">Total Should-Cost</div>
                                    <div className="text-3xl font-bold text-indigo-700">{fmt(result?.total)}</div>
                                </div>
                                {result && Object.entries(result.components).map(([name, val]) => (
                                    <div key={name} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">{name}</span><span className="font-mono">{fmt(val)}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Gap vs Supplier Quote</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex gap-2">
                                    <Input type="number" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Supplier quote" />
                                    <Button variant="outline" onClick={compute}>Compare</Button>
                                </div>
                                {result?.gap != null && (
                                    <div className={`rounded-lg p-3 text-center ${result.gap > 0 ? "bg-red-50" : "bg-green-50"}`}>
                                        <div className="text-xs text-muted-foreground">Gap</div>
                                        <div className={`text-xl font-bold ${result.gap > 0 ? "text-red-600" : "text-green-600"}`}>{fmt(result.gap)} ({result.gapPct}%)</div>
                                    </div>
                                )}
                                {(result?.insights || []).map((ins, i) => (
                                    <div key={i} className={`flex items-start gap-2 text-xs border rounded-lg p-2 ${SEV[ins.severity] || SEV.INFO}`}>
                                        {ins.severity === "HIGH" || ins.severity === "MEDIUM" ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> : <Info className="h-4 w-4 mt-0.5 shrink-0" />}
                                        <span>{ins.message}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
