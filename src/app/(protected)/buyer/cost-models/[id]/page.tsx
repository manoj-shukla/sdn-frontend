"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Calculator, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { getCostModel, calculateCost, CostModel, CalcResult } from "@/lib/api/costModels";

const SEV: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700 border-red-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW: "bg-green-100 text-green-700 border-green-200",
    INFO: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function CostModelDetail() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
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
            try {
                const m = await getCostModel(id);
                setModel(m);
                const init: Record<string, any> = {};
                (m.variables || []).forEach((v) => { init[v.var_key] = v.default_value ?? 0; });
                setInputs(init);
            } catch { toast.error("Failed to load model"); }
            finally { setLoading(false); }
        })();
    }, [id]);

    const compute = useCallback(async (nextInputs = inputs, nextQuote = quote) => {
        try {
            const res = await calculateCost(id, nextInputs, nextQuote ? { supplierQuote: Number(nextQuote) } : {});
            setResult(res);
        } catch { /* ignore transient */ }
    }, [id, inputs, quote]);

    useEffect(() => { if (model) compute(); }, [model]); // initial

    const groups = useMemo(() => {
        const g: Record<string, any[]> = {};
        (model?.variables || []).forEach((v) => { const k = v.var_group || "Inputs"; (g[k] ||= []).push(v); });
        return g;
    }, [model]);

    const onInput = (k: string, val: string) => {
        const next = { ...inputs, [k]: val };
        setInputs(next);
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    if (!model) return null;

    return (
        <div className="w-full space-y-5">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/cost-models")}><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h1 className="text-2xl font-extrabold text-[#1e293b]">{model.name}</h1>
                    <p className="text-xs text-muted-foreground">{model.category} · {model.use_case}</p>
                </div>
                {model.is_template && <Badge variant="outline" className="ml-2 bg-slate-100">Template (read-only)</Badge>}
            </div>

            <div className="grid grid-cols-3 gap-5">
                {/* Variables (inputs) */}
                <div className="col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Variables</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(groups).map(([grp, vars]) => (
                                <div key={grp}>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{grp}</div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {vars.map((v) => (
                                            <div key={v.var_key}>
                                                <Label className="text-xs">{v.label}{v.unit ? ` (${v.unit})` : ""}</Label>
                                                <Input type="number" value={inputs[v.var_key] ?? ""} onChange={(e) => onInput(v.var_key, e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <Button className="gap-2" onClick={() => compute()}><Calculator className="h-4 w-4" /> Recalculate</Button>
                        </CardContent>
                    </Card>

                    {/* Formulas (transparency) */}
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Formulas</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Output</TableHead><TableHead>Expression</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {(model.formulas || []).map((f) => (
                                        <TableRow key={f.formula_id}>
                                            <TableCell className="font-medium">{f.label || f.output_key}</TableCell>
                                            <TableCell className="font-mono text-xs text-slate-500">{f.expression}</TableCell>
                                            <TableCell className="text-right font-mono">{result ? fmt(result.derived[f.output_key]) : "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Result + gap */}
                <div className="space-y-4">
                    <Card className="border-indigo-200">
                        <CardHeader className="pb-2"><CardTitle className="text-base">Should-Cost</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-center py-3">
                                <div className="text-xs text-muted-foreground">Total Should-Cost</div>
                                <div className="text-3xl font-bold text-indigo-700">{fmt(result?.total)}</div>
                            </div>
                            <div className="space-y-1">
                                {result && Object.entries(result.components).map(([name, val]) => (
                                    <div key={name} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">{name}</span>
                                        <span className="font-mono">{fmt(val)}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Gap Analysis</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label className="text-xs">Supplier Quote</Label>
                                <div className="flex gap-2">
                                    <Input type="number" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Enter quote" />
                                    <Button variant="outline" onClick={() => compute(inputs, quote)}>Compare</Button>
                                </div>
                            </div>
                            {result?.gap != null && (
                                <div className={`rounded-lg p-3 text-center ${result.gap > 0 ? "bg-red-50" : "bg-green-50"}`}>
                                    <div className="text-xs text-muted-foreground">Gap vs Should-Cost</div>
                                    <div className={`text-xl font-bold ${result.gap > 0 ? "text-red-600" : "text-green-600"}`}>
                                        {fmt(result.gap)} ({result.gapPct}%)
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                {(result?.insights || []).map((ins, i) => (
                                    <div key={i} className={`flex items-start gap-2 text-xs border rounded-lg p-2 ${SEV[ins.severity] || SEV.INFO}`}>
                                        {ins.severity === "HIGH" || ins.severity === "MEDIUM" ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> : <Info className="h-4 w-4 mt-0.5 shrink-0" />}
                                        <span>{ins.message}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
