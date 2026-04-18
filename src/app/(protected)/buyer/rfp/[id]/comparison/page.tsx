"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft, Loader2, BarChart2, Trophy, TrendingDown, AlertTriangle,
    Clock, CheckCircle2, RefreshCw, Plus, ShieldCheck, Leaf, Truck,
    FileCheck, DollarSign, XCircle, AlertCircle, Package
} from "lucide-react";
import { toast } from "sonner";
import type { RFP, ComparisonRow, RFPInsight, NegotiationRound, RFPAward } from "@/types/rfp";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EvalScore {
    supplierId: number;
    supplierName: string;
    commercialScore: number;
    technicalScore: number;
    qualityScore: number;
    logisticsScore: number;
    sustainabilityScore: number;
    totalWeightedScore: number;
    rank: number;
}

interface ShouldCostRow {
    itemId: string;
    itemName: string;
    targetPrice: number | null;
    suppliers: {
        supplierId: number;
        supplierName: string;
        price: number | null;
        variancePct: number | null;
        isBelowTarget: boolean;
        isAboveTarget: boolean;
        rawMaterialCost: number | null;
        conversionCost: number | null;
        laborCost: number | null;
        logisticsCost: number | null;
        overheadCost: number | null;
        supplierMargin: number | null;
    }[];
    costFlags?: { supplierId: number; supplierName: string; flags: string[] }[];
}

interface QualRow { supplierId: number; supplierName: string; totalQualScore: number; financialScore: number; capabilityScore: number; experienceScore: number; complianceScore: number; isDisqualified: boolean; disqualificationReason: string | null; }
interface QualityRow { supplierId: number; supplierName: string; complianceScore: number; isCompliant: boolean; disqualificationReason: string | null; }
interface LogisticsRow { supplierId: number; supplierName: string; riskLevel: string; riskReasons: string[]; deliveryTerms: string; }
interface ESGRow { supplierId: number; supplierName: string; esgScore: number; recycledContentPct: number | null; carbonFootprintKg: number | null; renewableEnergyPct: number | null; }
interface TermsRow { supplierId: number; supplierName: string; hasFlags: boolean; flagReasons: string[]; paymentTerms: string; generalTermsAccepted: boolean; }

interface ComparisonData {
    rfp: RFP;
    comparisonMatrix: ComparisonRow[];
    insights: RFPInsight[];
    totalSuppliers: number;
}

const TABS = [
    { id: "specs",     label: "Specifications", icon: Package },
    { id: "pricing",   label: "Pricing",        icon: BarChart2 },
    { id: "shouldcost", label: "Should-Cost",   icon: TrendingDown },
    { id: "scores",    label: "Scorecard",      icon: Trophy },
    { id: "qual",      label: "Qualification",  icon: ShieldCheck },
    { id: "quality",   label: "Quality",        icon: FileCheck },
    { id: "logistics", label: "Logistics",      icon: Truck },
    { id: "esg",       label: "ESG",            icon: Leaf },
    { id: "terms",     label: "Terms",          icon: DollarSign },
    { id: "insights",  label: "Insights",       icon: AlertTriangle },
];

const SEVERITY_STYLES: Record<string, string> = {
    LOW: "bg-blue-50 text-blue-700 border-blue-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
};
const RISK_COLORS: Record<string, string> = {
    LOW: "text-green-600", MEDIUM: "text-amber-600", HIGH: "text-red-600"
};

