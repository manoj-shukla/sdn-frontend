"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft, Loader2, BarChart2, Trophy, TrendingDown, AlertTriangle,
    Clock, CheckCircle2, RefreshCw, Plus
} from "lucide-react";
import { toast } from "sonner";
import type { RFP, ComparisonRow, RFPInsight, NegotiationRound, RFPAward } from "@/types/rfp";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<string, string> = {
    LOW: "bg-blue-50 text-blue-700 border-blue-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
};

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
    PRICE_GAP: <TrendingDown className="h-3.5 w-3.5" />,
    LEAD_TIME: <Clock className="h-3.5 w-3.5" />,
    MOQ: <AlertTriangle className="h-3.5 w-3.5" />,
    RISK: <AlertTriangle className="h-3.5 w-3.5" />,
};

interface ComparisonData {
    rfp: RFP;
    comparisonMatrix: ComparisonRow[];
    insights: RFPInsight[];
    totalSuppliers: number;
}

export default function RFPComparisonPage() {
    const params = useParams();
    const router = useRouter();
    const rfpId = params.id as string;

    const [data, setData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [rounds, setRounds] = useState<NegotiationRound[]>([]);
    const [awards, setAwards] = useState<RFPAward[]>([]);
    const [awardLoading, setAwardLoading] = useState(false);
    const [negotiationLoading, setNegotiationLoading] = useState(false);

    // Award selection
    const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());
    const [allocationInputs, setAllocationInputs] = useState<Record<number, string>>({});
    const [valueInputs, setValueInputs] = useState<Record<number, string>>({});
    const [showAwardForm, setShowAwardForm] = useState(false);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [compRes, roundsRes, awardsRes] = await Promise.allSettled([
                apiClient.get(`/api/rfp/${rfpId}/comparison`),
                apiClient.get(`/api/rfp/${rfpId}/negotiation`),
                apiClient.get(`/api/rfp/${rfpId}/award`),
            ]);

            if (compRes.status === "fulfilled") setData(compRes.value as unknown as ComparisonData);
            if (roundsRes.status === "fulfilled") setRounds(roundsRes.value as unknown as NegotiationRound[]);
            if (awardsRes.status === "fulfilled") setAwards(awardsRes.value as unknown as RFPAward[]);
        } catch {
            toast.error("Failed to load comparison data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, [rfpId]);

    const handleCreateNegotiationRound = async () => {
        setNegotiationLoading(true);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/negotiation`);
            toast.success("Negotiation round created. Suppliers can now revise their bids.");
            fetchAll();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to create negotiation round");
        } finally {
            setNegotiationLoading(false);
        }
    };

    const handleCloseRound = async (roundId: string) => {
        try {
            await apiClient.post(`/api/rfp/${rfpId}/negotiation/${roundId}/close`);
            toast.success("Negotiation round closed.");
            fetchAll();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to close round");
        }
    };

    const handleAward = async () => {
        if (selectedSuppliers.size === 0) {
            toast.error("Select at least one supplier to award.");
            return;
        }
        setAwardLoading(true);
        try {
            const awardsList = [...selectedSuppliers].map(supplierId => ({
                supplierId,
                allocationPct: allocationInputs[supplierId] ? parseFloat(allocationInputs[supplierId]) : undefined,
                awardedValue: valueInputs[supplierId] ? parseFloat(valueInputs[supplierId]) : undefined,
            }));
            await apiClient.post(`/api/rfp/${rfpId}/award`, { awards: awardsList });
            toast.success("RFP awarded successfully!");
            fetchAll();
            setShowAwardForm(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to award RFP");
        } finally {
            setAwardLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );

    if (!data) return (
        <div className="text-center py-16 text-muted-foreground">
            <p>Failed to load comparison data.</p>
        </div>
    );

    const { rfp, comparisonMatrix, insights, totalSuppliers } = data;

    // Build supplier list from comparison data
    const supplierSet = new Map<number, string>();
    for (const row of comparisonMatrix) {
        for (const s of row.suppliers) {
            supplierSet.set(s.supplierId, s.supplierName);
        }
    }
    const supplierList = [...supplierSet.entries()].map(([id, name]) => ({ supplierId: id, supplierName: name }));

    // Calculate each supplier's total quote value from the comparison matrix
    const supplierQuoteTotals = new Map<number, number>();
    for (const s of supplierList) {
        const total = comparisonMatrix.reduce((acc, row) => {
            const sd = row.suppliers.find(x => x.supplierId === s.supplierId);
            if (!sd) return acc;
            // Use totalCost if available, else price × quantity
            if (sd.totalCost != null && sd.totalCost > 0) return acc + sd.totalCost;
            if (sd.price != null && sd.price > 0) return acc + sd.price * (row.quantity || 1);
            return acc;
        }, 0);
        if (total > 0) supplierQuoteTotals.set(s.supplierId, total);
    }

    const canAward = ["OPEN", "CLOSED"].includes(rfp.status) && awards.length === 0;
    const hasOpenRound = rounds.some(r => r.status === "OPEN");

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/buyer/rfp/${rfpId}`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Comparison Dashboard</h1>
                            <Badge variant="outline" className="text-xs">{rfp.name}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{totalSuppliers} supplier response(s) received</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canAward && !hasOpenRound && (
                        <Button
                            onClick={() => {
                                // Pre-fill value inputs from quote totals when opening form
                                if (!showAwardForm) {
                                    const prefilled: Record<number, string> = {};
                                    supplierQuoteTotals.forEach((total, supplierId) => {
                                        prefilled[supplierId] = total.toFixed(2);
                                    });
                                    setValueInputs(prefilled);
                                }
                                setShowAwardForm(!showAwardForm);
                            }}
                            className="bg-violet-600 hover:bg-violet-700 gap-1.5"
                        >
                            <Trophy className="h-4 w-4" /> Award RFP
                        </Button>
                    )}
                </div>
            </div>

            {/* Comparison Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-indigo-600" />
                        Price Comparison
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {comparisonMatrix.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No responses yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="border-b bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Item</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Qty</th>
                                    {supplierList.map(s => (
                                        <th key={s.supplierId} className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                            {s.supplierName}
                                        </th>
                                    ))}
                                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Lowest</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonMatrix.map(row => (
                                    <tr key={row.itemId} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">{row.itemName}</td>
                                        <td className="px-4 py-3 text-right text-muted-foreground">{row.quantity} {row.unit || ""}</td>
                                        {supplierList.map(s => {
                                            const sd = row.suppliers.find(x => x.supplierId === s.supplierId);
                                            return (
                                                <td key={s.supplierId} className={cn("px-4 py-3 text-right font-medium", sd?.isLowest ? "text-green-700 bg-green-50" : "")}>
                                                    {sd?.price != null ? (
                                                        <div>
                                                            <div className={cn(sd.isLowest ? "font-bold" : "")}>
                                                                {rfp.currency} {sd.price.toLocaleString()}
                                                            </div>
                                                            {sd.isLowest && <div className="text-xs text-green-600">Lowest</div>}
                                                            {sd.leadTime && <div className="text-xs text-muted-foreground">{sd.leadTime}d lead</div>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-right font-bold text-green-700">
                                            {row.lowestPrice != null ? `${rfp.currency} ${row.lowestPrice.toLocaleString()}` : "—"}
                                        </td>
                                    </tr>
                                ))}

                                {/* Total Row */}
                                {supplierList.length > 0 && (
                                    <tr className="border-t-2 bg-slate-50 font-semibold">
                                        <td className="px-4 py-3 text-sm">Total (all items)</td>
                                        <td className="px-4 py-3 text-right" />
                                        {supplierList.map(s => {
                                            const total = comparisonMatrix.reduce((acc, row) => {
                                                const sd = row.suppliers.find(x => x.supplierId === s.supplierId);
                                                return acc + (sd?.totalCost ?? 0);
                                            }, 0);
                                            const lowestTotal = comparisonMatrix.reduce((acc, row) => {
                                                const prices = row.suppliers.filter(x => x.price != null).map(x => (x.price ?? 0) * row.quantity);
                                                return acc + (prices.length ? Math.min(...prices) : 0);
                                            }, 0);
                                            const isLowest = supplierList.every(other => {
                                                const otherTotal = comparisonMatrix.reduce((acc, row) => {
                                                    const sd = row.suppliers.find(x => x.supplierId === other.supplierId);
                                                    return acc + (sd?.totalCost ?? 0);
                                                }, 0);
                                                return total <= otherTotal || otherTotal === 0;
                                            });
                                            return (
                                                <td key={s.supplierId} className={cn("px-4 py-3 text-right", isLowest ? "text-green-700" : "")}>
                                                    {rfp.currency} {total.toLocaleString()}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-right text-green-700">
                                            {rfp.currency} {comparisonMatrix.reduce((acc, row) => {
                                                const prices = row.suppliers.filter(x => x.price != null).map(x => (x.price ?? 0) * row.quantity);
                                                return acc + (prices.length ? Math.min(...prices) : 0);
                                            }, 0).toLocaleString()}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* Insights */}
            {insights.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Insights ({insights.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {insights.map(insight => (
                                <div key={insight.insightId} className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5", SEVERITY_STYLES[insight.severity])}>
                                    <div className="mt-0.5">{INSIGHT_ICONS[insight.type]}</div>
                                    <p className="text-sm">{insight.message}</p>
                                    <Badge variant="outline" className={cn("ml-auto text-[10px] flex-shrink-0", SEVERITY_STYLES[insight.severity])}>
                                        {insight.severity}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Negotiation */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-indigo-600" />
                        Negotiation Rounds
                    </CardTitle>
                    {!hasOpenRound && ["OPEN", "CLOSED"].includes(rfp.status) && awards.length === 0 && (
                        <Button variant="outline" size="sm" onClick={handleCreateNegotiationRound} disabled={negotiationLoading} className="gap-1.5">
                            {negotiationLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            New Round
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {rounds.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            No negotiation rounds yet. Start a round to ask suppliers to revise their bids.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {rounds.map(round => (
                                <div key={round.roundId} className={cn(
                                    "flex items-center justify-between px-4 py-3 rounded-lg border",
                                    round.status === "OPEN" ? "bg-indigo-50 border-indigo-200" : "bg-slate-50"
                                )}>
                                    <div>
                                        <span className="font-medium text-sm">Round {round.roundNumber}</span>
                                        <span className="text-xs text-muted-foreground ml-2">{round.changeCount} revision(s)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={round.status === "OPEN" ? "default" : "secondary"} className="text-[11px]">
                                            {round.status}
                                        </Badge>
                                        {round.status === "OPEN" && (
                                            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => handleCloseRound(round.roundId)}>
                                                Close Round
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Awards Section */}
            {awards.length > 0 && (
                <Card className="border-violet-200 bg-violet-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-violet-700">
                            <Trophy className="h-4 w-4" />
                            Award Decision
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {awards.map(award => (
                                <div key={award.awardId} className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-violet-200">
                                    <CheckCircle2 className="h-5 w-5 text-violet-600 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm">{award.supplierName}</div>
                                        {award.awardedValue && (
                                            <div className="text-xs text-muted-foreground">Value: {rfp.currency} {award.awardedValue.toLocaleString()}</div>
                                        )}
                                    </div>
                                    {award.allocationPct && (
                                        <Badge variant="secondary" className="bg-violet-100 text-violet-700">{award.allocationPct}%</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Award Form */}
            {showAwardForm && (
                <Card className="border-violet-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-violet-700">
                            <Trophy className="h-4 w-4" />
                            Select Award Winner(s)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Select one or more suppliers to award. You can optionally specify an allocation percentage for split awards.</p>
                        <div className="space-y-2">
                            {supplierList.map(s => (
                                <label key={s.supplierId} className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer hover:bg-slate-50",
                                    selectedSuppliers.has(s.supplierId) ? "border-violet-400 bg-violet-50" : ""
                                )}>
                                    <input
                                        type="checkbox"
                                        checked={selectedSuppliers.has(s.supplierId)}
                                        onChange={() => {
                                            setSelectedSuppliers(prev => {
                                                const next = new Set(prev);
                                                next.has(s.supplierId) ? next.delete(s.supplierId) : next.add(s.supplierId);
                                                return next;
                                            });
                                        }}
                                        className="h-4 w-4"
                                    />
                                    <span className="flex-1 font-medium text-sm">{s.supplierName}</span>
                                    {selectedSuppliers.has(s.supplierId) && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Contract value — pre-filled from quote total */}
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-muted-foreground">{rfp.currency}</span>
                                                <Input
                                                    type="number"
                                                    placeholder="Contract value"
                                                    value={valueInputs[s.supplierId] || ""}
                                                    onChange={e => setValueInputs(p => ({ ...p, [s.supplierId]: e.target.value }))}
                                                    className="w-32 h-7 text-sm"
                                                    min="0"
                                                />
                                            </div>
                                            {/* Allocation % — only for split awards */}
                                            {selectedSuppliers.size > 1 && (
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        placeholder="% share"
                                                        value={allocationInputs[s.supplierId] || ""}
                                                        onChange={e => setAllocationInputs(p => ({ ...p, [s.supplierId]: e.target.value }))}
                                                        className="w-20 h-7 text-sm"
                                                        min="0" max="100"
                                                    />
                                                    <span className="text-xs text-muted-foreground">%</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowAwardForm(false)}>Cancel</Button>
                            <Button
                                onClick={handleAward}
                                disabled={awardLoading || selectedSuppliers.size === 0}
                                className="bg-violet-600 hover:bg-violet-700 gap-1.5"
                            >
                                {awardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                                Confirm Award
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
