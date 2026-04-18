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
    RefreshCw, ChevronDown, ChevronUp, Minus, ShieldCheck,
    Truck, FileCheck, Leaf, DollarSign, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import type { RFP, RFPItem, SupplierResponse } from "@/types/rfp";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

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

const RESPONSE_TABS = [
    { id: "specs",   label: "Specifications", icon: Package },
    { id: "pricing", label: "Pricing", icon: BarChart3 },
    { id: "cost",    label: "Cost Breakdown", icon: DollarSign },
    { id: "qual",    label: "Qualification", icon: ShieldCheck },
    { id: "logistics", label: "Logistics", icon: Truck },
    { id: "quality", label: "Quality", icon: FileCheck },
    { id: "esg",     label: "ESG", icon: Leaf },
    { id: "terms",   label: "Terms", icon: DollarSign },
];

export default function SupplierRFPResponsePage() {
    const params = useParams();
    const router = useRouter();
    const rfpId = params.rfpId as string;

    const [data, setData] = useState<RFPResponseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState("specs");

    // ── Section 4: Pricing (existing) ──────────────────────────────
    const [responseItems, setResponseItems] = useState<Record<string, {
        price: string; leadTime: string; moq: string; notes: string;
        rawMaterialCost: string; conversionCost: string; laborCost: string;
        logisticsCost: string; overheadCost: string; supplierMargin: string;
    }>>({});
    const [generalNotes, setGeneralNotes] = useState("");

    // ── Section 2: Qualification ────────────────────────────────────
    const [qual, setQual] = useState({
        legalEntity: "", headquarters: "", annualRevenue: "", employees: "",
        monthlyCapacity: "", certifications: [] as string[], majorClients: "", financialNotes: "",
    });

    // ── Section 5: Logistics ────────────────────────────────────────
    const [logistics, setLogistics] = useState({
        deliveryTerms: "", warehouseLocations: "", transportMethod: "",
        supplyCapacityMonthly: "", hasBackupSupplier: false,
    });

    // ── Section 6: Quality & Compliance ────────────────────────────
    const [quality, setQuality] = useState({
        isoCertified: false, gmpCertified: false, fscCertified: false,
        otherCertifications: "", inspectionProcess: "", traceabilitySystem: "",
        defectRatePct: "", auditReportUrl: "", qualityManualUrl: "",
    });

    // ── Section 7: ESG ──────────────────────────────────────────────
    const [esg, setEsg] = useState({
        recycledContentPct: "", carbonFootprintKg: "", renewableEnergyPct: "",
        packagingReductionInitiative: "", esgPolicies: "",
    });

    // ── Section 8: Commercial Terms ─────────────────────────────────
    const [terms, setTerms] = useState({
        paymentTerms: "", priceValidityDays: "", acceptsPenaltyClauses: false,
        commodityIndexLinkage: "", generalTermsAccepted: false, termsNotes: "",
    });

    // ── Compliance Ack ──────────────────────────────────────────────
    const [complianceAckAccepted, setComplianceAckAccepted] = useState(false);

    // ── Negotiation ─────────────────────────────────────────────────
    const [negBidItems, setNegBidItems] = useState<Record<string, string>>({});
    const [submittingNegBid, setSubmittingNegBid] = useState(false);
    const [expandedRound, setExpandedRound] = useState<string | null>(null);

    // ── Fetch ────────────────────────────────────────────────────────

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
                        rawMaterialCost: ri.rawMaterialCost != null ? String(ri.rawMaterialCost) : "",
                        conversionCost: ri.conversionCost != null ? String(ri.conversionCost) : "",
                        laborCost: ri.laborCost != null ? String(ri.laborCost) : "",
                        logisticsCost: ri.logisticsCost != null ? String(ri.logisticsCost) : "",
                        overheadCost: ri.overheadCost != null ? String(ri.overheadCost) : "",
                        supplierMargin: ri.supplierMargin != null ? String(ri.supplierMargin) : "",
                    };
                }
                setResponseItems(prefilledItems);
            }

            // Pre-fill neg bids
            const openRound = (res.negotiationRounds || []).find((r: NegotiationRound) => r.status === "OPEN");
            if (openRound && !openRound.hasBid) setExpandedRound(openRound.roundId);

        } catch { toast.error("Failed to load RFP"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [rfpId]);

    // ── Helpers ──────────────────────────────────────────────────────

    const getItem = (itemId: string) => responseItems[itemId] || {
        price: "", leadTime: "", moq: "", notes: "",
        rawMaterialCost: "", conversionCost: "", laborCost: "",
        logisticsCost: "", overheadCost: "", supplierMargin: "",
    };

    const updateItem = (itemId: string, field: string, value: string) => {
        setResponseItems(prev => ({ ...prev, [itemId]: { ...getItem(itemId), [field]: value } }));
    };

    const buildPayload = () => ({
        notes: generalNotes,
        complianceAckAccepted,
        items: (data?.rfp?.items || []).map((item: RFPItem) => {
            const ri = getItem(item.itemId);
            return {
                itemId: item.itemId,
                price: ri.price ? parseFloat(ri.price) : null,
                leadTime: ri.leadTime ? parseInt(ri.leadTime) : null,
                moq: ri.moq ? parseFloat(ri.moq) : null,
                notes: ri.notes || null,
                rawMaterialCost: ri.rawMaterialCost ? parseFloat(ri.rawMaterialCost) : null,
                conversionCost: ri.conversionCost ? parseFloat(ri.conversionCost) : null,
                laborCost: ri.laborCost ? parseFloat(ri.laborCost) : null,
                logisticsCost: ri.logisticsCost ? parseFloat(ri.logisticsCost) : null,
                overheadCost: ri.overheadCost ? parseFloat(ri.overheadCost) : null,
                supplierMargin: ri.supplierMargin ? parseFloat(ri.supplierMargin) : null,
            };
        }),
    });

    // ── Save handlers ────────────────────────────────────────────────

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/response/draft`, buildPayload());
            toast.success("Draft saved");
        } catch (e: any) { toast.error(e?.message || "Save failed"); }
        finally { setSaving(false); }
    };

    const handleSaveQual = async () => {
        try {
            await apiClient.post(`/api/rfp/${rfpId}/response/qualification`, qual);
            toast.success("Qualification saved");
        } catch (e: any) { toast.error(e?.message || "Failed"); }
    };

    const handleSaveLogistics = async () => {
        try {
            await apiClient.post(`/api/rfp/${rfpId}/response/logistics`, logistics);
            toast.success("Logistics saved");
        } catch (e: any) { toast.error(e?.message || "Failed"); }
    };

    const handleSaveQuality = async () => {
        try {
            await apiClient.post(`/api/rfp/${rfpId}/response/quality`, quality);
            toast.success("Quality & compliance saved");
        } catch (e: any) { toast.error(e?.message || "Failed"); }
    };

    const handleSaveESG = async () => {
        try {
            await apiClient.post(`/api/rfp/${rfpId}/response/esg`, esg);
            toast.success("ESG data saved");
        } catch (e: any) { toast.error(e?.message || "Failed"); }
    };

    const handleSaveTerms = async () => {
        try {
            await apiClient.post(`/api/rfp/${rfpId}/response/terms`, terms);
            toast.success("Commercial terms saved");
        } catch (e: any) { toast.error(e?.message || "Failed"); }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/response/submit`, buildPayload());
            toast.success("Response submitted!");
            fetchData(true);
        } catch (e: any) { toast.error(e?.message || "Submission failed"); }
        finally { setSubmitting(false); }
    };

    const handleAcceptInvitation = async (action: "accept" | "decline") => {
        try {
            await apiClient.post(`/api/rfp/${rfpId}/invitation/respond`, { action });
            toast.success(action === "accept" ? "Invitation accepted!" : "Invitation declined.");
            fetchData(true);
        } catch { toast.error("Failed to respond"); }
    };

    const handleNegotiationBid = async (roundId: string) => {
        setSubmittingNegBid(true);
        try {
            const items = Object.entries(negBidItems)
                .filter(([, price]) => price !== "")
                .map(([itemId, price]) => ({ itemId, newPrice: parseFloat(price) }));
            await apiClient.post(`/api/rfp/${rfpId}/negotiation/${roundId}/bid`, { roundId, items });
            toast.success("Negotiation bid submitted!");
            fetchData(true);
        } catch (e: any) { toast.error(e?.message || "Failed to submit bid"); }
        finally { setSubmittingNegBid(false); }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );
    if (!data) return <div className="text-center py-16 text-muted-foreground">RFP not found.</div>;

    const { rfp, inviteStatus, response, negotiationRounds, award } = data;
    const isSubmitted = response?.status === "SUBMITTED";
    const isOpen = rfp.status === "OPEN";
    const openRound = negotiationRounds.find(r => r.status === "OPEN");
    const currency = rfp.currency || "USD";

    const statusColors: Record<string, string> = {
        DRAFT: "bg-slate-100 text-slate-700",
        OPEN: "bg-emerald-100 text-emerald-700",
        CLOSED: "bg-orange-100 text-orange-700",
        AWARDED: "bg-violet-100 text-violet-700",
        ARCHIVED: "bg-gray-100 text-gray-700",
    };

    return (
        <div className="w-full py-8 px-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <button onClick={() => router.push("/supplier/rfp")}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
                        <ArrowLeft className="h-4 w-4" /> Back to RFPs
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900">{rfp.name}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge className={cn("text-xs", statusColors[rfp.status] || "bg-slate-100")}>{rfp.status}</Badge>
                        {rfp.category && <Badge variant="outline" className="text-xs">{rfp.category}</Badge>}
                        {rfp.incoterms && <Badge variant="outline" className="text-xs">{rfp.incoterms}</Badge>}
                        {rfp.buRegion && <span className="text-xs text-muted-foreground">{rfp.buRegion}</span>}
                    </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3" />
                        Deadline: {new Date(rfp.deadline).toLocaleDateString()}
                    </div>
                    {rfp.currency && <div className="mt-0.5">{rfp.currency}</div>}
                </div>
            </div>

            {/* Instructions banner */}
            {rfp.instructions && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-800">
                    <strong className="block mb-0.5">Supplier Instructions</strong>
                    {rfp.instructions}
                </div>
            )}

            {/* Compliance ack — interactive gate */}
            {rfp.requireComplianceAck && !isSubmitted && inviteStatus === "ACCEPTED" && (
                <div className={cn(
                    "border rounded-lg px-4 py-3 text-sm flex items-start gap-3",
                    complianceAckAccepted
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                )}>
                    <input
                        type="checkbox"
                        id="complianceAckChk"
                        checked={complianceAckAccepted}
                        onChange={e => setComplianceAckAccepted(e.target.checked)}
                        className="h-4 w-4 mt-0.5 shrink-0 rounded border-amber-400 accent-indigo-600"
                    />
                    <label htmlFor="complianceAckChk" className="cursor-pointer">
                        <strong className="block mb-0.5">
                            {complianceAckAccepted ? "✓ Compliance Acknowledged" : "Compliance Acknowledgement Required"}
                        </strong>
                        <span className="text-xs">
                            I confirm that our organisation complies with all stated requirements and applicable regulations. This acknowledgement is required before submitting a response.
                        </span>
                    </label>
                </div>
            )}

            {/* Award banner */}
            {award && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-4 flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-violet-600" />
                    <div>
                        <p className="font-semibold text-violet-700 text-sm">🎉 You have been awarded this RFP!</p>
                        <p className="text-xs text-violet-600 mt-0.5">
                            {award.allocationPct != null && `Allocation: ${award.allocationPct}% · `}
                            {award.awardedValue != null && `Value: ${currency} ${Number(award.awardedValue).toLocaleString()} · `}
                            {`Awarded on ${new Date(award.createdAt).toLocaleDateString()}`}
                        </p>
                    </div>
                </div>
            )}

            {/* Invitation actions */}
            {isOpen && !isSubmitted && !award && inviteStatus === "INVITED" && (
                <div className="flex gap-3">
                    <Button onClick={() => handleAcceptInvitation("accept")} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Accept Invitation
                    </Button>
                    <Button variant="outline" onClick={() => handleAcceptInvitation("decline")} className="text-red-500 hover:text-red-600">
                        Decline
                    </Button>
                </div>
            )}

            {/* Negotiation rounds */}
            {negotiationRounds.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-amber-600" />
                            Negotiation Rounds
                            <Badge variant="outline" className="text-xs">{negotiationRounds.length} round{negotiationRounds.length !== 1 ? "s" : ""}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {negotiationRounds.map(round => {
                            const isExpanded = expandedRound === round.roundId;
                            return (
                                <div key={round.roundId} className="border rounded-lg overflow-hidden">
                                    <button onClick={() => setExpandedRound(isExpanded ? null : round.roundId)}
                                        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Round {round.roundNumber}</span>
                                            <Badge className={cn("text-xs", round.status === "OPEN" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                                                {round.status}
                                            </Badge>
                                            {round.hasBid && <Badge className="bg-green-100 text-green-700 text-xs">Bid Submitted</Badge>}
                                        </div>
                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>
                                    {isExpanded && round.status === "OPEN" && !round.hasBid && (
                                        <div className="px-4 pb-4 space-y-3 border-t">
                                            <p className="text-sm text-muted-foreground pt-3">Submit revised prices for this round.</p>
                                            <div className="space-y-2">
                                                {(rfp.items || []).map((item: RFPItem) => (
                                                    <div key={item.itemId} className="flex items-center gap-3">
                                                        <Label className="flex-1 text-sm">{item.name}</Label>
                                                        <Input type="number" className="w-32" placeholder="New price"
                                                            value={negBidItems[item.itemId] || ""}
                                                            onChange={e => setNegBidItems(p => ({ ...p, [item.itemId]: e.target.value }))} />
                                                        <span className="text-xs text-muted-foreground">{currency}/{item.unit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button onClick={() => handleNegotiationBid(round.roundId)} disabled={submittingNegBid}
                                                className="bg-amber-600 hover:bg-amber-700 gap-1.5">
                                                {submittingNegBid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                Submit Bid
                                            </Button>
                                        </div>
                                    )}
                                    {isExpanded && (round.status === "CLOSED" || round.hasBid) && (
                                        <div className="px-4 pb-3 pt-2 text-sm text-muted-foreground border-t">
                                            {round.hasBid ? "Your bid has been submitted for this round." : "This round is closed."}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Main response form — shown only when accepted and open (or already submitted to view) */}
            {(inviteStatus === "ACCEPTED" || isSubmitted) && (
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">
                                {isSubmitted ? "Your Submitted Response" : "Submit Your Response"}
                            </CardTitle>
                            {isSubmitted && <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 className="h-3 w-3" />Submitted</Badge>}
                        </div>
                        {/* Section tabs */}
                        <div className="flex gap-1 overflow-x-auto pt-2 pb-0.5 -mx-1 px-1">
                            {RESPONSE_TABS.map(tab => {
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
                    <CardContent className="space-y-4">

                        {/* ── Tab: Specifications (Section 3) ── */}
                        {activeTab === "specs" && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Review the technical specifications required by the buyer for each line item.
                                    Confirm you can meet each specification or note any deviations.
                                </p>
                                {(rfp.items || []).length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-8">No line items found.</p>
                                )}
                                {(rfp.items || []).map((item: RFPItem) => {
                                    const specAttrs = (item as any).specAttributes;
                                    const hasStructuredSpecs = specAttrs && Object.keys(specAttrs).length > 0;
                                    return (
                                        <div key={item.itemId} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <span className="font-medium text-sm">{item.name}</span>
                                                <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                                            </div>
                                            {hasStructuredSpecs && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-indigo-700">Required Specifications</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                                        {Object.entries(specAttrs).filter(([, v]) => v !== "" && v !== null && v !== undefined).map(([key, value]) => (
                                                            <div key={key} className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs">
                                                                <div className="text-indigo-500 capitalize mb-0.5">{key.replace(/_/g, " ")}</div>
                                                                <div className="font-semibold text-slate-800">{String(value)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {item.specifications && (
                                                <div className="text-xs text-muted-foreground bg-slate-50 rounded-lg px-3 py-2">
                                                    <span className="font-medium text-slate-600">Additional Notes: </span>{item.specifications}
                                                </div>
                                            )}
                                            {!hasStructuredSpecs && !item.specifications && (
                                                <p className="text-xs text-muted-foreground italic">No specific technical requirements defined for this item.</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Tab: Pricing (Section 4 — unit price + lead time) ── */}
                        {activeTab === "pricing" && (
                            <div className="space-y-4">
                                {(rfp.items || []).map((item: RFPItem) => {
                                    const ri = getItem(item.itemId);
                                    return (
                                        <div key={item.itemId} className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="font-medium text-sm">{item.name}</div>
                                                    {item.specifications && <div className="text-xs text-muted-foreground mt-0.5">{item.specifications}</div>}
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <div>{item.quantity} {item.unit}</div>
                                                    {item.targetPrice && (
                                                        <div className="text-indigo-600 mt-0.5">Target: {currency} {item.targetPrice}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Unit Price ({currency}) *</Label>
                                                    <Input type="number" placeholder="0.00" disabled={isSubmitted}
                                                        value={ri.price} onChange={e => updateItem(item.itemId, "price", e.target.value)} />
                                                    {item.targetPrice && ri.price && (
                                                        <div className={cn("text-xs flex items-center gap-1",
                                                            parseFloat(ri.price) <= item.targetPrice ? "text-green-600" : "text-red-500")}>
                                                            {parseFloat(ri.price) <= item.targetPrice
                                                                ? <TrendingDown className="h-3 w-3" />
                                                                : <TrendingUp className="h-3 w-3" />}
                                                            {(((parseFloat(ri.price) - item.targetPrice) / item.targetPrice) * 100).toFixed(1)}% vs target
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Lead Time (days)</Label>
                                                    <Input type="number" placeholder="0" disabled={isSubmitted}
                                                        value={ri.leadTime} onChange={e => updateItem(item.itemId, "leadTime", e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">MOQ ({item.unit})</Label>
                                                    <Input type="number" placeholder="0" disabled={isSubmitted}
                                                        value={ri.moq} onChange={e => updateItem(item.itemId, "moq", e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Notes</Label>
                                                    <Input placeholder="Optional" disabled={isSubmitted}
                                                        value={ri.notes} onChange={e => updateItem(item.itemId, "notes", e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="space-y-1">
                                    <Label className="text-xs">General Notes</Label>
                                    <Textarea placeholder="Any general notes for the buyer…" disabled={isSubmitted}
                                        value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} rows={2} />
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Cost Breakdown (Section 4 detailed) ── */}
                        {activeTab === "cost" && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Break down your unit price into cost components. This helps buyers validate pricing logic.</p>
                                {(rfp.items || []).map((item: RFPItem) => {
                                    const ri = getItem(item.itemId);
                                    const components = [
                                        { key: "rawMaterialCost", label: "Raw Material Cost" },
                                        { key: "conversionCost", label: "Conversion / Processing Cost" },
                                        { key: "laborCost", label: "Labor Cost" },
                                        { key: "logisticsCost", label: "Logistics / Freight" },
                                        { key: "overheadCost", label: "Overhead" },
                                        { key: "supplierMargin", label: "Margin (optional)" },
                                    ];
                                    const subtotal = components.slice(0, 5)
                                        .map(c => parseFloat((ri as any)[c.key] || "0"))
                                        .reduce((a, b) => a + b, 0);
                                    const margin = parseFloat(ri.supplierMargin || "0");
                                    const total = subtotal + margin;
                                    return (
                                        <div key={item.itemId} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm">{item.name}</span>
                                                {ri.price && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Quoted: <strong className="text-slate-800">{currency} {ri.price}</strong>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {components.map(comp => (
                                                    <div key={comp.key} className="space-y-1">
                                                        <Label className="text-xs">{comp.label} ({currency})</Label>
                                                        <Input type="number" placeholder="0.00" disabled={isSubmitted}
                                                            value={(ri as any)[comp.key]}
                                                            onChange={e => updateItem(item.itemId, comp.key, e.target.value)} />
                                                    </div>
                                                ))}
                                            </div>
                                            {total > 0 && (
                                                <div className="flex items-center justify-between text-xs bg-slate-50 rounded px-3 py-2">
                                                    <span className="text-muted-foreground">Cost breakdown total</span>
                                                    <span className={cn("font-semibold", ri.price && Math.abs(total - parseFloat(ri.price)) > 0.01 ? "text-amber-600" : "text-slate-800")}>
                                                        {currency} {total.toFixed(2)}
                                                        {ri.price && Math.abs(total - parseFloat(ri.price)) > 0.01 && (
                                                            <span className="ml-1 font-normal text-amber-600">(differs from quoted price)</span>
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Tab: Qualification (Section 2) ── */}
                        {activeTab === "qual" && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Qualification Score = Financial (20%) + Capability (40%) + Experience (25%) + Compliance (15%)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Legal Entity Name</Label>
                                        <Input value={qual.legalEntity} onChange={e => setQual(p => ({ ...p, legalEntity: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Headquarters Location</Label>
                                        <Input value={qual.headquarters} onChange={e => setQual(p => ({ ...p, headquarters: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Annual Revenue (USD)</Label>
                                        <Input type="number" placeholder="e.g. 5000000" value={qual.annualRevenue}
                                            onChange={e => setQual(p => ({ ...p, annualRevenue: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Number of Employees</Label>
                                        <Input type="number" value={qual.employees} onChange={e => setQual(p => ({ ...p, employees: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Monthly Production Capacity</Label>
                                        <Input placeholder="e.g. 500,000 units/month" value={qual.monthlyCapacity}
                                            onChange={e => setQual(p => ({ ...p, monthlyCapacity: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Major Clients (comma-separated)</Label>
                                        <Input placeholder="e.g. P&G, Unilever, Nestlé" value={qual.majorClients}
                                            onChange={e => setQual(p => ({ ...p, majorClients: e.target.value }))} />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <Label className="text-xs">Certifications Held</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {["ISO 9001", "ISO 14001", "GMP", "FSC", "HACCP", "SA8000", "ISO 45001"].map(cert => (
                                                <label key={cert} className="flex items-center gap-1.5 cursor-pointer text-sm">
                                                    <input type="checkbox"
                                                        checked={qual.certifications.includes(cert)}
                                                        onChange={e => setQual(p => ({
                                                            ...p,
                                                            certifications: e.target.checked
                                                                ? [...p.certifications, cert]
                                                                : p.certifications.filter(c => c !== cert)
                                                        }))}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                                                    {cert}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <Label className="text-xs">Financial Stability Notes</Label>
                                        <Textarea placeholder="e.g. Profitable for 10 consecutive years, credit rating A…" rows={2}
                                            value={qual.financialNotes} onChange={e => setQual(p => ({ ...p, financialNotes: e.target.value }))} />
                                    </div>
                                </div>
                                <Button onClick={handleSaveQual} variant="outline" className="gap-1.5">
                                    <Save className="h-4 w-4" /> Save Qualification
                                </Button>
                            </div>
                        )}

                        {/* ── Tab: Logistics (Section 5) ── */}
                        {activeTab === "logistics" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Delivery Terms</Label>
                                        <select value={logistics.deliveryTerms}
                                            onChange={e => setLogistics(p => ({ ...p, deliveryTerms: e.target.value }))}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                                            <option value="">— Select —</option>
                                            {["EXW", "FOB", "CIF", "DAP", "DDP", "FCA", "CPT"].map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Transport Method</Label>
                                        <select value={logistics.transportMethod}
                                            onChange={e => setLogistics(p => ({ ...p, transportMethod: e.target.value }))}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                                            <option value="">— Select —</option>
                                            {["Road", "Sea", "Air", "Rail", "Multimodal"].map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Warehouse Locations</Label>
                                        <Input placeholder="e.g. Mumbai, Singapore, Rotterdam" value={logistics.warehouseLocations}
                                            onChange={e => setLogistics(p => ({ ...p, warehouseLocations: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Monthly Supply Capacity (units)</Label>
                                        <Input type="number" value={logistics.supplyCapacityMonthly}
                                            onChange={e => setLogistics(p => ({ ...p, supplyCapacityMonthly: e.target.value }))} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={logistics.hasBackupSupplier}
                                                onChange={e => setLogistics(p => ({ ...p, hasBackupSupplier: e.target.checked }))}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                                            <span className="text-sm">We have a backup supplier / secondary manufacturing site</span>
                                        </label>
                                    </div>
                                </div>
                                <Button onClick={handleSaveLogistics} variant="outline" className="gap-1.5">
                                    <Save className="h-4 w-4" /> Save Logistics
                                </Button>
                            </div>
                        )}

                        {/* ── Tab: Quality & Compliance (Section 6) ── */}
                        {activeTab === "quality" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2 space-y-2">
                                        <Label className="text-xs text-muted-foreground">Certifications</Label>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { key: "isoCertified", label: "ISO 9001" },
                                                { key: "gmpCertified", label: "GMP" },
                                                { key: "fscCertified", label: "FSC" },
                                            ].map(cert => (
                                                <label key={cert.key} className="flex items-center gap-2 cursor-pointer text-sm">
                                                    <input type="checkbox"
                                                        checked={(quality as any)[cert.key]}
                                                        onChange={e => setQuality(p => ({ ...p, [cert.key]: e.target.checked }))}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                                                    {cert.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Other Certifications</Label>
                                        <Input placeholder="e.g. HACCP, BRC, SQF" value={quality.otherCertifications}
                                            onChange={e => setQuality(p => ({ ...p, otherCertifications: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Defect Rate (%)</Label>
                                        <Input type="number" placeholder="e.g. 0.5" value={quality.defectRatePct}
                                            onChange={e => setQuality(p => ({ ...p, defectRatePct: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Inspection Process</Label>
                                        <Input placeholder="e.g. Incoming + outgoing QC" value={quality.inspectionProcess}
                                            onChange={e => setQuality(p => ({ ...p, inspectionProcess: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Traceability System</Label>
                                        <Input placeholder="e.g. Batch tracking with ERP" value={quality.traceabilitySystem}
                                            onChange={e => setQuality(p => ({ ...p, traceabilitySystem: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Audit Report URL</Label>
                                        <Input type="url" placeholder="https://…" value={quality.auditReportUrl}
                                            onChange={e => setQuality(p => ({ ...p, auditReportUrl: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Quality Manual URL</Label>
                                        <Input type="url" placeholder="https://…" value={quality.qualityManualUrl}
                                            onChange={e => setQuality(p => ({ ...p, qualityManualUrl: e.target.value }))} />
                                    </div>
                                </div>
                                <Button onClick={handleSaveQuality} variant="outline" className="gap-1.5">
                                    <Save className="h-4 w-4" /> Save Quality & Compliance
                                </Button>
                            </div>
                        )}

                        {/* ── Tab: ESG (Section 7) ── */}
                        {activeTab === "esg" && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">ESG Score = Carbon (40%) + Recycled Content (30%) + Renewable Energy (30%)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Recycled Content (%)</Label>
                                        <Input type="number" min="0" max="100" placeholder="e.g. 40" value={esg.recycledContentPct}
                                            onChange={e => setEsg(p => ({ ...p, recycledContentPct: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Carbon Footprint (kg CO₂ / unit)</Label>
                                        <Input type="number" placeholder="e.g. 2.5" value={esg.carbonFootprintKg}
                                            onChange={e => setEsg(p => ({ ...p, carbonFootprintKg: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Renewable Energy Usage (%)</Label>
                                        <Input type="number" min="0" max="100" placeholder="e.g. 60" value={esg.renewableEnergyPct}
                                            onChange={e => setEsg(p => ({ ...p, renewableEnergyPct: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Packaging Reduction Initiatives</Label>
                                        <Input placeholder="e.g. 20% weight reduction in 2025" value={esg.packagingReductionInitiative}
                                            onChange={e => setEsg(p => ({ ...p, packagingReductionInitiative: e.target.value }))} />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <Label className="text-xs">ESG Policies & Commitments</Label>
                                        <Textarea placeholder="Describe your sustainability policies, net-zero targets, supply chain ethics…" rows={3}
                                            value={esg.esgPolicies} onChange={e => setEsg(p => ({ ...p, esgPolicies: e.target.value }))} />
                                    </div>
                                </div>
                                <Button onClick={handleSaveESG} variant="outline" className="gap-1.5">
                                    <Save className="h-4 w-4" /> Save ESG Data
                                </Button>
                            </div>
                        )}

                        {/* ── Tab: Commercial Terms (Section 8) ── */}
                        {activeTab === "terms" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Our Payment Terms</Label>
                                        <select value={terms.paymentTerms}
                                            onChange={e => setTerms(p => ({ ...p, paymentTerms: e.target.value }))}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                                            <option value="">— Select —</option>
                                            {["Net 30", "Net 45", "Net 60", "Net 90", "Advance", "LC at Sight"].map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Price Validity (days)</Label>
                                        <Input type="number" placeholder="90" value={terms.priceValidityDays}
                                            onChange={e => setTerms(p => ({ ...p, priceValidityDays: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Commodity Index Linkage</Label>
                                        <Input placeholder="e.g. Linked to OCC index" value={terms.commodityIndexLinkage}
                                            onChange={e => setTerms(p => ({ ...p, commodityIndexLinkage: e.target.value }))} />
                                    </div>
                                    <div className="flex flex-col gap-3 justify-center">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                                            <input type="checkbox" checked={terms.acceptsPenaltyClauses}
                                                onChange={e => setTerms(p => ({ ...p, acceptsPenaltyClauses: e.target.checked }))}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                                            Accept penalty clauses for late delivery
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                                            <input type="checkbox" checked={terms.generalTermsAccepted}
                                                onChange={e => setTerms(p => ({ ...p, generalTermsAccepted: e.target.checked }))}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                                            <span>Accept buyer&apos;s general terms & conditions</span>
                                        </label>
                                    </div>
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <Label className="text-xs">Terms Notes / Exceptions</Label>
                                        <Textarea placeholder="Any exceptions or notes regarding the commercial terms…" rows={2}
                                            value={terms.termsNotes} onChange={e => setTerms(p => ({ ...p, termsNotes: e.target.value }))} />
                                    </div>
                                </div>
                                <Button onClick={handleSaveTerms} variant="outline" className="gap-1.5">
                                    <Save className="h-4 w-4" /> Save Commercial Terms
                                </Button>
                            </div>
                        )}

                        {/* ── Footer actions ── */}
                        {!isSubmitted && isOpen && (
                            <div className="border-t pt-4 flex gap-3 justify-end">
                                <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="gap-1.5">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save Draft
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || (rfp.requireComplianceAck && !complianceAckAccepted)}
                                    title={rfp.requireComplianceAck && !complianceAckAccepted ? "You must accept the compliance acknowledgement above before submitting" : undefined}
                                    className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    Submit Response
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Not accepted / no access */}
            {!award && !isSubmitted && inviteStatus !== "ACCEPTED" && inviteStatus !== "INVITED" && (
                <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>You are not invited to respond to this RFP.</p>
                </div>
            )}
        </div>
    );
}
