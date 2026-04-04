"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, BarChart3, TrendingUp, Clock, Users, Rocket, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";
import type { RFIEvent } from "@/types/rfi";
import { exportAnalyticsExcel } from "@/lib/rfi/export";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BuyerAnalyticsAPI {
    buyerId?: number;
    totalRFIs?: number;
    totalEvents?: number;
    totalSuppliersParticipated?: number;
    avgCompletionRate?: number;
    avgResponseRate?: number;
    certificationCoverage?: number;
    events?: any[];
}

interface EventMetricsAPI {
    rfiId: number;
    title?: string;
    status?: string;
    totalInvited?: number;
    totalSubmitted?: number;
    totalInProgress?: number;
    completionRate?: number;
    avgTimeToSubmitSecs?: number;
    participationRate?: number;
}

interface MonthDataPoint {
    month: string;
    pct: number;
    color: string;
}

interface CategoryDataPoint {
    cat: string;
    count: number;
    color: string;
}

interface ProgressRowData {
    label: string;
    pct: number;
    color: string;
}

const CATEGORY_COLORS = [
    "bg-primary",
    "bg-violet-500",
    "bg-green-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
];

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Bar chart component ───────────────────────────────────────────────────────
function BarChart({
    data,
    maxValue,
    valueKey,
    labelKey,
    colorKey,
    height = 100,
    suffix = "",
}: {
    data: any[];
    maxValue: number;
    valueKey: string;
    labelKey: string;
    colorKey: string;
    height?: number;
    suffix?: string;
}) {
    if (!data.length) {
        return (
            <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
                No data available
            </div>
        );
    }
    return (
        <div className="flex items-end gap-3 pt-2" style={{ height }}>
            {data.map((item, i) => {
                const v = item[valueKey];
                const barH = maxValue > 0 ? Math.round((v / maxValue) * (height - 36)) : 0;
                return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                            {typeof v === "number" ? `${v}${suffix}` : v}
                        </span>
                        <div
                            className={`w-full rounded-t-sm min-h-[4px] ${item[colorKey]}`}
                            style={{ height: Math.max(barH, 4) }}
                        />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap truncate w-full text-center">
                            {item[labelKey]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ── Progress bar row ──────────────────────────────────────────────────────────
function ProgressRow({ label, pct, color }: { label: string; pct: number; color: string }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupEventsByMonth(events: RFIEvent[]): MonthDataPoint[] {
    const map = new Map<string, { sum: number; count: number }>();

    events.forEach((e) => {
        const d = new Date(e.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const label = MONTH_ABBR[d.getMonth()];
        if (!map.has(key)) map.set(key, { sum: 0, count: 0 });
        const entry = map.get(key)!;
        entry.sum += e.completionPercent ?? 0;
        entry.count += 1;
        // Store label in key for later retrieval
        (map as any).labels = (map as any).labels || {};
        (map as any).labels[key] = label;
    });

    // Sort by date key and take last 6 months
    const sorted = Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6);

    return sorted.map(([key, val], i) => {
        const [year, month] = key.split("-");
        return {
            month: MONTH_ABBR[parseInt(month)],
            pct: val.count > 0 ? Math.round(val.sum / val.count) : 0,
            color: "bg-primary",
        };
    });
}

function groupEventsByCategory(events: RFIEvent[]): CategoryDataPoint[] {
    const map = new Map<string, number>();

    events.forEach((e) => {
        const cat = (e as any).category || "Other";
        map.set(cat, (map.get(cat) ?? 0) + 1);
    });

    return Array.from(map.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([cat, count], i) => ({
            cat: cat.length > 10 ? cat.slice(0, 8) + "…" : cat,
            count,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        }));
}

function computeEventStatusRows(events: RFIEvent[]): ProgressRowData[] {
    const total = events.length;
    if (total === 0) return [];

    const open = events.filter((e) => e.status === "OPEN").length;
    const closed = events.filter((e) => e.status === "CLOSED").length;
    const converted = events.filter((e) => e.status === "CONVERTED").length;
    const draft = events.filter((e) => e.status === "DRAFT").length;

    return [
        { label: "Active (Open)", pct: Math.round((open / total) * 100), color: "bg-primary" },
        { label: "Closed", pct: Math.round((closed / total) * 100), color: "bg-slate-400" },
        { label: "Promoted to RFP", pct: Math.round((converted / total) * 100), color: "bg-violet-500" },
        { label: "Draft", pct: Math.round((draft / total) * 100), color: "bg-amber-400" },
    ].filter((r) => r.pct > 0);
}

function computeResponseRows(events: RFIEvent[]): ProgressRowData[] {
    const totalSuppliers = events.reduce((sum, e) => sum + (e.supplierCount ?? 0), 0);
    const totalSubmitted = events.reduce((sum, e) => sum + (e.submittedCount ?? 0), 0);
    const totalInvited = totalSuppliers;

    if (totalInvited === 0) return [];

    const submittedPct = Math.round((totalSubmitted / totalInvited) * 100);
    const pendingPct = 100 - submittedPct;

    return [
        { label: "Submitted", pct: submittedPct, color: "bg-green-500" },
        { label: "Pending / In Progress", pct: pendingPct, color: "bg-amber-500" },
    ];
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RFIAnalyticsPage() {
    const [period, setPeriod] = useState("6m");
    const [loading, setLoading] = useState(true);
    const [buyerAnalytics, setBuyerAnalytics] = useState<BuyerAnalyticsAPI | null>(null);
    const [events, setEvents] = useState<RFIEvent[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [analyticsRes, eventsRes] = await Promise.all([
                apiClient.get("/api/rfi/analytics/buyer") as Promise<any>,
                apiClient.get("/api/rfi/events") as Promise<any>,
            ]);

            setBuyerAnalytics(analyticsRes as BuyerAnalyticsAPI);

            const rawEvents: RFIEvent[] = eventsRes.content || (Array.isArray(eventsRes) ? eventsRes : []);

            // Filter by period
            const now = new Date();
            const monthsBack = period === "3m" ? 3 : period === "6m" ? 6 : 12;
            const cutoff = new Date(now);
            cutoff.setMonth(cutoff.getMonth() - monthsBack);

            const filtered = rawEvents.filter((e) => new Date(e.createdAt) >= cutoff);
            setEvents(filtered.length > 0 ? filtered : rawEvents); // fallback to all if filter returns nothing
        } catch (err) {
            console.error("Failed to load analytics", err);
            toast.error("Failed to load analytics data");
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Derived values ─────────────────────────────────────────────────────────
    const analytics = buyerAnalytics as any;
    const totalRFIs = analytics?.totalRFIs ?? analytics?.totalEvents ?? events.length;
    const avgCompletionRate = analytics?.avgCompletionRate ?? analytics?.avgResponseRate ?? 0;
    const totalSuppliersParticipated = analytics?.totalSuppliersParticipated ?? 0;
    const certCoverage = analytics?.certificationCoverage ?? 0;
    const convertedCount = events.filter((e) => e.status === "CONVERTED").length;
    const rfpRate = totalRFIs > 0 ? Math.round((convertedCount / totalRFIs) * 100) : 0;

    const stats = [
        {
            label: "AVG COMPLETION RATE",
            value: `${Math.round(avgCompletionRate)}%`,
            sub: `Across ${totalRFIs} RFI events`,
            color: "text-primary",
            accent: "bg-primary",
            icon: TrendingUp,
        },
        {
            label: "TOTAL RFI EVENTS",
            value: String(totalRFIs),
            sub: `${events.filter((e) => e.status === "OPEN").length} currently active`,
            color: "text-green-600",
            accent: "bg-green-500",
            icon: Clock,
        },
        {
            label: "SUPPLIER PARTICIPATION",
            value: String(totalSuppliersParticipated),
            sub: "Total suppliers participated",
            color: "text-amber-600",
            accent: "bg-amber-500",
            icon: Users,
        },
        {
            label: "RFI → RFP RATE",
            value: `${rfpRate}%`,
            sub: `${convertedCount} events promoted`,
            color: "text-violet-600",
            accent: "bg-violet-500",
            icon: Rocket,
        },
    ];

    // Charts data
    const completionByMonth = groupEventsByMonth(events);
    const eventsByCategory = groupEventsByCategory(events);
    const eventStatusRows = computeEventStatusRows(events);
    const responseRows = computeResponseRows(events);
    const certRows: ProgressRowData[] = certCoverage > 0
        ? [{ label: "Certified Suppliers", pct: Math.round(certCoverage), color: "bg-green-500" }]
        : [];

    const maxMonth = completionByMonth.length > 0 ? Math.max(...completionByMonth.map((d) => d.pct), 1) : 100;
    const maxCat = eventsByCategory.length > 0 ? Math.max(...eventsByCategory.map((d) => d.count), 1) : 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-slate-900">RFI Analytics &amp; Reporting</h2>
                </div>
                <div className="flex gap-3">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="3m">Last 3 Months</SelectItem>
                            <SelectItem value="6m">Last 6 Months</SelectItem>
                            <SelectItem value="1y">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={loading || events.length === 0}
                        onClick={() => {
                            exportAnalyticsExcel({
                                period,
                                events,
                                stats,
                                completionByMonth,
                                eventsByCategory,
                                eventStatusRows,
                                responseRows,
                            });
                            toast.success("Downloading analytics report…");
                        }}
                    >
                        <Download className="h-3.5 w-3.5" /> Export Report
                    </Button>
                </div>
            </div>

            {/* Loading state */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.map((s) => (
                            <Card key={s.label} className="relative overflow-hidden">
                                <div className={`h-0.5 ${s.accent}`} />
                                <CardContent className="pt-4 pb-4 px-5">
                                    <p className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase mb-2">
                                        {s.label}
                                    </p>
                                    <p className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</p>
                                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Completion Rate by Month */}
                        <Card>
                            <CardHeader className="pb-2 border-b bg-muted/20">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    Avg Completion Rate by Month
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {completionByMonth.length === 0 ? (
                                    <div className="flex items-center justify-center text-sm text-muted-foreground h-[130px]">
                                        No event data available for this period
                                    </div>
                                ) : (
                                    <BarChart
                                        data={completionByMonth}
                                        maxValue={maxMonth}
                                        valueKey="pct"
                                        labelKey="month"
                                        colorKey="color"
                                        height={130}
                                        suffix="%"
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* Events by Category */}
                        <Card>
                            <CardHeader className="pb-2 border-b bg-muted/20">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                    Events by Category
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {eventsByCategory.length === 0 ? (
                                    <div className="flex items-center justify-center text-sm text-muted-foreground h-[130px]">
                                        No category data available
                                    </div>
                                ) : (
                                    <BarChart
                                        data={eventsByCategory}
                                        maxValue={maxCat}
                                        valueKey="count"
                                        labelKey="cat"
                                        colorKey="color"
                                        height={130}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* RFI Overview Distribution */}
                    <Card>
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                RFI Overview Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Event Status */}
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-4">Event Status Breakdown</p>
                                    {eventStatusRows.length > 0 ? (
                                        <div className="space-y-4">
                                            {eventStatusRows.map((d) => (
                                                <ProgressRow key={d.label} label={d.label} pct={d.pct} color={d.color} />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">No events in this period</p>
                                    )}
                                </div>

                                {/* Response Status */}
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-4">Supplier Response Status</p>
                                    {responseRows.length > 0 ? (
                                        <div className="space-y-4">
                                            {responseRows.map((d) => (
                                                <ProgressRow key={d.label} label={d.label} pct={d.pct} color={d.color} />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">No supplier data available</p>
                                    )}
                                </div>

                                {/* Certification Coverage */}
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-4">Certification Coverage</p>
                                    {certRows.length > 0 ? (
                                        <div className="space-y-4">
                                            {certRows.map((d) => (
                                                <ProgressRow key={d.label} label={d.label} pct={d.pct} color={d.color} />
                                            ))}
                                            <div className="pt-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {Math.round(certCoverage)}% of participating suppliers have verified certifications
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">No certification data available</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
