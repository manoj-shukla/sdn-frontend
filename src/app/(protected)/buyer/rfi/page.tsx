"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RFIStatusBadge } from "@/components/rfi/RFIStatusBadge";
import {
    ClipboardList, Search, Loader2, Users, Calendar,
    Download, Eye, Pencil, Rocket, ArrowRightCircle, Globe,
    ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import type { RFIEvent, RFIEventStatus } from "@/types/rfi";
import { exportEventsExcel } from "@/lib/rfi/export";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: RFIEventStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: "All Status" },
    { value: "DRAFT", label: "Draft" },
    { value: "OPEN", label: "Active" },
    { value: "CLOSED", label: "Closed" },
    { value: "CONVERTED", label: "Promoted" },
];

const CATEGORY_OPTIONS = [
    "All Categories", "IT Services", "Manufacturing", "Logistics", "Professional Services", "Facilities"
];

const PAGE_SIZE = 10;

// ── Pagination component ──────────────────────────────────────────────────────

function Pagination({
    total,
    page,
    pageSize,
    onChange,
}: {
    total: number;
    page: number;
    pageSize: number;
    onChange: (p: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;

    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("…");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("…");
        pages.push(totalPages);
    }

    return (
        <div className="flex items-center justify-between px-2 py-3 border-t">
            <span className="text-xs text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    disabled={page === 1}
                    onClick={() => onChange(page - 1)}
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {pages.map((p, i) =>
                    p === "…" ? (
                        <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                    ) : (
                        <Button
                            key={p}
                            variant={p === page ? "default" : "outline"}
                            size="icon"
                            className="h-7 w-7 text-xs"
                            onClick={() => onChange(p as number)}
                        >
                            {p}
                        </Button>
                    )
                )}
                <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    disabled={page === totalPages}
                    onClick={() => onChange(page + 1)}
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BuyerRFIDashboardPage() {
    const router = useRouter();
    const [events, setEvents] = useState<RFIEvent[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<RFIEventStatus | "ALL">("ALL");
    const [categoryFilter, setCategoryFilter] = useState("All Categories");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                const [eventsRes, analyticsRes] = await Promise.allSettled([
                    apiClient.get("/api/rfi/events"),
                    apiClient.get("/api/rfi/analytics/buyer"),
                ]);
                if (eventsRes.status === "fulfilled") {
                    const res = eventsRes.value as any;
                    setEvents(res.content || (Array.isArray(res) ? res : []));
                }
                if (analyticsRes.status === "fulfilled") {
                    setAnalytics(analyticsRes.value);
                }
            } catch (err) {
                console.error("Failed to fetch RFI data", err);
                toast.error("Failed to load RFI events");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter]);

    const filtered = useMemo(() => events.filter((e) => {
        const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
        const matchCategory =
            categoryFilter === "All Categories" ||
            (e as any).category?.toLowerCase() === categoryFilter.toLowerCase();
        return matchSearch && matchStatus && matchCategory;
    }), [events, search, statusFilter, categoryFilter]);

    const paginated = useMemo(
        () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filtered, page]
    );

    // Stats: use analytics API values (now includes totalSubmitted, totalAwaiting, convertedEvents)
    // Fall back to local computation from events list if analytics hasn't loaded yet
    const totalResponses: number = analytics?.totalSubmitted ?? 0;
    const awaitingSubmission: number = analytics?.totalAwaiting ?? 0;
    const promotedToRFP: number =
        analytics?.convertedEvents ?? events.filter(e => e.status === "CONVERTED").length;

    const stats = [
        {
            label: "Total Events",
            value: events.length,
            sub: `${events.filter(e => e.status === "OPEN").length} active`,
            color: "text-primary",
            accent: "bg-primary",
            icon: ClipboardList,
        },
        {
            label: "Responses Received",
            value: totalResponses,
            sub: "Supplier submissions received",
            color: "text-green-600",
            accent: "bg-green-500",
            icon: Users,
        },
        {
            label: "Awaiting Submission",
            value: awaitingSubmission,
            sub: "Pending supplier responses",
            color: "text-amber-600",
            accent: "bg-amber-500",
            icon: Calendar,
        },
        {
            label: "Promoted to RFP",
            value: promotedToRFP,
            sub: "Events converted to RFP",
            color: "text-violet-600",
            accent: "bg-violet-500",
            icon: Rocket,
        },
    ];

    const getDaysLeft = (deadline: string) => {
        const dl = new Date(deadline);
        const now = new Date();
        return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <Card key={s.label} className="relative overflow-hidden">
                        <div className={`h-0.5 ${s.accent}`} />
                        <CardHeader className="py-4 px-5">
                            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                {s.label}
                            </CardTitle>
                            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                            <p className="text-xs text-muted-foreground">{s.sub}</p>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search RFI events…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RFIEventStatus | "ALL")}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto gap-1.5"
                    disabled={events.length === 0}
                    onClick={() => {
                        exportEventsExcel(filtered.length > 0 ? filtered : events);
                        toast.success("Downloading events…");
                    }}
                >
                    <Download className="h-3.5 w-3.5" />
                    Export
                </Button>
            </div>

            {/* Events Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>RFI Title</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Suppliers</TableHead>
                                        <TableHead>Deadline</TableHead>
                                        <TableHead>Region</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginated.map((event) => {
                                        const daysLeft = event.deadline ? getDaysLeft(event.deadline) : null;
                                        const isUrgent = daysLeft !== null && daysLeft > 0 && daysLeft < 7;

                                        return (
                                            <TableRow
                                                key={event.rfiId}
                                                data-testid={`event-card-${event.rfiId || (event as any).id}`}
                                                className="hover:bg-slate-50"
                                            >
                                                {/* Title */}
                                                <TableCell className="font-medium">
                                                    <div className="font-semibold text-sm">{event.title}</div>
                                                    {event.description && (
                                                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                                                            {event.description}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Category */}
                                                <TableCell className="text-sm">
                                                    {(event as any).category || "—"}
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell data-testid={`event-status-${event.rfiId || (event as any).id}`}>
                                                    <RFIStatusBadge status={event.status} />
                                                </TableCell>

                                                {/* Suppliers — count only, no response progress */}
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-sm font-medium">{event.supplierCount ?? 0}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Deadline */}
                                                <TableCell>
                                                    {event.deadline ? (
                                                        <div>
                                                            <div className={`text-sm ${isUrgent ? "text-amber-600 font-medium" : ""}`}>
                                                                {new Date(event.deadline).toLocaleDateString("en-GB", {
                                                                    day: "2-digit", month: "short", year: "numeric"
                                                                })}
                                                            </div>
                                                            {daysLeft !== null && daysLeft > 0 && (
                                                                <div className={`text-xs ${isUrgent ? "text-amber-500" : "text-muted-foreground"}`}>
                                                                    {daysLeft}d left
                                                                </div>
                                                            )}
                                                            {daysLeft !== null && daysLeft <= 0 && (
                                                                <div className="text-xs text-rose-500">Expired</div>
                                                            )}
                                                        </div>
                                                    ) : "—"}
                                                </TableCell>

                                                {/* Region */}
                                                <TableCell>
                                                    {(event as any).region ? (
                                                        <Badge variant="outline" className="text-[10px] gap-1">
                                                            <Globe className="h-2.5 w-2.5" />
                                                            {(event as any).region}
                                                        </Badge>
                                                    ) : "—"}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {(event.status === "DRAFT" || event.status === "SCHEDULED") ? (
                                                            <Button
                                                                size="sm"
                                                                className="h-7 text-xs gap-1"
                                                                onClick={() => router.push(`/buyer/rfi/${event.rfiId || (event as any).id}`)}
                                                            >
                                                                <Pencil className="h-3 w-3" /> Continue
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    title="View"
                                                                    onClick={() => router.push(`/buyer/rfi/${event.rfiId || (event as any).id}`)}
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </Button>
                                                                {event.status === "OPEN" && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-violet-600 hover:text-violet-600"
                                                                        title="Promote to RFP"
                                                                        onClick={() => toast.info("Promote to RFP")}
                                                                    >
                                                                        <Rocket className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                                {event.status === "CONVERTED" && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 text-xs gap-1"
                                                                        onClick={() => toast.info("View RFP")}
                                                                    >
                                                                        <ArrowRightCircle className="h-3 w-3" /> View RFP
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {paginated.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                {events.length === 0
                                                    ? "No RFI events yet. Click 'New RFI Event' to get started."
                                                    : "No events match your filters."}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            <Pagination
                                total={filtered.length}
                                page={page}
                                pageSize={PAGE_SIZE}
                                onChange={setPage}
                            />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
