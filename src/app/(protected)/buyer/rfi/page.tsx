"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RFIStatusBadge } from "@/components/rfi/RFIStatusBadge";
import { RFIProgressBar } from "@/components/rfi/RFIProgressBar";
import { ClipboardList, Plus, Search, Loader2, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { RFIEvent, RFIEventStatus } from "@/types/rfi";

const STATUS_OPTIONS: { value: RFIEventStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: "All Statuses" },
    { value: "DRAFT", label: "Draft" },
    { value: "OPEN", label: "Open" },
    { value: "CLOSED", label: "Closed" },
    { value: "CONVERTED", label: "Converted" },
];

export default function BuyerRFIDashboardPage() {
    const router = useRouter();
    const [events, setEvents] = useState<RFIEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<RFIEventStatus | "ALL">("ALL");

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get("/api/rfi/events") as any;
                console.log("[Dashboard] RFI Events Response:", res);
                const raw = res.content || (Array.isArray(res) ? res : []);
                setEvents(raw);
            } catch (err) {
                console.error("Failed to fetch RFI events", err);
                toast.error("Failed to load RFI events");
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const filtered = events.filter((e) => {
        const matchSearch =
            !search || e.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const stats = {
        total: events.length,
        open: events.filter((e) => e.status === "OPEN").length,
        draft: events.filter((e) => e.status === "DRAFT").length,
        closed: events.filter((e) => e.status === "CLOSED").length,
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 p-4 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <ClipboardList className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 data-testid="rfi-events-heading" className="text-3xl font-extrabold text-[#1e293b] tracking-tight">RFI Events</h1>
                        <p className="text-muted-foreground text-sm">Request for Information — manage and track supplier responses</p>
                    </div>
                </div>
                <Button data-testid="create-event-btn" asChild>
                    <Link href="/buyer/rfi/create">
                        <Plus className="h-4 w-4 mr-2" /> Create RFI
                    </Link>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Events", value: stats.total, color: "text-slate-700" },
                    { label: "Open", value: stats.open, color: "text-green-600" },
                    { label: "Draft", value: stats.draft, color: "text-amber-600" },
                    { label: "Closed", value: stats.closed, color: "text-slate-500" },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardHeader className="py-4 px-5">
                            <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <CardTitle>All RFI Events</CardTitle>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search events…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RFIEventStatus | "ALL")}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Suppliers</TableHead>
                                    <TableHead>Deadline</TableHead>
                                    <TableHead>Completion</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((event) => (
                                    <TableRow
                                        key={event.rfiId}
                                        data-testid={`event-card-${event.rfiId || (event as any).id}`}
                                        className="cursor-pointer hover:bg-slate-50"
                                        onClick={() => router.push(`/buyer/rfi/${event.rfiId || (event as any).id}`)}
                                    >
                                        <TableCell className="font-medium">
                                            <div>{event.title}</div>
                                            {event.description && (
                                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                                    {event.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell data-testid={`event-status-${event.rfiId || (event as any).id}`}>
                                            <RFIStatusBadge status={event.status} />
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1.5 text-sm">
                                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                {event.supplierCount ?? 0}
                                                {event.submittedCount !== undefined && (
                                                    <span className="text-muted-foreground">
                                                        / {event.submittedCount} submitted
                                                    </span>
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1.5 text-sm">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                {new Date(event.deadline).toLocaleDateString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="min-w-[140px]">
                                            <RFIProgressBar
                                                percent={event.completionPercent ?? 0}
                                                size="sm"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/buyer/rfi/${event.rfiId}`}>View</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            {events.length === 0
                                                ? "No RFI events yet. Click 'Create RFI' to get started."
                                                : "No events match your filters."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
