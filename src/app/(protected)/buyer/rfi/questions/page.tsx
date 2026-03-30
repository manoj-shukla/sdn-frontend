"use client";

import { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/store/auth-store";
import {
    HelpCircle, Plus, Search, Loader2, Pencil, Trash2, Filter,
    Globe, GripVertical, Eye, Scale, ChevronDown, ChevronRight, Info,
    ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import type {
    RFIQuestion, QuestionType, CreateRFIQuestionPayload,
    QuestionScoringConfig, ScoringOptionRule, ScoringNumericRange
} from "@/types/rfi";
import { isManualScoreType } from "@/lib/rfi/scoring";

// ── Pagination ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

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
        <div className="flex items-center justify-between px-1 py-3 border-t mt-2">
            <span className="text-xs text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
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

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
    { value: "SHORT_TEXT", label: "Short Text" },
    { value: "LONG_TEXT", label: "Long Text" },
    { value: "YES_NO", label: "Yes / No" },
    { value: "SINGLE_SELECT", label: "Single Select" },
    { value: "MULTI_SELECT", label: "Multi Select" },
    { value: "NUMERIC", label: "Numeric" },
    { value: "ATTACHMENT", label: "File Attachment" },
    { value: "TABLE", label: "Table" },
];

const CATEGORIES = [
    "All", "General", "Financial", "Technical", "Compliance", "ESG", "Operations", "Legal", "Other"
];

const TAG_FILTERS = [
    "All Tags", "Capability", "Compliance", "Financial", "Regulatory", "References"
];

const BLANK_FORM: CreateRFIQuestionPayload = {
    text: "",
    questionType: "SHORT_TEXT",
    isMandatory: false,
    promoteToRfp: false,
    options: [],
    category: "",
    helpText: "",
    capabilityTags: [],
    complianceTags: [],
    weight: 10,
    scoringConfig: undefined,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatType(type: string) {
    return type.replace(/_/g, " ");
}

function weightColor(w: number) {
    if (w >= 80) return "bg-rose-50 text-rose-700 border-rose-200";
    if (w >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
    if (w >= 20) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
}

// ── Scoring Config Editor subcomponent ───────────────────────────────────────

interface ScoringEditorProps {
    questionType: QuestionType;
    options: { value: string; label: string }[];
    config: QuestionScoringConfig;
    onChange: (cfg: QuestionScoringConfig) => void;
}

function ScoringEditor({ questionType, options, config, onChange }: ScoringEditorProps) {
    if (questionType === "YES_NO") {
        return (
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Score when "Yes" (0–100)</Label>
                    <Input
                        type="number" min={0} max={100}
                        value={config.yesScore ?? 100}
                        onChange={(e) => onChange({ ...config, yesScore: Math.min(100, Math.max(0, +e.target.value)) })}
                        className="h-8 text-sm"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Score when "No" (0–100)</Label>
                    <Input
                        type="number" min={0} max={100}
                        value={config.noScore ?? 0}
                        onChange={(e) => onChange({ ...config, noScore: Math.min(100, Math.max(0, +e.target.value)) })}
                        className="h-8 text-sm"
                    />
                </div>
            </div>
        );
    }

    if (questionType === "SINGLE_SELECT" || questionType === "MULTI_SELECT") {
        const optionRules: ScoringOptionRule[] = config.optionRules ?? options.map((o) => ({ value: o.value, score: 0 }));
        return (
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Score per option (0–100)</Label>
                {options.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Add answer options above first</p>
                )}
                {options.map((opt) => {
                    const rule = optionRules.find((r) => r.value === opt.value) ?? { value: opt.value, score: 0 };
                    return (
                        <div key={opt.value} className="flex items-center gap-3">
                            <span className="text-sm flex-1 truncate">{opt.label || opt.value}</span>
                            <Input
                                type="number" min={0} max={100}
                                value={rule.score}
                                onChange={(e) => {
                                    const newScore = Math.min(100, Math.max(0, +e.target.value));
                                    const updated = optionRules.map((r) =>
                                        r.value === opt.value ? { ...r, score: newScore } : r
                                    );
                                    if (!updated.find((r) => r.value === opt.value)) {
                                        updated.push({ value: opt.value, score: newScore });
                                    }
                                    onChange({ ...config, optionRules: updated });
                                }}
                                className="w-20 h-8 text-sm"
                            />
                        </div>
                    );
                })}
                {questionType === "MULTI_SELECT" && (
                    <p className="text-[11px] text-muted-foreground">Multi-select: final score = average of all selected option scores.</p>
                )}
            </div>
        );
    }

    if (questionType === "NUMERIC") {
        const ranges: ScoringNumericRange[] = config.numericRanges ?? [];
        const addRange = () => onChange({ ...config, numericRanges: [...ranges, { score: 100 }] });
        const removeRange = (i: number) => onChange({ ...config, numericRanges: ranges.filter((_, idx) => idx !== i) });
        const updateRange = (i: number, patch: Partial<ScoringNumericRange>) =>
            onChange({ ...config, numericRanges: ranges.map((r, idx) => idx === i ? { ...r, ...patch } : r) });

        return (
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Numeric range rules (evaluated top-to-bottom, first match wins)</Label>
                {ranges.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <Input
                            type="number" placeholder="Min"
                            value={r.min ?? ""}
                            onChange={(e) => updateRange(i, { min: e.target.value !== "" ? +e.target.value : undefined })}
                            className="w-20 h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                            type="number" placeholder="Max"
                            value={r.max ?? ""}
                            onChange={(e) => updateRange(i, { max: e.target.value !== "" ? +e.target.value : undefined })}
                            className="w-20 h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">→</span>
                        <Input
                            type="number" min={0} max={100} placeholder="Score"
                            value={r.score}
                            onChange={(e) => updateRange(i, { score: Math.min(100, Math.max(0, +e.target.value)) })}
                            className="w-20 h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">pts</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRange(i)}>
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
                <Button variant="ghost" size="sm" onClick={addRange} className="text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add range
                </Button>
            </div>
        );
    }

    if (isManualScoreType(questionType)) {
        return (
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max manual score (evaluator awards 0–N points)</Label>
                <div className="flex items-center gap-2">
                    <Input
                        type="number" min={1} max={100}
                        value={config.maxManualScore ?? 100}
                        onChange={(e) => onChange({ ...config, maxManualScore: Math.max(1, Math.min(100, +e.target.value)) })}
                        className="w-24 h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">points — scored manually during evaluation</span>
                </div>
            </div>
        );
    }

    return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BuyerRFIQuestionsPage() {
    const [questions, setQuestions] = useState<RFIQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [tagFilter, setTagFilter] = useState("All Tags");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewingQuestion, setViewingQuestion] = useState<RFIQuestion | null>(null);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [form, setForm] = useState<CreateRFIQuestionPayload>({ ...BLANK_FORM });
    const [scoringExpanded, setScoringExpanded] = useState(false);
    const [scoringEnabled, setScoringEnabled] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [page, setPage] = useState(1);
    const { user } = useAuthStore();

    const isAdmin = user?.role === "ADMIN";
    const isGlobal = (q: RFIQuestion) => (q as any).creatorRole === "ADMIN" || (q as any).creator_role === "ADMIN";
    const canEdit = (q: RFIQuestion) => {
        if (isAdmin) return true;
        return !isGlobal(q);
    };
    const canDelete = (q: RFIQuestion) => isAdmin;

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/api/rfi/questions") as any;
            const raw = res.content || (Array.isArray(res) ? res : []);
            setQuestions(raw.filter((q: RFIQuestion) => !q.isDeleted));
        } catch (err) {
            console.error(err);
            toast.error("Failed to load questions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQuestions(); }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...BLANK_FORM });
        setScoringEnabled(false);
        setScoringExpanded(false);
        setFormErrors({});
        setDialogOpen(true);
    };

    const openEdit = (q: RFIQuestion) => {
        const hasScoringConfig = !!q.scoringConfig;
        setEditingId(q.questionId);
        setForm({
            text: q.text,
            questionType: q.questionType,
            isMandatory: q.isMandatory,
            promoteToRfp: q.promoteToRfp,
            options: q.options ?? [],
            category: q.category ?? "",
            helpText: q.helpText ?? "",
            capabilityTags: q.capabilityTags ?? [],
            complianceTags: q.complianceTags ?? [],
            tableColumns: q.tableColumns ?? [],
            weight: q.weight ?? 10,
            scoringConfig: q.scoringConfig,
        });
        setScoringEnabled(hasScoringConfig);
        setScoringExpanded(hasScoringConfig);
        setFormErrors({});
        setDialogOpen(true);
    };

    const openView = (q: RFIQuestion) => {
        setViewingQuestion(q);
        setViewDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this question? This is a soft delete and won't affect existing templates.")) return;
        try {
            await apiClient.delete(`/api/rfi/questions/${id}`);
            toast.success("Question deleted.");
            fetchQuestions();
        } catch {
            toast.error("Failed to delete question.");
        }
    };

    const validateForm = () => {
        const errs: Record<string, string> = {};
        if (!form.text.trim()) errs.text = "Question text is required.";
        if (scoringEnabled && (form.weight ?? 10) < 1) errs.weight = "Weight must be at least 1.";
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        const payload: CreateRFIQuestionPayload = {
            ...form,
            weight: scoringEnabled ? (form.weight ?? 10) : undefined,
            scoringConfig: scoringEnabled ? (form.scoringConfig ?? getDefaultConfig(form.questionType)) : undefined,
        };
        try {
            if (editingId) {
                await apiClient.put(`/api/rfi/questions/${editingId}`, payload);
                toast.success("Question updated.");
            } else {
                await apiClient.post("/api/rfi/questions", payload);
                toast.success("Question created.");
            }
            setDialogOpen(false);
            fetchQuestions();
        } catch {
            toast.error("Failed to save question.");
        } finally {
            setSaving(false);
        }
    };

    const addOption = () => {
        setForm((prev) => ({
            ...prev,
            options: [...(prev.options ?? []), { value: `opt_${Date.now()}`, label: "" }],
        }));
    };

    const updateOption = (idx: number, label: string) => {
        setForm((prev) => ({
            ...prev,
            options: (prev.options ?? []).map((o, i) =>
                i === idx ? { value: label.toLowerCase().replace(/\s+/g, "_"), label } : o
            ),
        }));
    };

    const removeOption = (idx: number) => {
        setForm((prev) => ({
            ...prev,
            options: (prev.options ?? []).filter((_, i) => i !== idx),
        }));
    };

    function getDefaultConfig(type: QuestionType): QuestionScoringConfig {
        if (type === "YES_NO") return { yesScore: 100, noScore: 0 };
        if (type === "SINGLE_SELECT" || type === "MULTI_SELECT") {
            return {
                optionRules: (form.options ?? []).map((o) => ({ value: o.value, score: 0 })),
            };
        }
        if (type === "NUMERIC") return { numericRanges: [] };
        return { maxManualScore: 100 };
    }

    const handleToggleScoring = (enabled: boolean) => {
        setScoringEnabled(enabled);
        if (enabled) {
            setScoringExpanded(true);
            if (!form.scoringConfig) {
                setForm((prev) => ({
                    ...prev,
                    scoringConfig: getDefaultConfig(prev.questionType),
                    weight: prev.weight ?? 10,
                }));
            }
        }
    };

    const handleTypeChange = (newType: QuestionType) => {
        setForm((prev) => ({
            ...prev,
            questionType: newType,
            // Reset scoring config when type changes
            scoringConfig: scoringEnabled ? getDefaultConfig(newType) : undefined,
        }));
    };

    const filtered = useMemo(() => questions.filter((q) => {
        const matchSearch =
            !search ||
            q.text.toLowerCase().includes(search.toLowerCase()) ||
            q.category?.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === "All" || q.questionType.replace(/_/g, " ").toLowerCase() === typeFilter.toLowerCase();
        const matchTag = tagFilter === "All Tags" ||
            q.capabilityTags?.some(t => t.toLowerCase() === tagFilter.toLowerCase()) ||
            q.complianceTags?.some(t => t.toLowerCase() === tagFilter.toLowerCase()) ||
            q.category?.toLowerCase() === tagFilter.toLowerCase();
        return matchSearch && matchType && matchTag;
    }), [questions, search, typeFilter, tagFilter]);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [search, typeFilter, tagFilter]);

    const paginated = useMemo(
        () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filtered, page]
    );

    const needsOptions = form.questionType === "SINGLE_SELECT" || form.questionType === "MULTI_SELECT";
    const currentQuestion = editingId ? questions.find((qx) => qx.questionId === editingId) : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-slate-900">Question Library</h2>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Question
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search questions…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-44">
                        <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Types</SelectItem>
                        {QUESTION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.label}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TAG_FILTERS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Question Cards */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-3">
                    {paginated.map((q, idx) => {
                        const globalIdx = (page - 1) * PAGE_SIZE + idx;
                        return (
                        <Card key={q.questionId} className="hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex items-center gap-2 pt-0.5 shrink-0">
                                        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                                        <span className="text-[11px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            Q{globalIdx + 1}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                                                    {formatType(q.questionType)}
                                                </Badge>
                                                {/* Weight badge */}
                                                {q.weight !== undefined && q.scoringConfig && (
                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${weightColor(q.weight)}`}>
                                                        <Scale className="h-2.5 w-2.5 mr-0.5" />
                                                        W:{q.weight}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => openView(q)}>
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                {canEdit(q) && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(q)}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {canDelete(q) && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(q.questionId as any)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 mb-2">{q.text}</p>
                                        {q.helpText && (
                                            <p className="text-xs text-muted-foreground mb-2">{q.helpText}</p>
                                        )}
                                        <div className="flex gap-1.5 flex-wrap">
                                            {q.isMandatory && (
                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
                                            )}
                                            {q.promoteToRfp && (
                                                <Badge className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border border-green-200 hover:bg-green-50">Promote to RFP</Badge>
                                            )}
                                            {isGlobal(q) && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200">
                                                    <Globe className="h-2.5 w-2.5 mr-0.5" /> Global
                                                </Badge>
                                            )}
                                            {q.category && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.category}</Badge>
                                            )}
                                            {q.capabilityTags?.map((t) => (
                                                <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                                            ))}
                                            {/* Scoring indicator */}
                                            {q.scoringConfig && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50 text-violet-700 border-violet-200">
                                                    <Scale className="h-2.5 w-2.5 mr-0.5" /> Scored
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="text-center py-16 text-muted-foreground">
                            {questions.length === 0
                                ? "No questions yet. Add your first question."
                                : "No questions match your filters."}
                        </div>
                    )}

                    <Pagination
                        total={filtered.length}
                        page={page}
                        pageSize={PAGE_SIZE}
                        onChange={setPage}
                    />
                </div>
            )}

            {/* ── View Dialog ─────────────────────────────────────────────── */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Question Details</DialogTitle>
                    </DialogHeader>
                    {viewingQuestion && (
                        <div className="space-y-4 py-2">
                            <div>
                                <Label className="text-muted-foreground text-xs">Question Text</Label>
                                <p className="text-sm font-medium mt-1">{viewingQuestion.text}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground text-xs">Type</Label>
                                    <p className="text-sm mt-1">{formatType(viewingQuestion.questionType)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Category</Label>
                                    <p className="text-sm mt-1">{viewingQuestion.category || "—"}</p>
                                </div>
                            </div>
                            {viewingQuestion.helpText && (
                                <div>
                                    <Label className="text-muted-foreground text-xs">Help Text</Label>
                                    <p className="text-sm mt-1">{viewingQuestion.helpText}</p>
                                </div>
                            )}
                            {viewingQuestion.options && viewingQuestion.options.length > 0 && (
                                <div>
                                    <Label className="text-muted-foreground text-xs">Options</Label>
                                    <ul className="text-sm mt-1 space-y-1">
                                        {viewingQuestion.options.map((o, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                                {o.label}
                                                {viewingQuestion.scoringConfig?.optionRules?.find(r => r.value === o.value) && (
                                                    <span className="ml-auto text-xs text-violet-600 font-medium">
                                                        {viewingQuestion.scoringConfig.optionRules.find(r => r.value === o.value)!.score} pts
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Scoring section in view */}
                            {viewingQuestion.scoringConfig && (
                                <div className="rounded-lg border bg-violet-50/50 p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Scale className="h-3.5 w-3.5 text-violet-600" />
                                        <span className="text-xs font-semibold text-violet-700">Scoring Enabled</span>
                                        <span className="ml-auto text-xs text-violet-600">Weight: {viewingQuestion.weight ?? 10}</span>
                                    </div>
                                    {viewingQuestion.questionType === "YES_NO" && (
                                        <p className="text-xs text-muted-foreground">
                                            Yes → {viewingQuestion.scoringConfig.yesScore ?? 100} pts · No → {viewingQuestion.scoringConfig.noScore ?? 0} pts
                                        </p>
                                    )}
                                    {isManualScoreType(viewingQuestion.questionType) && (
                                        <p className="text-xs text-muted-foreground">
                                            Manually scored by evaluator (0–{viewingQuestion.scoringConfig.maxManualScore ?? 100} pts)
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-3 flex-wrap">
                                {viewingQuestion.isMandatory && <Badge variant="destructive">Required</Badge>}
                                {viewingQuestion.promoteToRfp && <Badge className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-50">Promote to RFP</Badge>}
                                {isGlobal(viewingQuestion) && <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200"><Globe className="h-3 w-3 mr-1" />Global</Badge>}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Add / Edit Dialog ────────────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Question" : "New Question"}</DialogTitle>
                        <DialogDescription>
                            {editingId ? "Update this question in the library." : "Add a new reusable question to the library."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Question Text */}
                        <div className="space-y-1.5">
                            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Question Text</Label>
                            <Textarea
                                value={form.text}
                                onChange={(e) => { setForm({ ...form, text: e.target.value }); setFormErrors({ ...formErrors, text: "" }); }}
                                rows={2}
                                placeholder="Enter the question…"
                                className={formErrors.text ? "border-red-500" : ""}
                                disabled={editingId ? !canEdit(currentQuestion!) : false}
                            />
                            {formErrors.text && <p className="text-sm text-red-500">{formErrors.text}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Question Type</Label>
                                <Select
                                    value={form.questionType}
                                    onValueChange={(v) => handleTypeChange(v as QuestionType)}
                                    disabled={editingId ? !canEdit(currentQuestion!) : false}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {QUESTION_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select
                                    value={form.category ?? ""}
                                    onValueChange={(v) => setForm({ ...form, category: v })}
                                    disabled={editingId ? !canEdit(currentQuestion!) : false}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.filter((c) => c !== "All").map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Options (for select types) */}
                        {needsOptions && (
                            <div className="space-y-2">
                                <Label>Answer Options</Label>
                                {(form.options ?? []).map((opt, oi) => (
                                    <div key={oi} className="flex gap-1.5">
                                        <Input
                                            value={opt.label}
                                            onChange={(e) => updateOption(oi, e.target.value)}
                                            className="h-8 text-sm"
                                            placeholder={`Option ${oi + 1}`}
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOption(oi)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="ghost" size="sm" onClick={addOption}>
                                    <Plus className="h-3 w-3 mr-1" /> Add option
                                </Button>
                            </div>
                        )}

                        {/* Help text */}
                        <div className="space-y-1.5">
                            <Label>Help Text <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Input
                                value={form.helpText ?? ""}
                                onChange={(e) => setForm({ ...form, helpText: e.target.value })}
                                placeholder="Guidance shown to suppliers…"
                            />
                        </div>

                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <Checkbox
                                    checked={form.isMandatory}
                                    onCheckedChange={(c) => setForm({ ...form, isMandatory: !!c })}
                                    disabled={editingId ? !canEdit(currentQuestion!) : false}
                                />
                                Mandatory by default
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <Checkbox
                                    checked={form.promoteToRfp}
                                    onCheckedChange={(c) => setForm({ ...form, promoteToRfp: !!c })}
                                    disabled={editingId ? !canEdit(currentQuestion!) : false}
                                />
                                Promote to RFP
                            </label>
                        </div>

                        {/* ── Scoring Section ───────────────────────────────── */}
                        <Separator />
                        <div className="space-y-3">
                            {/* Toggle header */}
                            <button
                                type="button"
                                className="flex items-center gap-2 w-full text-left"
                                onClick={() => {
                                    if (!scoringEnabled) {
                                        handleToggleScoring(true);
                                    } else {
                                        setScoringExpanded(!scoringExpanded);
                                    }
                                }}
                            >
                                <Scale className="h-4 w-4 text-violet-600" />
                                <span className="text-sm font-medium text-slate-800">Weighted Scoring</span>
                                {scoringEnabled && (
                                    <Badge variant="outline" className="text-[10px] ml-1 bg-violet-50 text-violet-700 border-violet-200">
                                        Enabled · W:{form.weight ?? 10}
                                    </Badge>
                                )}
                                {scoringEnabled
                                    ? scoringExpanded
                                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                                    : <span className="text-xs text-muted-foreground ml-auto">Click to enable</span>
                                }
                            </button>

                            {scoringEnabled && (
                                <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-4 space-y-4">
                                    {/* Disable button */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-violet-500" />
                                            <span>
                                                Assign a weight (importance) to this question. The system calculates
                                                each supplier's weighted score and ranks them automatically.
                                            </span>
                                        </div>
                                        <Button
                                            type="button" variant="ghost" size="sm"
                                            className="text-xs text-muted-foreground shrink-0"
                                            onClick={() => { setScoringEnabled(false); setForm((f) => ({ ...f, scoringConfig: undefined })); }}
                                        >
                                            Disable
                                        </Button>
                                    </div>

                                    {scoringExpanded && (
                                        <>
                                            {/* Weight slider */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm">Question Weight</Label>
                                                    <span className={`text-sm font-bold px-2 py-0.5 rounded border ${weightColor(form.weight ?? 10)}`}>
                                                        {form.weight ?? 10} / 100
                                                    </span>
                                                </div>
                                                <input
                                                    type="range" min={1} max={100}
                                                    value={form.weight ?? 10}
                                                    onChange={(e) => setForm((f) => ({ ...f, weight: +e.target.value }))}
                                                    className="w-full accent-violet-600"
                                                />
                                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                                    <span>1 — Low importance</span>
                                                    <span>50 — Medium</span>
                                                    <span>100 — Critical</span>
                                                </div>
                                                {formErrors.weight && <p className="text-sm text-red-500">{formErrors.weight}</p>}
                                            </div>

                                            {/* Answer scoring rules */}
                                            <div className="space-y-2">
                                                <Label className="text-sm">Answer Scoring Rules</Label>
                                                <ScoringEditor
                                                    questionType={form.questionType}
                                                    options={form.options ?? []}
                                                    config={form.scoringConfig ?? getDefaultConfig(form.questionType)}
                                                    onChange={(cfg) => setForm((f) => ({ ...f, scoringConfig: cfg }))}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        {(!editingId || canEdit(currentQuestion!)) && (
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingId ? "Update" : "Create"} Question
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
