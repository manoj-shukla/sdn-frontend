"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Trophy, Loader2, Building2, Calendar, DollarSign,
    Package, ArrowRight, Search, FileText, TrendingUp,
    CheckCircle2, Star, Percent, RefreshCw, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SupplierAward {
    awardId: string;
    rfpId: string;
    rfpName: string;
    rfpStatus: string;
    rfpDescription: string | null;
    category: string | null;
    currency: string;
    deadline: string | null;
    buyerName: string | null;
    allocationPct: number | null;
    awardedValue: number | null;
    awardNotes: string | null;
    awardedAt: string;
    submittedAt: string | null;
    itemCount: number;
    negotiationRounds: number;
}

function formatValue(value: number | null, currency: string) {
    if (value == null) return "—";
    if (value >= 10_000_000) return `${currency} ${(value / 10_000_000).toFixed(2)}Cr`;
    if (value >= 100_000)    return `${currency} ${(value / 100_000).toFixed(2)}L`;
    return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30)  return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
}

export default function SupplierAwardsPage() {
    const router = useRouter();
    const [awards, setAwards] = useState<SupplierAward[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        apiClient.get("/api/rfp/my/awards")
            .then((res: any) => setAwards(Array.isArray(res) ? res : []))
            .catch(() => setAwards([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = awards.filter(a =>
        !search ||
        a.rfpName.toLowerCase().includes(search.toLowerCase()) ||
        (a.buyerName || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.category || "").toLowerCase().includes(search.toLowerCase())
    );

    // Summary stats
    const totalValue = awards.reduce((s, a) => s + (a.awardedValue || 0), 0);
    const totalAwards = awards.length;
    // allocationPct null = full award (100%). Average across all awards.
    const effectiveAllocations = awards.map(a => a.allocationPct != null ? a.allocationPct : 100);
    const avgAllocation = effectiveAllocations.length > 0
        ? effectiveAllocations.reduce((s, v) => s + v, 0) / effectiveAllocations.length
        : null;
    const uniqueBuyers = new Set(awards.map(a => a.buyerName).filter(Boolean)).size;

    const stats = [
        {
            label: "Total Awards",
            value: totalAwards,
            icon: Trophy,
            color: "text-violet-600",
            bg: "bg-violet-50",
            border: "border-violet-100",
            accent: "bg-violet-500",
        },
        {
            label: "Total Contract Value",
            value: totalValue > 0 ? formatValue(totalValue, awards[0]?.currency || "") : "—",
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            accent: "bg-emerald-500",
        },
        {
            label: "Avg Allocation",
            value: avgAllocation != null ? `${avgAllocation.toFixed(0)}%` : "—",
            icon: Percent,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
            accent: "bg-blue-500",
        },
        {
            label: "Unique Buyers",
            value: uniqueBuyers,
            icon: Building2,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
            accent: "bg-amber-500",
        },
    ];

    return (
        <div className="w-full space-y-6">

            {/* ── Page Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-100 rounded-xl">
                        <Trophy className="h-6 w-6 text-violet-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">My Awards</h1>
                        <p className="text-sm text-muted-foreground">
                            Contracts and sourcing events you have been awarded
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by RFP, buyer, category…"
                            className="pl-9 h-9 w-64 text-sm"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(s => (
                    <Card key={s.label} className={cn("border relative overflow-hidden", s.border)}>
                        <div className={cn("h-0.5 w-full absolute top-0 left-0", s.accent)} />
                        <CardContent className="pt-5 pb-4 px-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        {s.label}
                                    </p>
                                    <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
                                </div>
                                <div className={cn("p-2 rounded-lg", s.bg)}>
                                    <s.icon className={cn("h-5 w-5", s.color)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Awards List ── */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-16 w-16 bg-violet-50 rounded-full flex items-center justify-center mb-4">
                            <Trophy className="h-8 w-8 text-violet-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-1">
                            {search ? "No awards match your search" : "No awards yet"}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            {search
                                ? "Try adjusting your search terms."
                                : "When a buyer awards you an RFP, it will appear here with full contract details."}
                        </p>
                        {!search && (
                            <Button
                                variant="outline"
                                className="mt-5 gap-2"
                                onClick={() => router.push("/supplier/rfp")}
                            >
                                <FileText className="h-4 w-4" /> View RFP Invitations
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filtered.map(award => (
                        <AwardCard
                            key={award.awardId}
                            award={award}
                            onView={() => router.push(`/supplier/rfp/${award.rfpId}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function AwardCard({ award, onView }: { award: SupplierAward; onView: () => void }) {
    const isRecent = (Date.now() - new Date(award.awardedAt).getTime()) < 7 * 86_400_000;

    return (
        <Card className="border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all duration-200 overflow-hidden">
            {/* Violet top stripe */}
            <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />

            <CardContent className="p-0">
                <div className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">

                        {/* Left: Title + Meta */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Trophy className="h-4 w-4 text-violet-500 flex-shrink-0" />
                                <h3 className="font-bold text-slate-900 text-base leading-tight">{award.rfpName}</h3>
                                {isRecent && (
                                    <Badge className="bg-violet-600 text-white text-[10px] px-2 py-0.5">
                                        <Star className="h-2.5 w-2.5 mr-1" />New
                                    </Badge>
                                )}
                                {award.category && (
                                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                                        {award.category}
                                    </Badge>
                                )}
                            </div>

                            {award.rfpDescription && (
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2 max-w-2xl">
                                    {award.rfpDescription}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                                {award.buyerName && (
                                    <span className="flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5" />
                                        {award.buyerName}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Awarded {timeAgo(award.awardedAt)} &nbsp;
                                    <span className="text-slate-400">
                                        ({new Date(award.awardedAt).toLocaleDateString()})
                                    </span>
                                </span>
                                {award.itemCount > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5" />
                                        {award.itemCount} line item{award.itemCount !== 1 ? "s" : ""}
                                    </span>
                                )}
                                {award.negotiationRounds > 0 && (
                                    <span className="flex items-center gap-1.5">
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        {award.negotiationRounds} negotiation round{award.negotiationRounds !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Value + Action */}
                        <div className="flex flex-col items-end gap-3 flex-shrink-0">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                                onClick={onView}
                            >
                                <Eye className="h-3.5 w-3.5" /> View Details
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Award Metrics Row */}
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <MetricCell
                            icon={DollarSign}
                            label="Awarded Value"
                            value={formatValue(award.awardedValue, award.currency)}
                            highlight={award.awardedValue != null}
                            color="text-emerald-700"
                            bgColor="bg-emerald-50"
                        />
                        <MetricCell
                            icon={Percent}
                            label="Allocation"
                            value={award.allocationPct != null ? `${award.allocationPct}%` : "Full Award"}
                            highlight
                            color="text-blue-700"
                            bgColor="bg-blue-50"
                        />
                        <MetricCell
                            icon={CheckCircle2}
                            label="Quote Submitted"
                            value={award.submittedAt
                                ? new Date(award.submittedAt).toLocaleDateString()
                                : "—"}
                            color="text-slate-600"
                            bgColor="bg-slate-50"
                        />
                        <MetricCell
                            icon={TrendingUp}
                            label="RFP Status"
                            value={award.rfpStatus}
                            highlight={award.rfpStatus === "AWARDED"}
                            color="text-violet-700"
                            bgColor="bg-violet-50"
                        />
                    </div>

                    {/* Notes */}
                    {award.awardNotes && (
                        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <FileText className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800">
                                <span className="font-semibold">Buyer note: </span>
                                {award.awardNotes}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function MetricCell({
    icon: Icon, label, value, highlight = false, color, bgColor
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    highlight?: boolean;
    color: string;
    bgColor: string;
}) {
    return (
        <div className={cn("rounded-lg px-3 py-2.5", highlight ? bgColor : "bg-slate-50")}>
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("h-3 w-3", highlight ? color : "text-muted-foreground")} />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                </span>
            </div>
            <p className={cn("text-sm font-bold truncate", highlight ? color : "text-slate-700")}>
                {value}
            </p>
        </div>
    );
}
