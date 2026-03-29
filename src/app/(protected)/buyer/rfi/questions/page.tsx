"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import {
    HelpCircle, Plus, Search, Loader2, MoreHorizontal, Pencil, Trash2, Filter
} from "lucide-react";
import { toast } from "sonner";
import type { RFIQuestion, QuestionType, CreateRFIQuestionPayload } from "@/types/rfi";

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
};

export default function BuyerRFIQuestionsPage() {
    const [questions, setQuestions] = useState<RFIQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [form, setForm] = useState<CreateRFIQuestionPayload>({ ...BLANK_FORM });
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

    useEffect(() => {
        fetchQuestions();
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...BLANK_FORM });
        setFormErrors({});
        setDialogOpen(true);
    };

    const openEdit = (q: RFIQuestion) => {
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
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this question? This is a soft delete and won't affect existing templates.")) return;
        try {
            await apiClient.delete(`/api/rfi/questions/${id}`);
            toast.success("Question deleted.");
            fetchQuestions();
        } catch (err) {
            toast.error("Failed to delete question.");
        }
    };

    const validateForm = () => {
        const errs: Record<string, string> = {};
        if (!form.text.trim()) errs.text = "Question text is required.";
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            if (editingId) {
                await apiClient.put(`/api/rfi/questions/${editingId}`, form);
                toast.success("Question updated.");
            } else {
                await apiClient.post("/api/rfi/questions", form);
                toast.success("Question created.");
            }
            setDialogOpen(false);
            fetchQuestions();
        } catch (err) {
            toast.error("Failed to save question.");
        } finally {
            setSaving(false);
        }
    };

    const addOption = () => {
        setForm((prev) => ({
            ...prev,
            options: [...(prev.options ?? []), { value: "", label: "" }],
        }));
    };

    const updateOption = (idx: number, label: string) => {
        setForm((prev) => ({
            ...prev,
            options: (prev.options ?? []).map((o, i) =>
                i === idx ? { value: label, label } : o
            ),
        }));
    };

    const removeOption = (idx: number) => {
        setForm((prev) => ({
            ...prev,
            options: (prev.options ?? []).filter((_, i) => i !== idx),
        }));
    };

    const filtered = questions.filter((q) => {
        const matchSearch =
            !search ||
            q.text.toLowerCase().includes(search.toLowerCase()) ||
            q.category?.toLowerCase().includes(search.toLowerCase());
        const matchCat = categoryFilter === "All" || q.category === categoryFilter;
        return matchSearch && matchCat;
    });

    const needsOptions =
        form.questionType === "SINGLE_SELECT" || form.questionType === "MULTI_SELECT";

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 p-4 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <HelpCircle className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 data-testid="question-library-heading" className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Question Library</h1>
                        <p className="text-muted-foreground text-sm">Manage reusable questions for RFI templates</p>
                    </div>
                </div>
                <Button data-testid="add-question-btn" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Add Question
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="py-3 px-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search questions…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger data-testid="category-filter" className="w-48">
                                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Question</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Flags</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((q) => (
                                    <TableRow key={q.questionId} data-testid={`question-row-${q.questionId}`}>
                                        <TableCell className="font-medium max-w-sm">
                                            <div className="truncate">{q.text}</div>
                                            {q.helpText && (
                                                <div className="text-xs text-muted-foreground truncate">{q.helpText}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge data-testid={`question-type-badge-${q.questionId}`} variant="outline" className="text-xs">
                                                {q.questionType.replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {q.category && (
                                                <Badge variant="secondary" className="text-xs">{q.category}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {q.isMandatory && (
                                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                                )}
                                                {q.promoteToRfp && (
                                                    <Badge className="text-xs">→ RFP</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ActionMenu
                                                items={[
                                                    { label: "Edit", onClick: () => openEdit(q), "data-testid": `question-edit-btn-${q.questionId}` },
                                                    {
                                                        label: "Delete",
                                                        onClick: () => handleDelete(q.questionId as any),
                                                        className: "text-destructive",
                                                        "data-testid": `question-delete-btn-${q.questionId}`,
                                                    },
                                                ] as any[]}
                                            >
                                                <Button data-testid={`question-actions-${q.questionId}`} variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </ActionMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            {questions.length === 0
                                                ? "No questions yet. Add your first question."
                                                : "No questions match your filters."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Question" : "New Question"}</DialogTitle>
                        <DialogDescription>
                            {editingId ? "Update this question in the library." : "Add a new reusable question to the library."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Question Text</Label>
                            <Textarea
                                data-testid="question-text-input"
                                value={form.text}
                                onChange={(e) => { setForm({ ...form, text: e.target.value }); setFormErrors({ ...formErrors, text: "" }); }}
                                rows={2}
                                placeholder="Enter the question…"
                                className={formErrors.text ? "border-red-500" : ""}
                            />
                            {formErrors.text && <p className="text-sm text-red-500">{formErrors.text}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Question Type</Label>
                                <Select
                                    value={form.questionType}
                                    onValueChange={(v) => setForm({ ...form, questionType: v as QuestionType })}
                                >
                                    <SelectTrigger data-testid="question-type-select"><SelectValue /></SelectTrigger>
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
                                >
                                    <SelectTrigger data-testid="question-category-input"><SelectValue placeholder="Select…" /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.filter((c) => c !== "All").map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {needsOptions && (
                            <div className="space-y-2">
                                <Label>Options</Label>
                                {(form.options ?? []).map((opt, oi) => (
                                    <div key={oi} className="flex gap-1.5">
                                        <Input
                                            value={opt.label}
                                            onChange={(e) => updateOption(oi, e.target.value)}
                                            className="h-8 text-sm"
                                            placeholder={`Option ${oi + 1}`}
                                        />
                                        <Button
                                            variant="ghost" size="icon" className="h-8 w-8"
                                            onClick={() => removeOption(oi)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="ghost" size="sm" onClick={addOption}>
                                    <Plus className="h-3 w-3 mr-1" /> Add option
                                </Button>
                            </div>
                        )}

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
                                    data-testid="question-mandatory-checkbox"
                                    checked={form.isMandatory}
                                    onCheckedChange={(c) => setForm({ ...form, isMandatory: !!c })}
                                />
                                Mandatory by default
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <Checkbox
                                    checked={form.promoteToRfp}
                                    onCheckedChange={(c) => setForm({ ...form, promoteToRfp: !!c })}
                                />
                                Promote to RFP
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button data-testid="save-question-btn" onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingId ? "Update" : "Create"} Question
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