export default function RFPComparisonPage() {
    const params = useParams();
    const router = useRouter();
    const rfpId = params.id as string;

    const [activeTab, setActiveTab] = useState("pricing");
    const [data, setData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [rounds, setRounds] = useState<NegotiationRound[]>([]);
    const [awards, setAwards] = useState<RFPAward[]>([]);
    const [scores, setScores] = useState<EvalScore[]>([]);
    const [shouldCost, setShouldCost] = useState<ShouldCostRow[]>([]);
    const [qualRows, setQualRows] = useState<QualRow[]>([]);
    const [qualityRows, setQualityRows] = useState<QualityRow[]>([]);
    const [logisticsRows, setLogisticsRows] = useState<LogisticsRow[]>([]);
    const [esgRows, setEsgRows] = useState<ESGRow[]>([]);
    const [termsRows, setTermsRows] = useState<TermsRow[]>([]);

    const [awardLoading, setAwardLoading] = useState(false);
    const [negotiationLoading, setNegotiationLoading] = useState(false);
    const [scoresLoading, setScoresLoading] = useState(false);
    const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());
    const [allocationInputs, setAllocationInputs] = useState<Record<number, string>>({});
    const [valueInputs, setValueInputs] = useState<Record<number, string>>({});
    const [showAwardForm, setShowAwardForm] = useState(false);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [compRes, roundsRes, awardsRes, shouldCostRes, qualRes, qualityRes, logRes, esgRes, termsRes, scoresRes] = await Promise.allSettled([
                apiClient.get(`/api/rfp/${rfpId}/comparison`),
                apiClient.get(`/api/rfp/${rfpId}/negotiation`),
                apiClient.get(`/api/rfp/${rfpId}/award`),
                apiClient.get(`/api/rfp/${rfpId}/should-cost`),
                apiClient.get(`/api/rfp/${rfpId}/sections/qualification`),
                apiClient.get(`/api/rfp/${rfpId}/sections/quality`),
                apiClient.get(`/api/rfp/${rfpId}/sections/logistics`),
                apiClient.get(`/api/rfp/${rfpId}/sections/esg`),
                apiClient.get(`/api/rfp/${rfpId}/sections/terms`),
                apiClient.get(`/api/rfp/${rfpId}/scores`),
            ]);

            if (compRes.status === "fulfilled") setData(compRes.value as unknown as ComparisonData);
            if (roundsRes.status === "fulfilled") setRounds(roundsRes.value as unknown as NegotiationRound[]);
            if (awardsRes.status === "fulfilled") setAwards(awardsRes.value as unknown as RFPAward[]);
            if (shouldCostRes.status === "fulfilled") setShouldCost(shouldCostRes.value as unknown as ShouldCostRow[]);
            if (qualRes.status === "fulfilled") setQualRows(qualRes.value as unknown as QualRow[]);
            if (qualityRes.status === "fulfilled") setQualityRows(qualityRes.value as unknown as QualityRow[]);
            if (logRes.status === "fulfilled") setLogisticsRows(logRes.value as unknown as LogisticsRow[]);
            if (esgRes.status === "fulfilled") setEsgRows(esgRes.value as unknown as ESGRow[]);
            if (termsRes.status === "fulfilled") setTermsRows(termsRes.value as unknown as TermsRow[]);
            if (scoresRes.status === "fulfilled") setScores(scoresRes.value as unknown as EvalScore[]);
        } catch { toast.error("Failed to load comparison data"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [rfpId]);

    const handleRecalculateScores = async () => {
        setScoresLoading(true);
        try {
            const res = await apiClient.post(`/api/rfp/${rfpId}/scores/recalculate`, {}) as any;
            setScores(res);
            toast.success("Scores recalculated");
        } catch { toast.error("Failed to recalculate"); }
        finally { setScoresLoading(false); }
    };

    const handleCreateNegotiationRound = async () => {
        setNegotiationLoading(true);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/negotiation`, {});
            toast.success("Negotiation round created");
            fetchAll();
        } catch (e: any) { toast.error(e?.message || "Failed"); }
        finally { setNegotiationLoading(false); }
    };

    const handleCloseNegotiationRound = async (roundId: string) => {
        try {
            await apiClient.post(`/api/rfp/${rfpId}/negotiation/${roundId}/close`, {});
            toast.success("Round closed");
            fetchAll();
        } catch (e: any) { toast.error(e?.message || "Failed"); }
    };

    const handleAward = async () => {
        if (selectedSuppliers.size === 0) { toast.error("Select at least one supplier to award"); return; }
        setAwardLoading(true);
        try {
            const awardsList = [...selectedSuppliers].map(sid => ({
                supplierId: sid,
                allocationPct: allocationInputs[sid] ? parseFloat(allocationInputs[sid]) : null,
                awardedValue: valueInputs[sid] ? parseFloat(valueInputs[sid]) : null,
            }));
            await apiClient.post(`/api/rfp/${rfpId}/award`, { awards: awardsList });
            toast.success("RFP awarded successfully!");
            fetchAll();
            setShowAwardForm(false);
        } catch (e: any) { toast.error(e?.message || "Award failed"); }
        finally { setAwardLoading(false); }
    };

    const ScoreBar = ({ score, color = "bg-indigo-500" }: { score: number; color?: string }) => (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${Math.min(100, score)}%` }} />
            </div>
            <span className="text-xs font-mono w-8 text-right">{Math.round(score)}</span>
        </div>
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );
    if (!data) return <div className="text-center py-16 text-muted-foreground">No data available.</div>;

    const { rfp, comparisonMatrix, insights } = data;
    const currency = rfp?.currency || "USD";

    // Collect unique suppliers from comparison matrix
    const allSuppliers = comparisonMatrix.length > 0
        ? comparisonMatrix[0].suppliers.map((s: any) => ({ id: s.supplierId, name: s.supplierName }))
        : [];

    return (
        <div className="w-full py-8 px-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <button onClick={() => router.push(`/buyer/rfp/${rfpId}`)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
                        <ArrowLeft className="h-4 w-4" /> Back to RFP
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900">{rfp?.name}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {data.totalSuppliers} supplier{data.totalSuppliers !== 1 ? "s" : ""} responded
                        {rfp?.category && ` · ${rfp.category}`}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCreateNegotiationRound}
                        disabled={negotiationLoading} className="gap-1.5">
                        {negotiationLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        New Negotiation Round
                    </Button>
                    <Button size="sm" onClick={() => setShowAwardForm(v => !v)}
                        className="bg-violet-600 hover:bg-violet-700 gap-1.5">
                        <Trophy className="h-3.5 w-3.5" />
                        Award RFP
                    </Button>
                </div>
            </div>

            {/* Award form */}
            {showAwardForm && (
                <Card className="border-violet-200 bg-violet-50/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-violet-600" />
                            Award RFP to Supplier(s)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            {allSuppliers.map(s => (
                                <div key={s.id} className="flex items-center gap-3">
                                    <input type="checkbox" checked={selectedSuppliers.has(s.id)}
                                        onChange={e => setSelectedSuppliers(prev => {
                                            const next = new Set(prev);
                                            e.target.checked ? next.add(s.id) : next.delete(s.id);
                                            return next;
                                        })} className="h-4 w-4 rounded border-gray-300 text-violet-600" />
                                    <span className="text-sm font-medium w-40">{s.name}</span>
                                    <Input type="number" placeholder="Allocation %" className="w-28 h-8 text-xs"
                                        value={allocationInputs[s.id] || ""}
                                        onChange={e => setAllocationInputs(p => ({ ...p, [s.id]: e.target.value }))} />
                                    <Input type="number" placeholder={`Value (${currency})`} className="w-32 h-8 text-xs"
                                        value={valueInputs[s.id] || ""}
                                        onChange={e => setValueInputs(p => ({ ...p, [s.id]: e.target.value }))} />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleAward} disabled={awardLoading} size="sm"
                                className="bg-violet-600 hover:bg-violet-700 gap-1.5">
                                {awardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                                Confirm Award
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowAwardForm(false)}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Existing awards */}
            {awards.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {awards.map((a: any) => (
                        <Badge key={a.awardId} className="bg-violet-100 text-violet-700 gap-1 text-xs">
                            <Trophy className="h-3 w-3" />
                            {a.supplierName || `Supplier ${a.supplierId}`}
                            {a.allocationPct != null && ` · ${a.allocationPct}%`}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Negotiation rounds */}
            {rounds.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-amber-600" />
                            Negotiation Rounds
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {rounds.map((r: any) => (
                                <div key={r.roundId} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                                    <span className="font-medium">Round {r.roundNumber}</span>
                                    <Badge className={cn("text-xs", r.status === "OPEN" ? "bg-amber-100 text-amber-700" : "bg-slate-100")}>
                                        {r.status}
                                    </Badge>
                                    {r.status === "OPEN" && (
                                        <Button size="sm" variant="outline" className="h-6 text-xs"
                                            onClick={() => handleCloseNegotiationRound(r.roundId)}>
                                            Close Round
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Analysis tabs */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                                        activeTab === tab.id
                                            ? "bg-indigo-600 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    )}>
                                    <Icon className="h-3 w-3" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </CardHeader>
                <CardContent>

                    {/* ── Technical Specifications ── */}
                    {activeTab === "specs" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Technical specifications defined by the buyer for each line item (Section 3 — Structured Spec Engine).
                            </p>
                            {(rfp?.items || []).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">No line items found.</p>
                            )}
                            {(rfp?.items || []).map((item: any) => {
                                const specAttrs = item.specAttributes;
                                const hasStructuredSpecs = specAttrs && Object.keys(specAttrs).length > 0;
                                return (
                                    <div key={item.itemId} className="border rounded-lg overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                                            <span className="font-medium text-sm">{item.name}</span>
                                            <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                                        </div>
                                        <div className="px-4 py-3 space-y-3">
                                            {hasStructuredSpecs ? (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                                                        <Package className="h-3.5 w-3.5" /> Structured Technical Attributes
                                                    </p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                                        {Object.entries(specAttrs).filter(([, v]) => v !== "" && v !== null && v !== undefined).map(([key, value]) => (
                                                            <div key={key} className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs">
                                                                <div className="text-indigo-500 capitalize mb-0.5">{key.replace(/_/g, " ")}</div>
                                                                <div className="font-semibold text-slate-800">{String(value)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic">No structured spec attributes defined for this item.</p>
                                            )}
                                            {item.specifications && (
                                                <div className="text-xs text-muted-foreground">
                                                    <span className="font-medium text-slate-600">Notes: </span>{item.specifications}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Pricing Comparison ── */}
                    {activeTab === "pricing" && (
                        <div className="space-y-4">
                            {comparisonMatrix.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No supplier responses yet.</p>
                            ) : comparisonMatrix.map((row: any) => (
                                <div key={row.itemId} className="border rounded-lg overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                                        <span className="font-medium text-sm">{row.itemName}</span>
                                        <span className="text-xs text-muted-foreground">Qty: {row.quantity} {row.unit}</span>
                                    </div>
                                    <div className="divide-y">
                                        {row.suppliers.map((s: any) => (
                                            <div key={s.supplierId} className={cn(
                                                "flex items-center justify-between px-4 py-3",
                                                s.isLowest && "bg-green-50"
                                            )}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">{s.supplierName}</span>
                                                    {s.isLowest && <Badge className="bg-green-100 text-green-700 text-xs gap-1"><TrendingDown className="h-2.5 w-2.5" />Lowest</Badge>}
                                                </div>
                                                <div className="text-right text-sm">
                                                    {s.price != null ? (
                                                        <>
                                                            <span className="font-semibold">{currency} {Number(s.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                            {s.totalCost && <span className="text-xs text-muted-foreground ml-2">Total: {currency} {Number(s.totalCost).toLocaleString()}</span>}
                                                        </>
                                                    ) : <span className="text-muted-foreground">—</span>}
                                                    {s.leadTime && <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5"><Clock className="h-3 w-3" />{s.leadTime}d</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Should-Cost Analysis ── */}
                    {activeTab === "shouldcost" && (
                        <div className="space-y-4">
                            {shouldCost.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No should-cost data. Set target prices on items and collect cost breakdown from suppliers.</p>
                            ) : shouldCost.map(row => (
                                <div key={row.itemId} className="border rounded-lg overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                                        <span className="font-medium text-sm">{row.itemName}</span>
                                        {row.targetPrice != null && (
                                            <span className="text-xs text-indigo-700 font-medium">
                                                Target (Should-Cost): {currency} {row.targetPrice}
                                            </span>
                                        )}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 text-muted-foreground border-b">
                                                <tr>
                                                    <th className="text-left px-3 py-2">Supplier</th>
                                                    <th className="text-right px-3 py-2">Unit Price</th>
                                                    <th className="text-right px-3 py-2">vs Target</th>
                                                    <th className="text-right px-3 py-2">Raw Mat.</th>
                                                    <th className="text-right px-3 py-2">Conversion</th>
                                                    <th className="text-right px-3 py-2">Labor</th>
                                                    <th className="text-right px-3 py-2">Logistics</th>
                                                    <th className="text-right px-3 py-2">Overhead</th>
                                                    <th className="text-right px-3 py-2">Margin</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {row.suppliers.map(s => (
                                                    <tr key={s.supplierId} className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2 font-medium">{s.supplierName}</td>
                                                        <td className="px-3 py-2 text-right">{s.price != null ? `${currency} ${s.price}` : "—"}</td>
                                                        <td className={cn("px-3 py-2 text-right font-medium",
                                                            s.variancePct == null ? "text-muted-foreground" :
                                                            s.isBelowTarget ? "text-green-600" : "text-red-500")}>
                                                            {s.variancePct != null ? `${s.variancePct > 0 ? "+" : ""}${s.variancePct}%` : "—"}
                                                        </td>
                                                        {["rawMaterialCost", "conversionCost", "laborCost", "logisticsCost", "overheadCost", "supplierMargin"].map(k => (
                                                            <td key={k} className="px-3 py-2 text-right text-muted-foreground">
                                                                {(s as any)[k] != null ? (s as any)[k].toFixed(2) : "—"}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Cost component auto-flags */}
                                    {row.costFlags && row.costFlags.length > 0 && (
                                        <div className="px-4 pb-4 space-y-2">
                                            <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                                                <AlertTriangle className="h-3.5 w-3.5" /> Cost Anomalies Detected
                                            </p>
                                            {row.costFlags.map(cf => (
                                                <div key={cf.supplierId} className="bg-rose-50 border border-rose-200 rounded px-3 py-2 text-xs">
                                                    <span className="font-semibold text-rose-700">{cf.supplierName}: </span>
                                                    <span className="text-rose-600">{cf.flags.join(" · ")}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Weighted Scorecard ── */}
                    {activeTab === "scores" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Weights: Commercial {data?.rfp?.weightCommercial ?? 40}% · Technical {data?.rfp?.weightTechnical ?? 25}% · Quality {data?.rfp?.weightQuality ?? 15}% · Logistics {data?.rfp?.weightLogistics ?? 10}% · ESG {data?.rfp?.weightEsg ?? 10}%
                                </p>
                                <Button size="sm" variant="outline" onClick={handleRecalculateScores}
                                    disabled={scoresLoading} className="gap-1.5">
                                    {scoresLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                    Recalculate
                                </Button>
                            </div>
                            {scores.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No scores yet. Click Recalculate after suppliers have submitted responses.</p>
                            ) : (
                                <div className="space-y-3">
                                    {scores.map(s => (
                                        <div key={s.supplierId} className={cn(
                                            "border rounded-lg p-4 space-y-3",
                                            s.rank === 1 ? "border-violet-300 bg-violet-50/30" : ""
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center",
                                                        s.rank === 1 ? "bg-violet-600 text-white" :
                                                        s.rank === 2 ? "bg-slate-600 text-white" :
                                                        "bg-slate-200 text-slate-700"
                                                    )}>#{s.rank}</span>
                                                    <span className="font-semibold text-sm">{s.supplierName}</span>
                                                    {s.rank === 1 && <Badge className="bg-violet-100 text-violet-700 gap-1 text-xs"><Trophy className="h-2.5 w-2.5" />Top Scorer</Badge>}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-bold text-indigo-700">{s.totalWeightedScore}</span>
                                                    <span className="text-xs text-muted-foreground">/100</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                                                {[
                                                    { label: "Commercial (40%)", score: s.commercialScore, color: "bg-indigo-500" },
                                                    { label: "Technical (25%)", score: s.technicalScore, color: "bg-blue-500" },
                                                    { label: "Quality (15%)", score: s.qualityScore, color: "bg-amber-500" },
                                                    { label: "Logistics (10%)", score: s.logisticsScore, color: "bg-orange-500" },
                                                    { label: "ESG (10%)", score: s.sustainabilityScore, color: "bg-green-500" },
                                                ].map(dim => (
                                                    <div key={dim.label} className="space-y-1">
                                                        <div className="text-muted-foreground">{dim.label}</div>
                                                        <ScoreBar score={dim.score} color={dim.color} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Qualification ── */}
                    {activeTab === "qual" && (
                        <div className="space-y-4">
                            <p className="text-xs text-muted-foreground">
                                Qualification Score = Financial (20%) + Capability (40%) + Experience (25%) + Compliance (15%)
                            </p>
                            {qualRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No qualification responses submitted yet.</p>
                            ) : qualRows.map(r => (
                                <div key={r.supplierId} className={cn(
                                    "border rounded-lg px-4 py-4 space-y-3",
                                    r.isDisqualified ? "border-red-200 bg-red-50/40" : ""
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{r.supplierName}</span>
                                                {r.isDisqualified
                                                    ? <Badge className="bg-red-100 text-red-700 gap-1 text-xs"><XCircle className="h-3 w-3" />Disqualified</Badge>
                                                    : <Badge className="bg-green-100 text-green-700 gap-1 text-xs"><CheckCircle2 className="h-3 w-3" />Qualified</Badge>}
                                            </div>
                                            {r.disqualificationReason && <p className="text-xs text-red-600 mt-0.5">{r.disqualificationReason}</p>}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-indigo-700">{Math.round(r.totalQualScore)}</div>
                                            <div className="text-xs text-muted-foreground">/100 total</div>
                                        </div>
                                    </div>
                                    {/* Sub-score breakdown */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        {[
                                            { label: "Financial", weight: "20%", score: r.financialScore, color: "bg-blue-50 text-blue-700" },
                                            { label: "Capability", weight: "40%", score: r.capabilityScore, color: "bg-indigo-50 text-indigo-700" },
                                            { label: "Experience", weight: "25%", score: r.experienceScore, color: "bg-violet-50 text-violet-700" },
                                            { label: "Compliance", weight: "15%", score: r.complianceScore, color: "bg-amber-50 text-amber-700" },
                                        ].map(dim => (
                                            <div key={dim.label} className={cn("rounded-lg p-2 space-y-1", dim.color)}>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{dim.label}</span>
                                                    <span className="opacity-60">{dim.weight}</span>
                                                </div>
                                                <div className="flex-1 bg-white/60 rounded-full h-1.5 overflow-hidden">
                                                    <div className="h-1.5 rounded-full bg-current opacity-70 transition-all"
                                                        style={{ width: `${Math.min(100, dim.score ?? 0)}%` }} />
                                                </div>
                                                <div className="font-bold text-base">{Math.round(dim.score ?? 0)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Quality & Compliance ── */}
                    {activeTab === "quality" && (
                        <div className="space-y-3">
                            {qualityRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No quality responses submitted yet.</p>
                            ) : qualityRows.map(r => (
                                <div key={r.supplierId} className={cn(
                                    "border rounded-lg px-4 py-3",
                                    !r.isCompliant ? "border-red-200 bg-red-50/40" : ""
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{r.supplierName}</span>
                                                {r.isCompliant
                                                    ? <Badge className="bg-green-100 text-green-700 text-xs">Compliant</Badge>
                                                    : <Badge className="bg-red-100 text-red-700 text-xs">Non-Compliant</Badge>}
                                            </div>
                                            {r.disqualificationReason && <p className="text-xs text-red-600 mt-0.5">{r.disqualificationReason}</p>}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-indigo-700">{Math.round(r.complianceScore)}</div>
                                            <div className="text-xs text-muted-foreground">compliance score</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Logistics ── */}
                    {activeTab === "logistics" && (
                        <div className="space-y-3">
                            {logisticsRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No logistics responses yet.</p>
                            ) : logisticsRows.map(r => (
                                <div key={r.supplierId} className="border rounded-lg px-4 py-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-medium text-sm">{r.supplierName}</span>
                                            {r.deliveryTerms && <span className="ml-2 text-xs text-muted-foreground">{r.deliveryTerms}</span>}
                                        </div>
                                        <Badge className={cn("text-xs", r.riskLevel === "LOW" ? "bg-green-100 text-green-700" : r.riskLevel === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                                            {r.riskLevel} Risk
                                        </Badge>
                                    </div>
                                    {r.riskReasons?.length > 0 && (
                                        <ul className="mt-1.5 space-y-0.5">
                                            {r.riskReasons.map((reason: string, i: number) => (
                                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                                                    {reason}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── ESG ── */}
                    {activeTab === "esg" && (
                        <div className="space-y-3">
                            {esgRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No ESG data submitted yet.</p>
                            ) : esgRows.map(r => (
                                <div key={r.supplierId} className="border rounded-lg px-4 py-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">{r.supplierName}</span>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-green-700">{Math.round(r.esgScore)}</span>
                                            <span className="text-xs text-muted-foreground">/100 ESG</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                                        <div>Recycled Content: <strong>{r.recycledContentPct != null ? `${r.recycledContentPct}%` : "—"}</strong></div>
                                        <div>Carbon: <strong>{r.carbonFootprintKg != null ? `${r.carbonFootprintKg} kg CO₂` : "—"}</strong></div>
                                        <div>Renewable Energy: <strong>{r.renewableEnergyPct != null ? `${r.renewableEnergyPct}%` : "—"}</strong></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Commercial Terms ── */}
                    {activeTab === "terms" && (
                        <div className="space-y-3">
                            {termsRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No commercial terms submitted yet.</p>
                            ) : termsRows.map(r => (
                                <div key={r.supplierId} className={cn("border rounded-lg px-4 py-3 space-y-2", r.hasFlags ? "border-amber-200 bg-amber-50/30" : "")}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{r.supplierName}</span>
                                            {r.hasFlags
                                                ? <Badge className="bg-amber-100 text-amber-700 gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Flags</Badge>
                                                : <Badge className="bg-green-100 text-green-700 gap-1 text-xs"><CheckCircle2 className="h-3 w-3" />Clean</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {r.paymentTerms && <span>{r.paymentTerms}</span>}
                                            {!r.generalTermsAccepted && <span className="text-red-500 ml-2">T&Cs not accepted</span>}
                                        </div>
                                    </div>
                                    {r.flagReasons?.length > 0 && (
                                        <ul className="space-y-0.5">
                                            {r.flagReasons.map((reason: string, i: number) => (
                                                <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                                                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {reason}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Insights ── */}
                    {activeTab === "insights" && (
                        <div className="space-y-2">
                            {insights.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No insights generated yet. Insights appear automatically after supplier responses are submitted.</p>
                            ) : insights.map((insight: any) => (
                                <div key={insight.insightId} className={cn("border rounded-lg px-4 py-3 flex items-start gap-3", SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.MEDIUM)}>
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-xs font-medium uppercase tracking-wide mb-0.5">{insight.type?.replace("_", " ")} · {insight.severity}</div>
                                        <div className="text-sm">{insight.message}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
