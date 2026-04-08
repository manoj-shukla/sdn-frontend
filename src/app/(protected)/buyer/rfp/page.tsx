"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    FileText, Search, Loader2, Users, Plus,
    Eye, Pencil, Trophy, BarChart2, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import type { RFP, RFPStatus } from "@/types/rfp";

const STATUS_OPTIONS: { value: RFPStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: "All Status" },
    { value: "DRAFT", label: "Draft" },
    { value: "OPEN", label: "Active" },
    { value: "CLOSED", label: "Closed" },
    { value: "AWARDED", label: "Awarded" },
];

const STATUS_STYLES: Record<RFPStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    OPEN: "bg-green-100 text-green-700 border-green-200",
    CLOSED: "bg-amber-100 text-amber-700 border-amber-200",
    AWARDED: "bg-violet-100 text-violet-700 border-violet-200",
    ARCHIVED: "bg-gray-100 text-gray-500 border-gray-200",
};

const PAGE_SIZE = 10;

function Pagination({ total, page, pageSize, onChange }: {
    total: number; page: number; pageSize: number; onChange: (p: number) => void;
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
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(page - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {pages.map((p, i) =>
                    p === "…" ? <span key={`e-${i}`} className="text-xs text-muted-foreground px-1">…</span> : (
                        <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => onChange(p as number)}>{p}</Button>
                    )
                )}
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

export default function BuyerRFPPage() {
    const router = useRouter();
    const [rfps, setRfps] = useState<RFP[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<RFPStatus | "ALL">("ALL");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchRFPs = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get("/api/rfp") as any;
                setRfps(Array.isArray(res) ? res : []);
            } catch {
                toast.error("Failed to load RFPs");
            } finally {
                setLoading(false);
            }
        };
        fetchRFPs();
    }, []);

    useEffect(() => { setPage(1); }, [search, statusFilter]);

    const filtered = useMemo(() => rfps.filter(r => {
        const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
        return matchSearch && matchStatus;
    }), [rfps, search, statusFilter]);

    const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

    const stats = [
        { label: "Total RFPs", value: rfps.length, sub: `${rfps.filter(r => r.status === "OPEN").length} active`, color: "text-indigo-600", accent: "bg-indigo-500" },
        { label: "Responses Received", value: rfps.reduce((acc, r) => acc + (r.submittedCount || 0), 0), sub: "Supplier submissions", color: "text-green-600", accent: "bg-green-500" },
        { label: "Awaiting Response", value: rfps.reduce((acc, r) => acc + Math.max(0, (r.supplierCount || 0) - (r.submittedCount || 0)), 0), sub: "Pending supplier quotes", color: "text-amber-600", accent: "bg-amber-500" },
        { label: "Awarded", value: rfps.filter(r => r.status === "AWARDED").length, sub: "Completed sourcing events", color: "text-violet-600", accent: "bg-violet-500" },
    ];

    const getDaysLeft = (deadline: string) => Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">RFQ / RFP</h1>
                        <p className="text-sm text-muted-foreground">Manage competitive sourcing events</p>
                    </div>
                </div>
                <Button onClick={() => router.push("/buyer/rfp/create")} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New RFP
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map(s => (
                    <Card key={s.label} className="relative overflow-hidden">
                        <div className={`h-0.5 ${s.accent}`} />
                        <div className="px-5 py-4">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search RFPs…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
                </div>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as RFPStatus | "ALL")}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
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
                                        <TableHead>RFP Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Suppliers</TableHead>
                                        <TableHead>Currency</TableHead>
                                        <TableHead>Deadline</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginated.map(rfp => {
                                        const daysLeft = rfp.deadline ? getDaysLeft(rfp.deadline) : null;
                                        const isUrgent = daysLeft !== null && daysLeft > 0 && daysLeft < 7;
                                        return (
                                            <TableRow key={rfp.rfpId} className="hover:bg-slate-50">
                                                <TableCell>
                                                    <div className="font-semibold text-sm">{rfp.name}</div>
                                                    {rfp.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{rfp.description}</div>}
                                                </TableCell>
                                                <TableCell className="text-sm">{rfp.category || "—"}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-[11px] ${STATUS_STYLES[rfp.status]}`}>{rfp.status}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-sm">{rfp.supplierCount ?? 0}</span>
                                                        {rfp.submittedCount > 0 && <span className="text-xs text-green-600">({rfp.submittedCount} submitted)</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm font-medium">{rfp.currency}</TableCell>
                                                <TableCell>
                                                    {rfp.deadline ? (
                                                        <div>
                                                            <div className={`text-sm ${isUrgent ? "text-amber-600 font-medium" : ""}`}>
                                                                {new Date(rfp.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                                            </div>
                                                            {daysLeft !== null && daysLeft > 0 && <div className={`text-xs ${isUrgent ? "text-amber-500" : "text-muted-foreground"}`}>{daysLeft}d left</div>}
                                                            {daysLeft !== null && daysLeft <= 0 && <div className="text-xs text-rose-500">Expired</div>}
                                                        </div>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {rfp.status === "DRAFT" ? (
                                                            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => router.push(`/buyer/rfp/${rfp.rfpId}`)}>
                                                                <Pencil className="h-3 w-3" /> Edit
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => router.push(`/buyer/rfp/${rfp.rfpId}`)}>
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </Button>
                                                                {(rfp.status === "OPEN" || rfp.status === "CLOSED") && rfp.submittedCount > 0 && (
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600" title="View Comparison" onClick={() => router.push(`/buyer/rfp/${rfp.rfpId}/comparison`)}>
                                                                        <BarChart2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                                {rfp.status === "AWARDED" && (
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-violet-600" title="View Award" onClick={() => router.push(`/buyer/rfp/${rfp.rfpId}`)}>
                                                                        <Trophy className="h-3.5 w-3.5" />
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
                                                {rfps.length === 0 ? "No RFPs yet. Click 'New RFP' to get started." : "No RFPs match your filters."}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
