"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft, Loader2, Send, Save, CheckCircle2, Package,
    AlertCircle, Calendar, Trophy, TrendingDown, TrendingUp,
    RefreshCw, ChevronDown, ChevronUp, Minus
} from "lucide-react";
import { toast } from "sonner";
import type { RFP, RFPItem, SupplierResponse } from "@/types/rfp";
import { cn } from "@/lib/utils";

interface NegotiationRound {
    roundId: string;
    roundNumber: number;
    status: string;
    notes?: string;
    createdAt: string;
    closedAt?: string;
    hasBid: boolean;
}

interface AwardInfo {
    awardId: string;
    allocationPct?: number;
    awardedValue?: number;
    createdAt: string;
}

interface RFPResponseData {
    rfp: RFP;
    inviteStatus: string | null;
    response?: SupplierResponse;
    negotiationRounds: NegotiationRound[];
    award: AwardInfo | null;
}

export default function SupplierRFPResponsePage() {
    const params = useParams();
    const router = useRouter();
    const rfpId = params.rfpId as string;

    const [data, setData] = useState<RFPResponseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Response form state: itemId -> { price, leadTime, moq, notes }
    const [responseItems, setResponseItems] = useState<Record<string, {
        price: string; leadTime: string; moq: string; notes: string;
    }>>({});
    const [generalNotes, setGeneralNotes] = useState("");

    // Negotiation bid state: itemId -> newPrice
    const [negBidItems, setNegBidItems] = useState<Record<string, string>>({});
    const [submittingNegBid, setSubmittingNegBid] = useState(false);
    const [expandedRound, setExpandedRound] = useState<string | null>(null);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await apiClient.get(`/api/rfp/${rfpId}/response`) as any;
            setData(res);

            if (res.response) {
                setGeneralNotes(res.response.notes || "");
                const prefilledItems: typeof responseItems = {};
                for (const ri of res.response.items || []) {
                    prefilledItems[ri.itemId] = {
                        price: ri.price != null ? String(ri.price) : "",
                        leadTime: ri.leadTime != null ? String(ri.leadTime) : "",
                        moq: ri.moq != null ? String(ri.moq) : "",
                        notes: ri.notes || "",
                    };
                }
                setResponseItems(prefilledItems);
                // Pre-fill negotiation bid with current prices as starting point
                const negPrices: Record<string, string> = {};
                for (const ri of res.response.items || []) {
                    if (ri.price != null) negPrices[ri.itemId] = String(ri.price);
                }
                setNegBidItems(negPrices);
            } else if (res.rfp.items) {
                const emptyItems: typeof responseItems = {};
                for (const item of res.rfp.items) {
                    emptyItems[item.itemId] = { price: "", leadTime: "", moq: "", notes: "" };
                }
                setResponseItems(emptyItems);
            }

            // Auto-expand the active negotiation round if no bid yet
            const openRound = (res.negotiationRounds || []).find((r: NegotiationRound) => r.status === "OPEN");
            if (openRound && !openRound.hasBid) {
                setExpandedRound(openRound.roundId);
            }
        } catch {
            toast.error("Failed to load RFP");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [rfpId]);

    const buildPayload = () => ({
        notes: generalNotes || undefined,
        items: Object.entries(responseItems).map(([itemId, vals]) => ({
            itemId,
            price: vals.price ? parseFloat(vals.price) : undefined,
            leadTime: vals.leadTime ? parseInt(vals.leadTime) : undefined,
            moq: vals.moq ? parseFloat(vals.moq) : undefined,
            notes: vals.notes || undefined,
        })).filter(i => i.price !== undefined || i.leadTime !== undefined || i.moq !== undefined),
    });

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/response/draft`, buildPayload());
            toast.success("Draft saved.");
            fetchData(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to save draft");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        const payload = buildPayload();
        const hasPrice = payload.items.some(i => i.price !== undefined);
        if (!hasPrice) {
            toast.error("Please enter a price for at least one line item.");
            return;
        }
        if (!confirm("Submit your quote? You will not be able to edit it after submission.")) return;
        setSubmitting(true);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/response/submit`, buildPayload());
            toast.success("Quote submitted successfully!");
            fetchData(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to submit quote");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitNegBid = async (roundId: string) => {
        const items = Object.entries(negBidItems)
            .filter(([, v]) => v !== "")
            .map(([itemId, newPrice]) => ({ itemId, newPrice: parseFloat(newPrice) }));
        if (items.length === 0) {
            toast.error("Enter revised prices for at least one item.");
            return;
        }
        setSubmittingNegBid(true);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/negotiation/${roundId}/bid`, { roundId, items });
            toast.success("Revised bid submitted!");
            fetchData(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to submit bid");
        } finally {
            setSubmittingNegBid(false);
        }
    };

    const updateItemField = (itemId: string, field: string, value: string) => {
        setResponseItems(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );

    if (!data) return (
        <div className="text-center py-16 text-muted-foreground">
            <p>RFP not found or you are not invited.</p>
            <Button variant="link" onClick={() => router.push("/supplier/rfp")}>Back to RFPs</Button>
        </div>
    );

    const { rfp, response, negotiationRounds, award } = data;
    const isSubmitted = response?.status === "SUBMITTED";
    const isOpen = rfp.status === "OPEN";
    const daysLeft = rfp.deadline ? Math.ceil((new Date(rfp.deadline).getTime() - Date.now()) / 86400000) : null;
    const isExpired = daysLeft !== null && daysLeft <= 0;
    const openRound = negotiationRounds.find(r => r.status === "OPEN");

    const totalQuoted = Object.values(responseItems).reduce((acc, r) => {
        const p = parseFloat(r.price);
        return acc + (isNaN(p) ? 0 : p);
    }, 0);

    return (
        <div className="w-full space-y-6">
            {/* ── Header ── */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push("/supplier/rfp")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold text-slate-900">{rfp.name}</h1>
                        <Badge variant="outline" className={cn("text-[11px]",
                            rfp.status === "OPEN" ? "bg-green-100 text-green-700" :
                            rfp.status === "AWARDED" ? "bg-violet-100 text-violet-700" :
                            "bg-amber-100 text-amber-700"
                        )}>
                            {rfp.status}
                        </Badge>
                        {isSubmitted && !award && (
                            <Badge className="bg-green-600 text-white text-[11px] gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Submitted
                            </Badge>
                        )}
                        {award && (
                            <Badge className="bg-violet-600 text-white text-[11px] gap-1">
                                <Trophy className="h-3 w-3" /> Awarded
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{rfp.currency}</span>
                        {rfp.category && <><span>•</span><span>{rfp.category}</span></>}
                        {rfp.deadline && (
                            <>
                                <span>•</span>
                                <span className={cn("flex items-center gap-1", isExpired ? "text-rose-500" : daysLeft !== null && daysLeft < 3 ? "text-amber-600" : "")}>
                                    <Calendar className="h-3 w-3" />
                                    Deadline: {new Date(rfp.deadline).toLocaleDateString()}
                                    {daysLeft !== null && !isExpired && <span>({daysLeft}d left)</span>}
                                    {isExpired && <span>(Expired)</span>}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {rfp.description && (
                <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">{rfp.description}</div>
            )}

            {/* ── Award Banner ── */}
            {award && (
                <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-lg px-4 py-3">
                    <Trophy className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-violet-700 text-sm">You have been awarded this RFP!</p>
                        <p className="text-xs text-violet-600 mt-0.5">
                            {award.allocationPct != null && `Allocation: ${award.allocationPct}% · `}
                            {award.awardedValue != null && `Value: ${rfp.currency} ${Number(award.awardedValue).toLocaleString()} · `}
                            {`Awarded on ${new Date(award.createdAt).toLocaleDateString()}`}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Status Banners ── */}
            {isSubmitted && !award && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-green-700 text-sm">Quote Submitted</p>
                        <p className="text-xs text-green-600">
                            Submitted on {response?.submittedAt ? new Date(response.submittedAt).toLocaleString() : "—"}.
                            The buyer will review your response.
                        </p>
                    </div>
                </div>
            )}

            {!isOpen && !isSubmitted && !award && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-700">This RFP is no longer accepting responses.</p>
                </div>
            )}

            {isExpired && isOpen && !isSubmitted && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
                    <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                    <p className="text-sm text-rose-700">The submission deadline has passed.</p>
                </div>
            )}

            {/* ── Open Negotiation Banner ── */}
            {openRound && !openRound.hasBid && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
                    <RefreshCw className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold text-amber-700 text-sm">Negotiation Round {openRound.roundNumber} is open</p>
                        <p className="text-xs text-amber-600">The buyer has requested revised pricing. Submit your updated bid below.</p>
                    </div>
                    <Button
                        size="sm"
                        className="h-8 bg-amber-600 hover:bg-amber-700 gap-1.5"
                        onClick={() => setExpandedRound(openRound.roundId)}
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Revise Bid
                    </Button>
                </div>
            )}

            {/* ── Line Items Response Form ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4 text-indigo-600" />
                        Quote Line Items
                    </CardTitle>
                    {!isSubmitted && isOpen && (
                        <p className="text-xs text-muted-foreground">Enter your pricing for each item. Price is required for submission.</p>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {(rfp.items || []).map((item: RFPItem, idx: number) => {
                        const vals = responseItems[item.itemId] || { price: "", leadTime: "", moq: "", notes: "" };
                        return (
                            <div key={item.itemId} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="font-semibold text-sm">{idx + 1}. {item.name}</span>
                                        {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                                        {item.specifications && <p className="text-xs text-slate-500 mt-0.5 italic">{item.specifications}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-medium">{item.quantity} {item.unit || ""}</p>
                                        <p className="text-xs text-muted-foreground">requested</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-xs">
                                            Unit Price ({rfp.currency}) <span className="text-rose-500">*</span>
                                        </Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={vals.price}
                                            onChange={e => updateItemField(item.itemId, "price", e.target.value)}
                                            disabled={isSubmitted || !isOpen}
                                            min="0" step="0.01"
                                            className={cn("h-8 text-sm", vals.price ? "border-green-300 bg-green-50" : "")}
                                        />
                                        {vals.price && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Total: {rfp.currency} {(parseFloat(vals.price) * item.quantity).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <Label className="text-xs">Lead Time (days)</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 14"
                                            value={vals.leadTime}
                                            onChange={e => updateItemField(item.itemId, "leadTime", e.target.value)}
                                            disabled={isSubmitted || !isOpen}
                                            min="1"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">MOQ</Label>
                                        <Input
                                            type="number"
                                            placeholder="Min. order qty"
                                            value={vals.moq}
                                            onChange={e => updateItemField(item.itemId, "moq", e.target.value)}
                                            disabled={isSubmitted || !isOpen}
                                            min="0" step="any"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs">Notes for this item</Label>
                                    <Input
                                        placeholder="Any specific notes about this item..."
                                        value={vals.notes}
                                        onChange={e => updateItemField(item.itemId, "notes", e.target.value)}
                                        disabled={isSubmitted || !isOpen}
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {/* General Notes */}
                    <div>
                        <Label>General Notes / Remarks</Label>
                        <Textarea
                            placeholder="Any general comments, payment terms, delivery conditions, or other information relevant to your quote..."
                            value={generalNotes}
                            onChange={e => setGeneralNotes(e.target.value)}
                            disabled={isSubmitted || !isOpen}
                            rows={3}
                        />
                    </div>

                    {/* Quote Summary */}
                    {Object.values(responseItems).some(r => r.price) && (
                        <div className="bg-indigo-50 rounded-lg px-4 py-3 border border-indigo-100">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-indigo-700">Estimated Total (sum of unit prices)</span>
                                <span className="text-lg font-bold text-indigo-700">
                                    {rfp.currency} {totalQuoted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Submit / Draft Actions ── */}
            {!isSubmitted && isOpen && !isExpired && (
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={handleSaveDraft} disabled={saving || submitting} className="gap-1.5">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Draft
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving || submitting} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Submit Quote
                    </Button>
                </div>
            )}

            {/* ── Negotiation Rounds ── */}
            {negotiationRounds.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-amber-600" />
                            Negotiation Rounds
                            <Badge variant="outline" className="text-[10px] ml-auto">
                                {negotiationRounds.length} round{negotiationRounds.length !== 1 ? "s" : ""}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {negotiationRounds.map(round => {
                            const isRoundOpen = round.status === "OPEN";
                            const isExpanded = expandedRound === round.roundId;

                            return (
                                <div key={round.roundId} className={cn(
                                    "border rounded-lg overflow-hidden",
                                    isRoundOpen ? "border-amber-300" : "border-slate-200"
                                )}>
                                    {/* Round header */}
                                    <button
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-slate-50 transition-colors text-left",
                                            isRoundOpen && "bg-amber-50 hover:bg-amber-50/80"
                                        )}
                                        onClick={() => setExpandedRound(isExpanded ? null : round.roundId)}
                                    >
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span>Round {round.roundNumber}</span>
                                            <Badge variant="outline" className={cn("text-[10px]",
                                                isRoundOpen ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-slate-100 text-slate-600"
                                            )}>
                                                {round.status}
                                            </Badge>
                                            {round.hasBid && (
                                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-300">
                                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Bid Submitted
                                                </Badge>
                                            )}
                                            {isRoundOpen && !round.hasBid && (
                                                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-300">
                                                    Action Required
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{new Date(round.createdAt).toLocaleDateString()}</span>
                                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                        </div>
                                    </button>

                                    {/* Round body */}
                                    {isExpanded && (
                                        <div className="px-4 py-4 border-t bg-white space-y-4">
                                            {round.notes && (
                                                <div className="bg-amber-50 rounded-md px-3 py-2 text-sm text-amber-800">
                                                    <span className="font-medium">Buyer note: </span>{round.notes}
                                                </div>
                                            )}

                                            {isRoundOpen && !round.hasBid ? (
                                                <>
                                                    <p className="text-xs text-muted-foreground">
                                                        Submit revised prices for this negotiation round.
                                                    </p>
                                                    <div className="space-y-3">
                                                        {(rfp.items || []).map((item: RFPItem) => {
                                                            const prevPrice = parseFloat(responseItems[item.itemId]?.price || "0");
                                                            const newPriceStr = negBidItems[item.itemId] || "";
                                                            const newPrice = parseFloat(newPriceStr);
                                                            const hasPrev = !isNaN(prevPrice) && prevPrice > 0;
                                                            const hasNew = newPriceStr !== "" && !isNaN(newPrice) && newPrice > 0;
                                                            const delta = hasPrev && hasNew ? ((newPrice - prevPrice) / prevPrice * 100) : null;

                                                            return (
                                                                <div key={item.itemId} className="flex items-center gap-3 p-3 border rounded-md bg-slate-50">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium truncate">{item.name}</p>
                                                                        {hasPrev && (
                                                                            <p className="text-xs text-muted-foreground">
                                                                                Previous: {rfp.currency} {prevPrice.toLocaleString()}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div>
                                                                            <Label className="text-xs">New Price ({rfp.currency})</Label>
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="0.00"
                                                                                value={newPriceStr}
                                                                                onChange={e => setNegBidItems(prev => ({ ...prev, [item.itemId]: e.target.value }))}
                                                                                min="0" step="0.01"
                                                                                className="h-8 text-sm w-32"
                                                                            />
                                                                        </div>
                                                                        {delta !== null && (
                                                                            <div className="flex items-center gap-1 text-xs mt-4">
                                                                                {delta < 0
                                                                                    ? <TrendingDown className="h-3.5 w-3.5 text-green-600" />
                                                                                    : delta > 0
                                                                                    ? <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                                                                                    : <Minus className="h-3.5 w-3.5 text-slate-400" />}
                                                                                <span className={cn(
                                                                                    delta < 0 ? "text-green-600" : delta > 0 ? "text-rose-500" : "text-slate-400"
                                                                                )}>
                                                                                    {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <Button
                                                            className="bg-amber-600 hover:bg-amber-700 gap-1.5"
                                                            disabled={submittingNegBid}
                                                            onClick={() => handleSubmitNegBid(round.roundId)}
                                                        >
                                                            {submittingNegBid
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Send className="h-4 w-4" />}
                                                            Submit Revised Bid
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : round.hasBid ? (
                                                <div className="flex items-center gap-2 text-sm text-green-700">
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    Your revised bid has been submitted for this round.
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">This round is closed. No further bids accepted.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
