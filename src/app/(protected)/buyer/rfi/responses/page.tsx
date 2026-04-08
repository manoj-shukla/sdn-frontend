"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Download, ArrowLeftRight, Eye, MessageSquare, Bell, Star,
    Loader2, ClipboardList, Info, Rocket, Scale, Trophy, ArrowUpDown,
    ChevronLeft, ChevronRight, Users, CheckCircle2, AlertTriangle, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import type {
    RFIEvent, RFIEvaluation, RFIEvaluationSupplier,
    InvitationStatus, SupplierEvaluationStatus, RFITemplateSection
} from "@/types/rfi";
import {
    rankSuppliers, gradeColor, rankMedal, isManualScoreType,
    type SupplierScoreResult, type QuestionScoreBreakdown
} from "@/lib/rfi/scoring";
import { exportResponsesExcel, exportCompareExcel, exportSupplierPDF } from "@/lib/rfi/export";

// ── Pagination ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function Pagination({
    total, page, pageSize, onChange,
}: { total: number; page: number; pageSize: number; onChange: (p: number) => void }) {
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
        <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total} suppliers
            </span>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(page - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {pages.map((p, i) =>
                    p === "…" ? (
                        <span key={`e${i}`} className="text-xs text-muted-foreground px-1">…</span>
                    ) : (
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

const GRADIENT_POOL = [
    "from-blue-500 to-violet-500",
    "from-green-500 to-blue-500",
    "from-amber-500 to-red-500",
    "from-violet-500 to-green-500",
    "from-pink-500 to-rose-500",
    "from-cyan-500 to-blue-500",
];

function gradientFor(index: number): string {
    return GRADIENT_POOL[index % GRADIENT_POOL.length];
}

function mapInvStatus(status: InvitationStatus): "Submitted" | "In Progress" | "Not Started" | "Expired" {
    if (status === "SUBMITTED") return "Submitted";
    if (status === "IN_PROGRESS") return "In Progress";
    if (status === "EXPIRED") return "Expired";
    return "Not Started";
}

const STATUS_BADGE: Record<string, string> = {
    Submitted: "bg-green-50 text-green-700 border-green-200",
    "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
    "Not Started": "bg-violet-50 text-violet-700 border-violet-200",
    Expired: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_DOT: Record<string, string> = {
    Submitted: "bg-green-500",
    "In Progress": "bg-amber-500",
    "Not Started": "bg-violet-500",
    Expired: "bg-rose-500",
};

function detectRegulatory(
    supplier: RFIEvaluationSupplier,
    questionTextMap: Map<string, string>
): { gst: boolean; pan: boolean; msme: boolean } {
    let gst = false, pan = false, msme = false;
    for (const answer of supplier.answers ?? []) {
        const qText = questionTextMap.get(String(answer.questionId)) ?? "";
        const hasValue = !!answer.value &&
            (answer.value.bool === true ||
                (typeof answer.value.text === "string" && answer.value.text.trim().length > 0 && answer.value.text.toLowerCase() !== "no") ||
                (typeof answer.value.selected === "string" && answer.value.selected.length > 0) ||
                (Array.isArray(answer.value.selected) && answer.value.selected.length > 0));

        if ((qText.includes("gst") || qText.includes("gstin")) && hasValue) gst = true;
        if ((qText.includes(" pan") || qText.includes("pan ") || qText.startsWith("pan")) && hasValue) pan = true;
        if (qText.includes("msme") && hasValue) msme = true;
    }
    return { gst, pan, msme };
}

function buildQuestionTextMap(sections: RFITemplateSection[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const section of sections ?? []) {
        for (const tq of section.questions ?? []) {
            const q = tq.question;
            if (q) {
                const text = (q.text || "").toLowerCase();
                map.set(String(q.questionId), text);
            }
        }
    }
    return map;
}

// ── Score mini-bar ────────────────────────────────────────────────────────────

function ScoreBar({ score, className = "" }: { score: number | null; className?: string }) {
    if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
    const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500";
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums">{score}</span>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

function RFIResponsesPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const preselectedEventId = searchParams.get("eventId") ?? "";

    const [events, setEvents] = useState<RFIEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [promoteLoading, setPromoteLoading] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>(preselectedEventId);
    const [evaluation, setEvaluation] = useState<RFIEvaluation | null>(null);
    const [evalLoading, setEvalLoading] = useState(false);
    const [sortBy, setSortBy] = useState<"default" | "score" | "completion">("default");
    const [supplierPage, setSupplierPage] = useState(1);

    // Evaluation tab state
    const [activeMainTab, setActiveMainTab] = useState<"responses" | "evaluation">("responses");
    const [evalStatusFilter, setEvalStatusFilter] = useState<"all" | "submitted" | "shortlisted">("submitted");
    const [evalScoreFilter, setEvalScoreFilter] = useState<"all" | "scored" | "manual_pending">("all");
    const [evalSortBy, setEvalSortBy] = useState<"rank" | "completion" | "name">("rank");
    const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

    // Manual scores: supplierId → questionId → score (0–maxManualScore)
    const [manualScores, setManualScores] = useState<Record<string, Record<string, number>>>({});

    // Note dialog
    const [noteDialogOpen, setNoteDialogOpen] = useState(false);
    const [noteTarget, setNoteTarget] = useState<RFIEvaluationSupplier | null>(null);
    const [noteText, setNoteText] = useState("");
    const [noteSaving, setNoteSaving] = useState(false);

    // View dialog
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState<RFIEvaluationSupplier | null>(null);

    // Score breakdown dialog
    const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
    const [scoreTarget, setScoreTarget] = useState<{ supplier: RFIEvaluationSupplier; result: SupplierScoreResult } | null>(null);

    // Compare dialog
    const [compareDialogOpen, setCompareDialogOpen] = useState(false);

    // Reminder tracking (local only)
    const [reminded, setReminded] = useState<Set<string>>(new Set());

    // ── Fetch events ─────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const res = await apiClient.get("/api/rfi/events") as any;
                const raw: RFIEvent[] = res.content || (Array.isArray(res) ? res : []);
                const nonDraft = raw.filter((e) => e.status !== "DRAFT");
                setEvents(nonDraft);
                // Auto-select: honour query param first, then fall back to first event
                if (!preselectedEventId && nonDraft.length > 0) {
                    setSelectedEventId(String(nonDraft[0].rfiId));
                }
            } catch {
                toast.error("Failed to load events");
            } finally {
                setEventsLoading(false);
            }
        };
        load();
    }, []);

    // ── Fetch evaluation when event changes ───────────────────────────────────
    useEffect(() => {
        if (!selectedEventId) return;
        const load = async () => {
            try {
                setEvalLoading(true);
                setEvaluation(null);
                const res = await apiClient.get(`/api/rfi/events/${selectedEventId}/evaluation`) as any;
                setEvaluation(res);
            } catch {
                toast.error("Failed to load supplier responses");
            } finally {
                setEvalLoading(false);
            }
        };
        load();
    }, [selectedEventId]);

    // ── Derived data ──────────────────────────────────────────────────────────
    const questionTextMap = useMemo(
        () => buildQuestionTextMap(evaluation?.sections ?? []),
        [evaluation?.sections]
    );
    const selectedEvent = events.find((e) => String(e.rfiId) === selectedEventId);
    const allSuppliers: RFIEvaluationSupplier[] = evaluation?.suppliers ?? [];
    const sections: RFITemplateSection[] = evaluation?.sections ?? [];

    // Ranked score results (computed from real question weights + answers)
    const rankedResults = useMemo(
        () => rankSuppliers(allSuppliers, sections, manualScores),
        [allSuppliers, sections, manualScores]
    );

    const scoreMap = useMemo(() => {
        const m = new Map<string, SupplierScoreResult>();
        rankedResults.forEach((r) => m.set(r.supplierId, r));
        return m;
    }, [rankedResults]);

    // Check if any question has scoring configured
    const hasScoredQuestions = useMemo(() => {
        return sections.some((s) => s.questions.some((tq) => !!tq.question?.scoringConfig));
    }, [sections]);

    // Sorted suppliers (all shown — no status filter)
    const suppliers = useMemo(() => {
        let list = [...allSuppliers];
        if (sortBy === "score") {
            list = [...list].sort((a, b) => {
                const sa = scoreMap.get(a.supplierId)?.totalScore ?? -1;
                const sb = scoreMap.get(b.supplierId)?.totalScore ?? -1;
                return sb - sa;
            });
        } else if (sortBy === "completion") {
            list = [...list].sort((a, b) => (b.completionPercent ?? 0) - (a.completionPercent ?? 0));
        }
        return list;
    }, [allSuppliers, sortBy, scoreMap]);

    // Paginated suppliers
    const paginatedSuppliers = useMemo(
        () => suppliers.slice((supplierPage - 1) * PAGE_SIZE, supplierPage * PAGE_SIZE),
        [suppliers, supplierPage]
    );

    // Reset supplier page when event or sort changes
    useEffect(() => { setSupplierPage(1); }, [selectedEventId, sortBy]);

    const submittedSuppliers = allSuppliers.filter((s) => s.invitationStatus === "SUBMITTED");
    const shortlistedSuppliers = allSuppliers.filter((s) => s.evaluationStatus === "SHORTLISTED");

    // ── Shortlist toggle (optimistic) ─────────────────────────────────────────
    const toggleShortlist = useCallback(async (supplier: RFIEvaluationSupplier) => {
        if (supplier.invitationStatus !== "SUBMITTED") {
            toast.warning("Only submitted responses can be shortlisted");
            return;
        }
        const next: SupplierEvaluationStatus =
            supplier.evaluationStatus === "SHORTLISTED" ? "PENDING" : "SHORTLISTED";

        // Optimistic UI — update immediately
        setEvaluation((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                suppliers: prev.suppliers.map((s) =>
                    s.supplierId === supplier.supplierId ? { ...s, evaluationStatus: next } : s
                ),
            };
        });

        try {
            await apiClient.put(
                `/api/rfi/events/${selectedEventId}/evaluation/${supplier.supplierId}/status`,
                { status: next }
            );
            toast.success(
                next === "SHORTLISTED"
                    ? `${supplier.supplierName} shortlisted ⭐`
                    : `${supplier.supplierName} removed from shortlist`
            );
        } catch (err) {
            // Revert on failure
            console.error("Shortlist toggle failed:", err);
            setEvaluation((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    suppliers: prev.suppliers.map((s) =>
                        s.supplierId === supplier.supplierId
                            ? { ...s, evaluationStatus: supplier.evaluationStatus }
                            : s
                    ),
                };
            });
            toast.error("Failed to update shortlist status");
        }
    }, [selectedEventId]);

    // ── Promote to RFP ───────────────────────────────────────────────────────
    const handlePromoteToRFP = useCallback(async () => {
        if (!selectedEventId || !selectedEvent) return;
        setPromoteLoading(true);
        try {
            // If RFI is still OPEN, close it first before converting
            if (selectedEvent.status === "OPEN") {
                await apiClient.post(`/api/rfi/events/${selectedEventId}/close`);
                // Update local event status so UI reflects the change
                setEvents(prev => prev.map(e =>
                    String(e.rfiId) === selectedEventId ? { ...e, status: "CLOSED" as any } : e
                ));
            }
            // Now convert to RFP
            const result = await apiClient.post(`/api/rfi/events/${selectedEventId}/convert-to-rfp`) as any;
            const rfpDraft = result?.rfpDraft || result;
            const newRfpId = rfpDraft?.rfpId;
            const supplierCount = rfpDraft?.totalShortlisted ?? 0;
            toast.success(
                `RFP draft created with ${supplierCount} pre-invited supplier${supplierCount !== 1 ? "s" : ""}. Redirecting…`
            );
            // Navigate to the new RFP so buyer can complete and publish it
            setTimeout(() => {
                router.push(newRfpId ? `/buyer/rfp/${newRfpId}` : `/buyer/rfp`);
            }, 800);
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || "Failed to promote to RFP";
            toast.error(msg);
        } finally {
            setPromoteLoading(false);
        }
    }, [selectedEventId, selectedEvent, router]);

    // ── Save note ─────────────────────────────────────────────────────────────
    const saveNote = async () => {
        if (!noteTarget || !noteText.trim()) return;
        setNoteSaving(true);
        try {
            const res = await apiClient.post(
                `/api/rfi/events/${selectedEventId}/evaluation/${noteTarget.supplierId}/notes`,
                { text: noteText.trim() }
            ) as any;
            setEvaluation((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    suppliers: prev.suppliers.map((s) =>
                        s.supplierId === noteTarget.supplierId
                            ? { ...s, notes: res.internalNotes ?? [...(s.notes ?? []), { text: noteText.trim(), createdAt: new Date().toISOString() }] }
                            : s
                    ),
                };
            });
            setNoteDialogOpen(false);
            setNoteText("");
            toast.success("Note saved");
        } catch {
            toast.error("Failed to save note");
        } finally {
            setNoteSaving(false);
        }
    };

    // ── Manual score update ───────────────────────────────────────────────────
    const updateManualScore = (supplierId: string, questionId: string, score: number) => {
        setManualScores((prev) => ({
            ...prev,
            [supplierId]: {
                ...(prev[supplierId] ?? {}),
                [questionId]: score,
            },
        }));
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-slate-900">Supplier Responses</h2>
                    {hasScoredQuestions && (
                        <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200 gap-1">
                            <Scale className="h-2.5 w-2.5" /> Weighted Scoring Active
                        </Badge>
                    )}
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={allSuppliers.length === 0}
                    onClick={() => {
                        if (!selectedEvent) return;
                        exportResponsesExcel(selectedEvent.title, allSuppliers, sections, scoreMap);
                        toast.success("Downloading Excel…");
                    }}>
                    <Download className="h-3.5 w-3.5" /> Export Excel
                </Button>
            </div>

            {/* Event selector */}
            <div className="flex gap-3 flex-wrap">
                <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={eventsLoading}>
                    <SelectTrigger className="w-80">
                        <SelectValue placeholder={eventsLoading ? "Loading events…" : "Select an RFI event…"} />
                    </SelectTrigger>
                    <SelectContent>
                        {events.map((e) => (
                            <SelectItem key={e.rfiId} value={String(e.rfiId)}>{e.title}</SelectItem>
                        ))}
                        {events.length === 0 && !eventsLoading && (
                            <SelectItem value="none" disabled>No active events found</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Info banner */}
            {selectedEvent && (
                <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm">
                    <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>
                        <strong>{selectedEvent.title}</strong> · Deadline:{" "}
                        <strong>{selectedEvent.deadline ? new Date(selectedEvent.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Not set"}</strong>.{" "}
                        {submittedSuppliers.length} of {allSuppliers.length} suppliers responded.
                        {hasScoredQuestions && rankedResults.some(r => r.totalScore !== null) && (
                            <> Weighted scoring enabled — switch to <strong>Evaluation</strong> tab to rank and shortlist suppliers.</>
                        )}
                    </span>
                </div>
            )}

            {/* ── Main Tabs ── */}
            <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as any)}>
                <TabsList className="bg-muted/50 border">
                    <TabsTrigger value="responses" className="gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5" /> Responses
                        {allSuppliers.length > 0 && (
                            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-muted text-[10px] font-bold">{allSuppliers.length}</span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="evaluation" className="gap-1.5">
                        <Scale className="h-3.5 w-3.5" /> Evaluation
                        {submittedSuppliers.length > 0 && (
                            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-muted text-[10px] font-bold">{submittedSuppliers.length}</span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ══ RESPONSES TAB ══ */}
                <TabsContent value="responses" className="mt-4 space-y-4">
                    {/* Sort filter */}
                    <div className="flex gap-3">
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                            <SelectTrigger className="w-48">
                                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Sort: Default</SelectItem>
                                <SelectItem value="score">Sort: Highest Score</SelectItem>
                                <SelectItem value="completion">Sort: Completion %</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            {evalLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : !selectedEventId ? (
                                <div className="text-center py-16 text-muted-foreground text-sm">
                                    Select an RFI event above to view supplier responses.
                                </div>
                            ) : (
                                <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {hasScoredQuestions && <TableHead className="w-10">Rank</TableHead>}
                                            <TableHead>Supplier</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Completion</TableHead>
                                            {hasScoredQuestions && <TableHead>Score</TableHead>}
                                            <TableHead>Submitted</TableHead>
                                            <TableHead>Regulatory</TableHead>
                                            <TableHead>Shortlist</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedSuppliers.map((s, idx) => {
                                            const displayStatus = mapInvStatus(s.invitationStatus);
                                            const reg = detectRegulatory(s, questionTextMap);
                                            const hasAnyReg = reg.gst || reg.pan || reg.msme;
                                            const isShortlisted = s.evaluationStatus === "SHORTLISTED";
                                            const isReminded = reminded.has(s.supplierId);
                                            const opacity = displayStatus === "Not Started" ? "opacity-65" : "";
                                            const scoreResult = scoreMap.get(s.supplierId);

                                            return (
                                                <TableRow key={s.supplierId} className={opacity}>
                                                    {hasScoredQuestions && (
                                                        <TableCell>
                                                            <span className="text-sm">
                                                                {scoreResult?.rank && scoreResult.totalScore !== null
                                                                    ? rankMedal(scoreResult.rank)
                                                                    : <span className="text-muted-foreground text-xs">—</span>}
                                                            </span>
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br ${gradientFor(allSuppliers.indexOf(s))}`}>
                                                                {getInitials(s.supplierName)}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-sm text-slate-900">{s.supplierName}</div>
                                                                <div className="text-xs text-muted-foreground capitalize">{s.invitationStatus.toLowerCase().replace("_", " ")}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`text-xs ${STATUS_BADGE[displayStatus] ?? ""}`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 inline-block ${STATUS_DOT[displayStatus] ?? "bg-muted"}`} />
                                                            {displayStatus}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 min-w-[130px]">
                                                            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${s.completionPercent === 100 ? "bg-green-500" : s.completionPercent > 0 ? "bg-amber-500" : "bg-slate-300"}`}
                                                                    style={{ width: `${s.completionPercent ?? 0}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{s.completionPercent ?? 0}%</span>
                                                        </div>
                                                    </TableCell>
                                                    {hasScoredQuestions && (
                                                        <TableCell>
                                                            {scoreResult ? (
                                                                <div className="flex items-center gap-2">
                                                                    <ScoreBar score={scoreResult.totalScore} />
                                                                    {scoreResult.totalScore !== null && (
                                                                        <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 ${gradeColor(scoreResult.grade)}`}>
                                                                            {scoreResult.grade}
                                                                        </Badge>
                                                                    )}
                                                                    {scoreResult.pendingManualCount > 0 && (
                                                                        <span className="text-[10px] text-amber-600">+{scoreResult.pendingManualCount} manual</span>
                                                                    )}
                                                                </div>
                                                            ) : <span className="text-xs text-muted-foreground">—</span>}
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {s.submittedAt
                                                            ? new Date(s.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1 flex-wrap">
                                                            {reg.gst && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">GST ✓</Badge>}
                                                            {reg.pan && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">PAN ✓</Badge>}
                                                            {reg.msme && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">MSME ✓</Badge>}
                                                            {!hasAnyReg && displayStatus !== "Not Started" && (
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50 text-violet-700 border-violet-200">Pending</Badge>
                                                            )}
                                                            {displayStatus === "Not Started" && (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <button
                                                            onClick={() => toggleShortlist(s)}
                                                            disabled={s.invitationStatus !== "SUBMITTED"}
                                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${isShortlisted ? "bg-primary" : "bg-slate-200"}`}
                                                            title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                                                        >
                                                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${isShortlisted ? "translate-x-4" : "translate-x-0"}`} />
                                                        </button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1 flex-wrap">
                                                            {hasScoredQuestions && scoreResult && (
                                                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-violet-600 hover:text-violet-700"
                                                                    onClick={() => { setScoreTarget({ supplier: s, result: scoreResult }); setScoreDialogOpen(true); }}>
                                                                    <Scale className="h-3 w-3" /> Score
                                                                </Button>
                                                            )}
                                                            {displayStatus === "Not Started" || displayStatus === "Expired" ? (
                                                                isReminded ? (
                                                                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">✓ Reminded</Badge>
                                                                ) : (
                                                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setReminded(p => new Set([...p, s.supplierId])); toast.success(`Reminder sent to ${s.supplierName}`); }}>
                                                                        <Bell className="h-3 w-3" /> Remind
                                                                    </Button>
                                                                )
                                                            ) : displayStatus === "In Progress" ? (
                                                                <>
                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setViewTarget(s); setViewDialogOpen(true); }}>
                                                                        <Eye className="h-3 w-3" /> View
                                                                    </Button>
                                                                    {!isReminded && (
                                                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setReminded(p => new Set([...p, s.supplierId])); toast.success(`Reminder sent to ${s.supplierName}`); }}>
                                                                            <Bell className="h-3 w-3" /> Remind
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setViewTarget(s); setViewDialogOpen(true); }}>
                                                                        <Eye className="h-3 w-3" /> View
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setNoteTarget(s); setNoteText(s.notes?.[s.notes.length - 1]?.text ?? ""); setNoteDialogOpen(true); }}>
                                                                        <MessageSquare className="h-3 w-3" /> Note
                                                                        {(s.notes?.length ?? 0) > 0 && (
                                                                            <span className="ml-0.5 h-4 w-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                                                                                {s.notes.length}
                                                                            </span>
                                                                        )}
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {suppliers.length === 0 && !evalLoading && selectedEventId && (
                                            <TableRow>
                                                <TableCell colSpan={hasScoredQuestions ? 9 : 7} className="text-center py-12 text-muted-foreground">
                                                    No supplier responses found for this event.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                <Pagination
                                    total={suppliers.length}
                                    page={supplierPage}
                                    pageSize={PAGE_SIZE}
                                    onChange={setSupplierPage}
                                />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══ EVALUATION TAB ══ */}
                <TabsContent value="evaluation" className="mt-4 space-y-4">
                    {evalLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : !selectedEventId ? (
                        <div className="text-center py-24 text-muted-foreground text-sm">
                            Select an RFI event above to start evaluation.
                        </div>
                    ) : submittedSuppliers.length === 0 ? (
                        <div className="text-center py-24 text-muted-foreground text-sm">
                            No submitted responses yet. Evaluation will be available once suppliers submit.
                        </div>
                    ) : (() => {
                        // ── Evaluation derived data ──────────────────────────────
                        const evalSuppliers = (() => {
                            let list = submittedSuppliers;
                            if (evalStatusFilter === "shortlisted") list = list.filter(s => s.evaluationStatus === "SHORTLISTED");
                            if (evalScoreFilter === "scored") list = list.filter(s => scoreMap.get(s.supplierId)?.totalScore !== null);
                            if (evalScoreFilter === "manual_pending") list = list.filter(s => (scoreMap.get(s.supplierId)?.pendingManualCount ?? 0) > 0);
                            if (evalSortBy === "rank") list = [...list].sort((a, b) => (scoreMap.get(a.supplierId)?.rank ?? 99) - (scoreMap.get(b.supplierId)?.rank ?? 99));
                            if (evalSortBy === "completion") list = [...list].sort((a, b) => (b.completionPercent ?? 0) - (a.completionPercent ?? 0));
                            if (evalSortBy === "name") list = [...list].sort((a, b) => a.supplierName.localeCompare(b.supplierName));
                            return list;
                        })();

                        const avgScore = (() => {
                            const scored = rankedResults.filter(r => r.totalScore !== null && submittedSuppliers.some(s => s.supplierId === r.supplierId));
                            if (scored.length === 0) return null;
                            return Math.round(scored.reduce((sum, r) => sum + (r.totalScore ?? 0), 0) / scored.length);
                        })();
                        const pendingManualCount = submittedSuppliers.filter(s => (scoreMap.get(s.supplierId)?.pendingManualCount ?? 0) > 0).length;

                        return (
                            <>
                                {/* Summary cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: "Submitted", value: submittedSuppliers.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                                        { label: "Shortlisted", value: shortlistedSuppliers.length, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
                                        { label: "Avg Score", value: avgScore !== null ? `${avgScore}/100` : "—", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
                                        { label: "Needs Review", value: pendingManualCount, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
                                    ].map((card) => (
                                        <Card key={card.label}>
                                            <CardContent className="pt-4 pb-4 px-5">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">{card.label}</p>
                                                        <p className="text-2xl font-bold mt-0.5">{card.value}</p>
                                                    </div>
                                                    <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                                                        <card.icon className={`h-5 w-5 ${card.color}`} />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Filters + Compare action */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Select value={evalStatusFilter} onValueChange={(v) => setEvalStatusFilter(v as any)}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="submitted">All Submitted</SelectItem>
                                            <SelectItem value="shortlisted">Shortlisted Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={evalScoreFilter} onValueChange={(v) => setEvalScoreFilter(v as any)}>
                                        <SelectTrigger className="w-44">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Scores</SelectItem>
                                            <SelectItem value="scored">Has Score</SelectItem>
                                            <SelectItem value="manual_pending">Needs Manual Review</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={evalSortBy} onValueChange={(v) => setEvalSortBy(v as any)}>
                                        <SelectTrigger className="w-40">
                                            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="rank">Sort: Rank</SelectItem>
                                            <SelectItem value="completion">Sort: Completion</SelectItem>
                                            <SelectItem value="name">Sort: Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="ml-auto flex gap-2">
                                        {selectedForCompare.size >= 2 && (
                                            <Button size="sm" className="gap-1.5" onClick={() => setCompareDialogOpen(true)}>
                                                <ArrowLeftRight className="h-3.5 w-3.5" /> Compare Selected ({selectedForCompare.size})
                                            </Button>
                                        )}
                                        {selectedForCompare.size === 1 && (
                                            <p className="text-xs text-muted-foreground self-center">Select 1 more to compare</p>
                                        )}
                                    </div>
                                </div>

                                {/* Evaluation Table */}
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-8">
                                                        <Checkbox
                                                            checked={evalSuppliers.length > 0 && evalSuppliers.every(s => selectedForCompare.has(s.supplierId))}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) setSelectedForCompare(new Set(evalSuppliers.map(s => s.supplierId)));
                                                                else setSelectedForCompare(new Set());
                                                            }}
                                                        />
                                                    </TableHead>
                                                    <TableHead className="w-12">Rank</TableHead>
                                                    <TableHead>Supplier</TableHead>
                                                    <TableHead>Weighted Score</TableHead>
                                                    <TableHead>Completion</TableHead>
                                                    <TableHead>Regulatory</TableHead>
                                                    <TableHead>Shortlist</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {evalSuppliers.map((s) => {
                                                    const sr = scoreMap.get(s.supplierId);
                                                    const isShortlisted = s.evaluationStatus === "SHORTLISTED";
                                                    const isChecked = selectedForCompare.has(s.supplierId);
                                                    const reg = detectRegulatory(s, questionTextMap);

                                                    return (
                                                        <TableRow key={s.supplierId} className={isChecked ? "bg-primary/5" : ""}>
                                                            {/* Compare checkbox */}
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    onCheckedChange={(checked) => {
                                                                        const next = new Set(selectedForCompare);
                                                                        if (checked) next.add(s.supplierId);
                                                                        else next.delete(s.supplierId);
                                                                        setSelectedForCompare(next);
                                                                    }}
                                                                />
                                                            </TableCell>

                                                            {/* Rank */}
                                                            <TableCell>
                                                                <span className="text-base">
                                                                    {sr?.rank && sr.totalScore !== null ? rankMedal(sr.rank) : <span className="text-muted-foreground text-xs">—</span>}
                                                                </span>
                                                            </TableCell>

                                                            {/* Supplier */}
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br ${gradientFor(allSuppliers.indexOf(s))}`}>
                                                                        {getInitials(s.supplierName)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-semibold text-sm text-slate-900">{s.supplierName}</div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {s.submittedAt ? `Submitted ${new Date(s.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : "Submitted"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>

                                                            {/* Weighted Score */}
                                                            <TableCell>
                                                                {sr ? (
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className={`h-full rounded-full ${(sr.totalScore ?? 0) >= 80 ? "bg-green-500" : (sr.totalScore ?? 0) >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                                                                                        style={{ width: `${sr.totalScore ?? 0}%` }}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-sm font-bold tabular-nums">{sr.totalScore ?? "—"}</span>
                                                                            </div>
                                                                            {sr.pendingManualCount > 0 && (
                                                                                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                                                                    <AlertTriangle className="h-2.5 w-2.5" /> {sr.pendingManualCount} pending manual
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {sr.totalScore !== null && (
                                                                            <Badge variant="outline" className={`text-xs font-bold ${gradeColor(sr.grade)}`}>{sr.grade}</Badge>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic">No scoring configured</span>
                                                                )}
                                                            </TableCell>

                                                            {/* Completion */}
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.completionPercent ?? 0}%` }} />
                                                                    </div>
                                                                    <span className="text-xs font-medium">{s.completionPercent ?? 0}%</span>
                                                                </div>
                                                            </TableCell>

                                                            {/* Regulatory */}
                                                            <TableCell>
                                                                <div className="flex gap-1 flex-wrap">
                                                                    {reg.gst && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">GST ✓</Badge>}
                                                                    {reg.pan && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">PAN ✓</Badge>}
                                                                    {reg.msme && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">MSME ✓</Badge>}
                                                                    {!reg.gst && !reg.pan && !reg.msme && <span className="text-xs text-muted-foreground">—</span>}
                                                                </div>
                                                            </TableCell>

                                                            {/* Shortlist toggle */}
                                                            <TableCell>
                                                                <button
                                                                    onClick={() => toggleShortlist(s)}
                                                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${isShortlisted ? "bg-primary" : "bg-slate-200"}`}
                                                                    title={isShortlisted ? "Remove from shortlist" : "Shortlist this supplier"}
                                                                >
                                                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${isShortlisted ? "translate-x-4" : "translate-x-0"}`} />
                                                                </button>
                                                            </TableCell>

                                                            {/* Actions */}
                                                            <TableCell>
                                                                <div className="flex gap-1">
                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                                                                        onClick={() => { setViewTarget(s); setViewDialogOpen(true); }}>
                                                                        <Eye className="h-3 w-3" /> View
                                                                    </Button>
                                                                    {sr && (
                                                                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-violet-600 hover:text-violet-700"
                                                                            onClick={() => { setScoreTarget({ supplier: s, result: sr }); setScoreDialogOpen(true); }}>
                                                                            <Scale className="h-3 w-3" /> Score
                                                                        </Button>
                                                                    )}
                                                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                                                                        onClick={() => { setNoteTarget(s); setNoteText(s.notes?.[s.notes.length - 1]?.text ?? ""); setNoteDialogOpen(true); }}>
                                                                        <MessageSquare className="h-3 w-3" /> Note
                                                                        {(s.notes?.length ?? 0) > 0 && (
                                                                            <span className="ml-0.5 h-4 w-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                                                                                {s.notes.length}
                                                                            </span>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                                {evalSuppliers.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                                            No suppliers match the selected filters.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* Shortlisted Panel */}
                                <Card>
                                    <CardHeader className="py-3 px-5 border-b bg-amber-50/50">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <Star className="h-4 w-4 text-amber-500" />
                                                Shortlisted for RFP ({shortlistedSuppliers.length})
                                            </CardTitle>
                                            <Button
                                                size="sm"
                                                className="gap-1.5 h-8"
                                                disabled={shortlistedSuppliers.length === 0 || promoteLoading || selectedEvent?.status === "CONVERTED"}
                                                onClick={handlePromoteToRFP}
                                                title={
                                                    selectedEvent?.status === "CONVERTED"
                                                        ? "Already promoted to RFP"
                                                        : shortlistedSuppliers.length === 0
                                                        ? "Shortlist at least one supplier first"
                                                        : selectedEvent?.status === "OPEN"
                                                        ? "Will close RFI then create RFP draft"
                                                        : "Create RFP draft from shortlisted suppliers"
                                                }
                                            >
                                                {promoteLoading
                                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    : <Rocket className="h-3.5 w-3.5" />
                                                }
                                                {selectedEvent?.status === "CONVERTED" ? "Already Promoted" : "Promote to RFP"}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-4 px-5">
                                        {shortlistedSuppliers.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {shortlistedSuppliers.map((s) => {
                                                    const sr = scoreMap.get(s.supplierId);
                                                    return (
                                                        <div key={s.supplierId} className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs shadow-sm">
                                                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br ${gradientFor(allSuppliers.indexOf(s))}`}>
                                                                {getInitials(s.supplierName)}
                                                            </div>
                                                            <span className="font-semibold text-slate-800">{s.supplierName}</span>
                                                            {sr?.totalScore !== null && sr?.totalScore !== undefined && (
                                                                <Badge variant="outline" className={`text-[10px] font-bold ${gradeColor(sr.grade)}`}>{sr.totalScore} pts</Badge>
                                                            )}
                                                            {sr?.rank && sr.totalScore !== null && (
                                                                <span>{rankMedal(sr.rank)}</span>
                                                            )}
                                                            <button className="text-muted-foreground hover:text-rose-500 ml-1 text-[10px]"
                                                                onClick={() => toggleShortlist(s)}>✕</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                No suppliers shortlisted yet. Toggle the shortlist switch next to a supplier above.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        );
                    })()}
                </TabsContent>
            </Tabs>

            {/* ── Score Breakdown Dialog ────────────────────────────────────── */}
            <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-violet-600" />
                            Score Breakdown — {scoreTarget?.supplier.supplierName}
                        </DialogTitle>
                    </DialogHeader>
                    {scoreTarget && (
                        <div className="space-y-4 py-2">
                            {/* Total score summary */}
                            <div className="flex items-center gap-4 rounded-lg border bg-violet-50/60 p-4">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-violet-700">
                                        {scoreTarget.result.totalScore ?? "—"}
                                    </div>
                                    <div className="text-xs text-violet-500 font-medium">/ 100</div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge className={`text-sm font-bold px-2 ${gradeColor(scoreTarget.result.grade)}`}>
                                            Grade: {scoreTarget.result.grade}
                                        </Badge>
                                        {scoreTarget.result.rank && scoreTarget.result.totalScore !== null && (
                                            <span className="text-lg">{rankMedal(scoreTarget.result.rank)}</span>
                                        )}
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${(scoreTarget.result.totalScore ?? 0) >= 80 ? "bg-green-500" : (scoreTarget.result.totalScore ?? 0) >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                                            style={{ width: `${scoreTarget.result.totalScore ?? 0}%` }}
                                        />
                                    </div>
                                    {scoreTarget.result.pendingManualCount > 0 && (
                                        <p className="text-xs text-amber-600 mt-1.5">
                                            ⚠ {scoreTarget.result.pendingManualCount} question(s) require manual scoring — final score may increase.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Per-question breakdown */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Question-by-Question Breakdown</p>
                                <div className="space-y-2">
                                    {scoreTarget.result.breakdown.map((b) => {
                                        const currentManual = manualScores[scoreTarget.supplier.supplierId]?.[b.questionId];
                                        const maxManual = sections
                                            .flatMap(s => s.questions)
                                            .find(tq => String(tq.question?.questionId) === b.questionId)
                                            ?.question?.scoringConfig?.maxManualScore ?? 100;

                                        return (
                                            <div key={b.questionId} className="rounded-lg border bg-muted/20 p-3">
                                                <div className="flex items-start gap-3">
                                                    {/* Weight badge */}
                                                    <div className="shrink-0 mt-0.5">
                                                        <span className="text-[10px] font-bold bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">
                                                            W:{b.weight}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 mb-1.5 leading-snug">{b.questionText}</p>
                                                        <div className="flex items-center gap-3">
                                                            {b.isManual ? (
                                                                /* Manual scoring input */
                                                                <div className="flex items-center gap-2">
                                                                    <Label className="text-xs text-muted-foreground shrink-0">Manual score (0–{maxManual}):</Label>
                                                                    <Input
                                                                        type="number" min={0} max={maxManual}
                                                                        value={currentManual ?? ""}
                                                                        onChange={(e) => {
                                                                            const v = e.target.value === "" ? undefined : Math.min(maxManual, Math.max(0, +e.target.value));
                                                                            if (v !== undefined) {
                                                                                updateManualScore(scoreTarget.supplier.supplierId, b.questionId, v);
                                                                            }
                                                                        }}
                                                                        className="w-20 h-7 text-xs"
                                                                        placeholder="0"
                                                                    />
                                                                    {currentManual !== undefined && (
                                                                        <span className="text-xs text-green-600 font-medium">
                                                                            → {Math.round((currentManual / maxManual) * 100)} pts
                                                                        </span>
                                                                    )}
                                                                    {currentManual === undefined && (
                                                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                                                                    )}
                                                                </div>
                                                            ) : b.isUnanswered ? (
                                                                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">Unanswered</Badge>
                                                            ) : b.rawScore !== null ? (
                                                                <div className="flex items-center gap-2">
                                                                    <ScoreBar score={b.rawScore} />
                                                                    <span className="text-xs text-muted-foreground">
                                                                        (contributes {b.weightedContribution.toFixed(1)} weighted pts)
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">No score rule matched</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {scoreTarget.result.breakdown.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No scored questions configured for this RFI. Add weights and scoring rules in the Question Library.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setScoreDialogOpen(false)}>Close</Button>
                        {scoreTarget?.result.pendingManualCount === 0 && scoreTarget?.result.totalScore !== null && (
                            <Button
                                variant="outline"
                                onClick={() => { toggleShortlist(scoreTarget.supplier); setScoreDialogOpen(false); }}
                            >
                                <Star className="h-3.5 w-3.5 mr-1.5" />
                                {scoreTarget.supplier.evaluationStatus === "SHORTLISTED" ? "Remove from Shortlist" : "Shortlist Supplier"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Note Dialog ──────────────────────────────────────────────── */}
            <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Internal Note — {noteTarget?.supplierName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {(noteTarget?.notes?.length ?? 0) > 0 && (
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {noteTarget!.notes.map((n, i) => (
                                    <div key={i} className="bg-muted/50 rounded px-3 py-2 text-xs">
                                        <p className="text-slate-700">{n.text}</p>
                                        {n.createdAt && (
                                            <p className="text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div>
                            <Label>Add Note <span className="text-muted-foreground text-xs">(internal only)</span></Label>
                            <Textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Internal notes visible only to buyer team…"
                                className="mt-1.5 min-h-[90px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveNote} disabled={!noteText.trim() || noteSaving}>
                            {noteSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                            Save Note
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── View Response Dialog ──────────────────────────────────────── */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            {viewTarget?.supplierName} — Response
                        </DialogTitle>
                    </DialogHeader>
                    {viewTarget && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3 pb-4 border-b">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-base font-bold text-white bg-gradient-to-br ${gradientFor(allSuppliers.indexOf(viewTarget))}`}>
                                    {getInitials(viewTarget.supplierName)}
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">{viewTarget.supplierName}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {viewTarget.submittedAt ? `Submitted ${new Date(viewTarget.submittedAt).toLocaleDateString()}` : mapInvStatus(viewTarget.invitationStatus)}
                                    </div>
                                </div>
                                <Badge variant="outline" className={STATUS_BADGE[mapInvStatus(viewTarget.invitationStatus)] ?? ""}>
                                    {mapInvStatus(viewTarget.invitationStatus)}
                                </Badge>
                                {hasScoredQuestions && scoreMap.get(viewTarget.supplierId)?.totalScore !== null && (
                                    <Badge variant="outline" className={`text-sm font-bold ${gradeColor(scoreMap.get(viewTarget.supplierId)!.grade)}`}>
                                        {scoreMap.get(viewTarget.supplierId)!.totalScore} pts
                                    </Badge>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                    <span>Completion</span>
                                    <span>{viewTarget.completionPercent ?? 0}%</span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${(viewTarget.completionPercent ?? 0) === 100 ? "bg-green-500" : "bg-amber-500"}`}
                                        style={{ width: `${viewTarget.completionPercent ?? 0}%` }}
                                    />
                                </div>
                            </div>

                            {(viewTarget.answers?.length ?? 0) > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Answers ({viewTarget.answers.length} responses)</p>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {viewTarget.answers.slice(0, 10).map((a, i) => {
                                            const qText = questionTextMap.get(String(a.questionId));
                                            const val = a.value?.text || a.value?.selected || (a.value?.bool !== undefined ? (a.value.bool ? "Yes" : "No") : null);
                                            if (!qText && !val) return null;
                                            return (
                                                <div key={i} className="bg-muted/30 rounded px-3 py-2">
                                                    {qText && <p className="text-xs text-muted-foreground mb-0.5 capitalize">{qText}</p>}
                                                    {val && <p className="text-sm font-medium">{Array.isArray(val) ? val.join(", ") : String(val)}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {(viewTarget.notes?.length ?? 0) > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Internal Notes</p>
                                    <div className="space-y-1.5">
                                        {viewTarget.notes.map((n, i) => (
                                            <div key={i} className="bg-amber-50 border border-amber-100 rounded px-3 py-2 text-xs text-slate-700">
                                                {n.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
                        <Button variant="outline" onClick={async () => {
                            if (!viewTarget) return;
                            toast.info("Generating PDF…");
                            await exportSupplierPDF(viewTarget, sections, scoreMap.get(viewTarget.supplierId), selectedEvent?.title);
                        }}>
                            <Download className="h-3.5 w-3.5 mr-1.5" /> Export PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Compare Dialog ────────────────────────────────────────────── */}
            <Dialog open={compareDialogOpen} onOpenChange={(open) => { setCompareDialogOpen(open); if (!open) setSelectedForCompare(new Set()); }}>
                <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-4 w-4" />
                            Side-by-Side Evaluation — {selectedForCompare.size} Suppliers
                        </DialogTitle>
                    </DialogHeader>
                    {(() => {
                        const compareList = allSuppliers.filter(s => selectedForCompare.has(s.supplierId));
                        return (
                        <div className="overflow-x-auto py-2">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left py-2 px-3 bg-muted text-xs font-semibold text-muted-foreground min-w-[180px] sticky left-0 z-10">Criterion</th>
                                    {compareList.map((s) => (
                                        <th key={s.supplierId} className="py-2 px-3 bg-muted text-xs font-semibold text-left min-w-[160px]">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br ${gradientFor(allSuppliers.indexOf(s))}`}>
                                                    {getInitials(s.supplierName)}
                                                </div>
                                                <span>{s.supplierName}</span>
                                                {s.evaluationStatus === "SHORTLISTED" && <Star className="h-3 w-3 text-amber-500" />}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {hasScoredQuestions && (
                                    <tr className="border-b bg-violet-50/40">
                                        <td className="py-2.5 px-3 text-xs font-semibold text-violet-700 sticky left-0 bg-violet-50/40">
                                            <div className="flex items-center gap-1"><Scale className="h-3 w-3" /> Weighted Score</div>
                                        </td>
                                        {compareList.map((s) => {
                                            const sr = scoreMap.get(s.supplierId);
                                            return (
                                                <td key={s.supplierId} className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-base">{sr?.totalScore ?? "—"}</span>
                                                        {sr?.grade && sr.totalScore !== null && (
                                                            <Badge variant="outline" className={`text-xs ${gradeColor(sr.grade)}`}>{sr.grade}</Badge>
                                                        )}
                                                        {sr?.rank && sr.totalScore !== null && <span className="text-base">{rankMedal(sr.rank)}</span>}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                                <tr className="border-b">
                                    <td className="py-2.5 px-3 text-xs text-muted-foreground sticky left-0 bg-background">Completion</td>
                                    {compareList.map((s) => (
                                        <td key={s.supplierId} className="py-2 px-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${(s.completionPercent ?? 0) === 100 ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${s.completionPercent ?? 0}%` }} />
                                                </div>
                                                <span className="text-xs font-medium">{s.completionPercent ?? 0}%</span>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2 px-3 text-xs text-muted-foreground sticky left-0 bg-background">Submitted</td>
                                    {compareList.map((s) => (
                                        <td key={s.supplierId} className="py-2 px-3 text-xs">
                                            {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b bg-amber-50/30">
                                    <td className="py-2 px-3 text-xs font-semibold text-amber-700 sticky left-0 bg-amber-50/30">Shortlisted</td>
                                    {compareList.map((s) => (
                                        <td key={s.supplierId} className="py-2 px-3 text-xs">
                                            {s.evaluationStatus === "SHORTLISTED"
                                                ? <span className="text-amber-600 font-semibold flex items-center gap-1"><Star className="h-3 w-3" /> Yes</span>
                                                : <span className="text-muted-foreground">—</span>}
                                        </td>
                                    ))}
                                </tr>
                                {/* Separator */}
                                <tr>
                                    <td colSpan={compareList.length + 1} className="py-1.5 px-3 bg-muted/50">
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Question Responses</span>
                                    </td>
                                </tr>
                                {(evaluation?.sections ?? []).flatMap(sec => sec.questions ?? []).map((tq) => {
                                    const qText = tq.question?.text || `Q-${tq.questionId}`;
                                    const weight = tq.question?.weight;
                                    return (
                                        <tr key={String(tq.questionId)} className="border-b hover:bg-muted/20">
                                            <td className="py-2.5 px-3 text-xs text-slate-700 sticky left-0 bg-background max-w-[180px]">
                                                <p className="font-medium leading-snug line-clamp-2" title={qText}>{qText}</p>
                                                {weight && <span className="text-[10px] text-violet-600 font-semibold">W:{weight}</span>}
                                            </td>
                                            {compareList.map((s) => {
                                                const ans = s.answers?.find((a) => String(a.questionId) === String(tq.question?.questionId || tq.questionId));
                                                const val = ans?.value?.text || ans?.value?.selected || (ans?.value?.bool !== undefined ? (ans.value.bool ? "Yes" : "No") : null);
                                                return (
                                                    <td key={s.supplierId} className="py-2.5 px-3 text-xs align-top">
                                                        {val
                                                            ? <span className="text-slate-800">{Array.isArray(val) ? val.join(", ") : String(val)}</span>
                                                            : <span className="text-muted-foreground italic">No answer</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                        );
                    })()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setCompareDialogOpen(false); setSelectedForCompare(new Set()); }}>Close</Button>
                        <Button variant="outline" onClick={() => {
                            const compareList = allSuppliers.filter(s => selectedForCompare.has(s.supplierId));
                            exportCompareExcel(selectedEvent?.title ?? "RFI", compareList, sections, scoreMap);
                            toast.success("Downloading comparison…");
                        }}>
                            <Download className="h-3.5 w-3.5 mr-1.5" /> Export Excel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function RFIResponsesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>}>
            <RFIResponsesPageInner />
        </Suspense>
    );
}
