"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    Plus, Trash2, ChevronUp, ChevronDown, Loader2,
    List, X, Save, BookOpen, FileText, Settings2,
    GripVertical, CheckCircle2, AlertCircle, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
    RFITemplate, RFITemplateSection, RFITemplateQuestion, RFIQuestion,
    CreateRFITemplatePayload, QuestionType,
} from "@/types/rfi";

// ─── Constants ───────────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuestionType; label: string; color: string }[] = [
    { value: "SHORT_TEXT",    label: "Short Text",    color: "bg-blue-100 text-blue-700" },
    { value: "LONG_TEXT",     label: "Long Text",     color: "bg-blue-100 text-blue-700" },
    { value: "YES_NO",        label: "Yes / No",      color: "bg-green-100 text-green-700" },
    { value: "SINGLE_SELECT", label: "Single Select", color: "bg-purple-100 text-purple-700" },
    { value: "MULTI_SELECT",  label: "Multi Select",  color: "bg-purple-100 text-purple-700" },
    { value: "NUMERIC",       label: "Numeric",       color: "bg-orange-100 text-orange-700" },
    { value: "ATTACHMENT",    label: "File Upload",   color: "bg-yellow-100 text-yellow-700" },
    { value: "TABLE",         label: "Table",         color: "bg-slate-100 text-slate-700" },
];

const CATEGORIES = [
    "General", "Financial", "Technical", "Compliance", "ESG", "Operations", "Legal", "Other",
];

const REG_TAGS = ["None", "GST", "PAN", "MSME", "IEC", "PF_ESI", "GDPR", "SOC2", "ISO27001"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalQuestion extends RFITemplateQuestion {
    _localId: string;
    question: RFIQuestion;
    /** Set when this question was added from the question library */
    libraryQuestionId?: string | number | null;
    fromLibrary?: boolean;
}

interface LocalSection extends Omit<RFITemplateSection, "questions"> {
    _localId: string;
    questions: LocalQuestion[];
    collapsed: boolean;
}

interface Props {
    initial?: RFITemplate;
    mode: "create" | "edit";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2); }

function blankQuestion(): LocalQuestion {
    return {
        _localId: uid(),
        questionId: 0,
        isMandatory: false,
        promoteToRfp: false,
        orderIndex: 0,
        question: {
            questionId: 0,
            text: "",
            questionType: "SHORT_TEXT",
            isMandatory: false,
            promoteToRfp: false,
            options: [],
            tableColumns: [],
            createdAt: new Date().toISOString(),
        },
    };
}

function typeColor(t: QuestionType) {
    return QUESTION_TYPES.find((x) => x.value === t)?.color ?? "bg-slate-100 text-slate-700";
}
function typeLabel(t: QuestionType) {
    return QUESTION_TYPES.find((x) => x.value === t)?.label ?? t;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateBuilder({ initial, mode }: Props) {
    const router = useRouter();

    // ── Metadata ──
    const [name, setName] = useState(initial?.name ?? "");
    const [category, setCategory] = useState(initial?.category ?? "");
    const [subcategory, setSubcategory] = useState(initial?.subcategory ?? "");
    const [regionsRaw, setRegionsRaw] = useState(initial?.regions?.join(", ") ?? "");
    const [overlaysRaw, setOverlaysRaw] = useState(initial?.regulatoryOverlays?.join(", ") ?? "");
    const [version, setVersion] = useState<number>(initial?.version ?? 1);

    // ── Sections ──
    const [sections, setSections] = useState<LocalSection[]>(
        initial?.sections?.map((s) => ({
            ...s,
            _localId: uid(),
            collapsed: false,
            questions: s.questions.map((q) => ({
                ...q,
                _localId: uid(),
                // Carry library linkage through for round-trip saves
                libraryQuestionId: (q as any).libraryQuestionId ?? null,
                fromLibrary: !!(q as any).libraryQuestionId || !!(q as any).fromLibrary,
                question: q.question ?? {
                    questionId: q.questionId,
                    text: (q as any).text || (q as any).questionText || "",
                    questionType: ((q as any).questionType || "SHORT_TEXT") as QuestionType,
                    isMandatory: q.isMandatory,
                    promoteToRfp: q.promoteToRfp,
                    options: (q as any).options || [],
                    helpText: (q as any).helpText,
                    createdAt: new Date().toISOString(),
                },
            })),
        })) ?? []
    );

    // ── UI state ──
    const [selectedQ, setSelectedQ] = useState<{ sId: string; qId: string } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [metaOpen, setMetaOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nameError, setNameError] = useState("");

    // ── Library picker ──
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
    const [libraryQuestions, setLibraryQuestions] = useState<RFIQuestion[]>([]);
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerLoading, setPickerLoading] = useState(false);

    // ── Publish confirm ──
    const [publishConfirm, setPublishConfirm] = useState(false);

    // ── Derived: selected question ──
    const selectedSection = selectedQ ? sections.find((s) => s._localId === selectedQ.sId) : null;
    const selectedQuestion = selectedSection?.questions.find((q) => q._localId === selectedQ?.qId) ?? null;

    // ─── Section helpers ─────────────────────────────────────────────────────

    const addSection = () => {
        setSections((p) => [
            ...p,
            { _localId: uid(), title: `Section ${p.length + 1}`, description: "", orderIndex: p.length, questions: [], collapsed: false },
        ]);
    };

    const removeSection = (id: string) => {
        setSections((p) => p.filter((s) => s._localId !== id));
        if (selectedQ?.sId === id) setSelectedQ(null);
    };

    const updateSection = (id: string, patch: Partial<LocalSection>) =>
        setSections((p) => p.map((s) => (s._localId === id ? { ...s, ...patch } : s)));

    const moveSection = (id: string, dir: "up" | "down") =>
        setSections((p) => {
            const i = p.findIndex((s) => s._localId === id);
            if (i < 0) return p;
            const j = dir === "up" ? i - 1 : i + 1;
            if (j < 0 || j >= p.length) return p;
            const next = [...p];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });

    // ─── Question helpers ────────────────────────────────────────────────────

    const addQuestion = (sId: string) => {
        const q = blankQuestion();
        setSections((p) => p.map((s) => s._localId === sId ? { ...s, questions: [...s.questions, q] } : s));
        setSelectedQ({ sId, qId: q._localId });
    };

    const removeQuestion = (sId: string, qId: string) => {
        setSections((p) => p.map((s) => s._localId === sId ? { ...s, questions: s.questions.filter((q) => q._localId !== qId) } : s));
        if (selectedQ?.qId === qId) setSelectedQ(null);
    };

    const moveQuestion = (sId: string, qId: string, dir: "up" | "down") =>
        setSections((p) => p.map((s) => {
            if (s._localId !== sId) return s;
            const i = s.questions.findIndex((q) => q._localId === qId);
            const j = dir === "up" ? i - 1 : i + 1;
            if (j < 0 || j >= s.questions.length) return s;
            const next = [...s.questions];
            [next[i], next[j]] = [next[j], next[i]];
            return { ...s, questions: next };
        }));

    const updateQField = (sId: string, qId: string, patch: Partial<RFIQuestion>) =>
        setSections((p) => p.map((s) =>
            s._localId !== sId ? s : {
                ...s,
                questions: s.questions.map((q) =>
                    q._localId !== qId ? q : { ...q, question: { ...q.question, ...patch } }
                ),
            }
        ));

    const updateQMeta = (sId: string, qId: string, patch: { isMandatory?: boolean; promoteToRfp?: boolean }) =>
        setSections((p) => p.map((s) =>
            s._localId !== sId ? s : {
                ...s,
                questions: s.questions.map((q) => q._localId !== qId ? q : { ...q, ...patch }),
            }
        ));

    // ─── Library ─────────────────────────────────────────────────────────────

    const openPicker = async (sId: string) => {
        setPickerSectionId(sId);
        setPickerOpen(true);
        if (!libraryQuestions.length) {
            setPickerLoading(true);
            try {
                const res = await apiClient.get("/api/rfi/questions") as any;
                setLibraryQuestions(res.content || (Array.isArray(res) ? res : []));
            } catch { toast.error("Failed to load question library"); }
            finally { setPickerLoading(false); }
        }
    };

    const addFromLibrary = (q: RFIQuestion) => {
        if (!pickerSectionId) return;
        const lq: LocalQuestion = {
            _localId: uid(),
            questionId: q.questionId,   // library question's ID — sent to backend as libraryQuestionId reference
            libraryQuestionId: q.questionId,
            fromLibrary: true,
            isMandatory: q.isMandatory,
            promoteToRfp: q.promoteToRfp,
            orderIndex: 0,
            question: q,
        };
        setSections((p) => p.map((s) =>
            s._localId !== pickerSectionId ? s : { ...s, questions: [...s.questions, lq] }
        ));
        setPickerOpen(false);
    };

    // ─── Save / Publish ──────────────────────────────────────────────────────

    const buildPayload = (): CreateRFITemplatePayload => ({
        name: name.trim(),
        category: category || undefined,
        subcategory: subcategory || undefined,
        version,
        regions: regionsRaw.split(",").map((r) => r.trim()).filter(Boolean),
        regulatoryOverlays: overlaysRaw.split(",").map((r) => r.trim()).filter(Boolean),
        sections: sections.map((s, si) => ({
            title: s.title,
            description: s.description,
            orderIndex: si,
            questions: s.questions.map((q, qi) => ({
                questionId: q.questionId || 0,
                isMandatory: q.isMandatory,
                promoteToRfp: q.promoteToRfp,
                orderIndex: qi,
                question: q.question,
            })),
        })),
    });

    const validate = () => {
        if (!name.trim()) { setNameError("Template name is required."); return false; }
        setNameError("");
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            if (mode === "create") {
                const res = await apiClient.post("/api/rfi/templates", buildPayload()) as any;
                toast.success("Template saved as draft. You can now add more questions or publish it when ready.");
                router.push(`/buyer/rfi/templates/${res.templateId}/edit`);
            } else {
                await apiClient.put(`/api/rfi/templates/${initial!.templateId}`, buildPayload());
                toast.success("Template updated.");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || "Failed to save.";
            toast.error(msg);
        }
        finally { setSaving(false); }
    };

    const handlePublish = async () => {
        if (!validate()) { setPublishConfirm(false); return; }
        setSaving(true);
        setPublishConfirm(false);
        try {
            let tid = initial?.templateId;
            if (mode === "create") {
                const res = await apiClient.post("/api/rfi/templates", buildPayload()) as any;
                tid = res.templateId;
            } else {
                await apiClient.put(`/api/rfi/templates/${initial!.templateId}`, buildPayload());
            }
            await apiClient.post(`/api/rfi/templates/${tid}/publish`);
            toast.success("Template published.");
            router.push("/buyer/rfi/templates");
        } catch { toast.error("Failed to publish."); }
        finally { setSaving(false); }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    const isPublished = initial?.status === "PUBLISHED" || initial?.status === "ARCHIVED";
    const totalQs = sections.reduce((a, s) => a + s.questions.length, 0);

    const filteredLibrary = libraryQuestions.filter(
        (q) => !pickerSearch || q.text.toLowerCase().includes(pickerSearch.toLowerCase()) || q.category?.toLowerCase().includes(pickerSearch.toLowerCase())
    );

    return (
        <div className="flex h-full overflow-hidden bg-gray-50 flex-col">

            {/* ── Top Header Bar ─────────────────────────────────────── */}
            <div className="flex-shrink-0 bg-white border-b shadow-sm px-4 h-14 flex items-center gap-3">
                {/* Sidebar toggle */}
                <button
                    onClick={() => setSidebarOpen((v) => !v)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                    title={sidebarOpen ? "Hide sections" : "Show sections"}
                >
                    {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </button>

                {/* Template name */}
                <div className="flex-1 min-w-0">
                    <input
                        data-testid="template-name-input"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setNameError(""); }}
                        placeholder="Untitled Template…"
                        className={cn(
                            "w-full text-lg font-semibold bg-transparent border-none outline-none truncate placeholder:text-gray-300",
                            nameError && "text-red-500"
                        )}
                    />
                    {nameError && <p className="text-xs text-red-500 -mt-0.5">{nameError}</p>}
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 mr-2">
                    <span>{sections.length} section{sections.length !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>{totalQs} question{totalQs !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span className="text-gray-500 font-medium">v{version}</span>
                    {isPublished && (
                        <>
                            <span>·</span>
                            <Badge className="bg-green-100 text-green-700 text-xs border-0">Published</Badge>
                        </>
                    )}
                </div>

                {/* Settings button */}
                <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600" onClick={() => setMetaOpen(true)}>
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                </Button>

                {/* Actions */}
                <Button data-testid="save-draft-btn" variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Draft
                </Button>
                {/* Publish only available in edit mode (template already saved as DRAFT).
                    New templates must be saved as draft first, then published from the edit page. */}
                {mode === "edit" && !isPublished && (
                    <Button data-testid="publish-template-btn" size="sm" onClick={() => setPublishConfirm(true)} disabled={saving} className="gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Publish
                    </Button>
                )}
            </div>

            {/* ── Main 3-Panel Body ───────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── Left Sidebar: Section Navigator ─── */}
                {sidebarOpen && (
                    <div className="w-64 flex-shrink-0 bg-white border-r flex flex-col overflow-hidden">
                        <div className="px-3 py-3 border-b flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sections</span>
                            <button
                                onClick={addSection}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2">
                            {sections.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-8 px-3">No sections yet.<br />Click Add to start.</p>
                            )}
                            {sections.map((s, si) => (
                                <div
                                    key={s._localId}
                                    className={cn(
                                        "group mx-2 mb-1 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
                                        selectedQ?.sId === s._localId
                                            ? "bg-indigo-50 border border-indigo-200"
                                            : "hover:bg-gray-50 border border-transparent"
                                    )}
                                    onClick={() => {
                                        document.getElementById(`section-${s._localId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{s.title || "Untitled"}</p>
                                            <p className="text-xs text-gray-400">{s.questions.length} question{s.questions.length !== 1 ? "s" : ""}</p>
                                        </div>
                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveSection(s._localId, "up"); }}
                                                disabled={si === 0}
                                                className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                                            >
                                                <ChevronUp className="h-3 w-3 text-gray-500" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveSection(s._localId, "down"); }}
                                                disabled={si === sections.length - 1}
                                                className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                                            >
                                                <ChevronDown className="h-3 w-3 text-gray-500" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeSection(s._localId); }}
                                                className="p-0.5 rounded hover:bg-red-100 text-red-400"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t">
                            <button
                                data-testid="add-section-btn"
                                onClick={addSection}
                                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 py-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Section
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Center Canvas: Question Editor ─── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto py-6 px-6 space-y-5">
                        {sections.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                                    <FileText className="h-8 w-8 text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-1">Start building your template</h3>
                                <p className="text-sm text-gray-400 mb-5 max-w-xs">Add sections to organise your questions, then fill each section with the information you need from suppliers.</p>
                                <Button onClick={addSection} className="gap-2">
                                    <Plus className="h-4 w-4" /> Add First Section
                                </Button>
                            </div>
                        )}

                        {sections.map((s, si) => (
                            <div
                                key={s._localId}
                                id={`section-${s._localId}`}
                                className="bg-white rounded-xl border shadow-sm overflow-hidden"
                            >
                                {/* Section header */}
                                <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-white border-b flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <input
                                            data-testid={`section-name-input-${si}`}
                                            value={s.title}
                                            onChange={(e) => updateSection(s._localId, { title: e.target.value })}
                                            className="w-full text-base font-semibold bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-300"
                                            placeholder="Section title…"
                                        />
                                        <input
                                            value={s.description ?? ""}
                                            onChange={(e) => updateSection(s._localId, { description: e.target.value })}
                                            className="w-full text-sm bg-transparent border-none outline-none text-gray-500 placeholder:text-gray-300 mt-0.5"
                                            placeholder="Description (optional)…"
                                        />
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => moveSection(s._localId, "up")} disabled={si === 0} className="p-1 rounded hover:bg-white disabled:opacity-30">
                                            <ChevronUp className="h-4 w-4 text-gray-400" />
                                        </button>
                                        <button onClick={() => moveSection(s._localId, "down")} disabled={si === sections.length - 1} className="p-1 rounded hover:bg-white disabled:opacity-30">
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        </button>
                                        <button onClick={() => removeSection(s._localId)} className="p-1 rounded hover:bg-red-50 text-red-400">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Questions */}
                                <div className="divide-y">
                                    {s.questions.map((q, qi) => {
                                        const isSelected = selectedQ?.sId === s._localId && selectedQ?.qId === q._localId;
                                        return (
                                            <div
                                                key={q._localId}
                                                className={cn(
                                                    "px-5 py-3.5 flex items-center gap-3 cursor-pointer transition-colors group",
                                                    isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
                                                )}
                                                onClick={() => setSelectedQ(isSelected ? null : { sId: s._localId, qId: q._localId })}
                                            >
                                                <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-sm truncate", q.question.text ? "text-gray-800" : "text-gray-300 italic")}>
                                                        {q.question.text || "Untitled question…"}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", typeColor(q.question.questionType))}>
                                                            {typeLabel(q.question.questionType)}
                                                        </span>
                                                        {q.fromLibrary && (
                                                            <span className="text-xs flex items-center gap-1 text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-medium">
                                                                <BookOpen className="h-2.5 w-2.5" /> Library
                                                            </span>
                                                        )}
                                                        {q.isMandatory && (
                                                            <span className="text-xs text-red-500 font-medium">Required</span>
                                                        )}
                                                        {q.promoteToRfp && (
                                                            <span className="text-xs text-indigo-500 font-medium">→ RFP</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button onClick={(e) => { e.stopPropagation(); moveQuestion(s._localId, q._localId, "up"); }} disabled={qi === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                                                        <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); moveQuestion(s._localId, q._localId, "down"); }} disabled={qi === s.questions.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                                                        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); removeQuestion(s._localId, q._localId); }} className="p-1 rounded hover:bg-red-100 text-red-400">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add question */}
                                <div className="px-5 py-3 flex gap-2 border-t bg-gray-50">
                                    <Button data-testid={`add-question-btn-${si}`} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => addQuestion(s._localId)}>
                                        <Plus className="h-3.5 w-3.5" /> New Question
                                    </Button>
                                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-gray-500" onClick={() => openPicker(s._localId)}>
                                        <List className="h-3.5 w-3.5" /> From Library
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Right Panel: Question Properties ─── */}
                <div className="w-80 flex-shrink-0 bg-white border-l flex flex-col overflow-hidden">
                    {!selectedQuestion || !selectedQ ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                                <Settings2 className="h-5 w-5 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-500">Question Properties</p>
                            <p className="text-xs text-gray-400 mt-1">Click a question in the canvas to edit its properties here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-3 border-b flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">Question Properties</span>
                                <button onClick={() => setSelectedQ(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                                {/* Question text */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-600">Question Text</Label>
                                    <textarea
                                        data-testid="question-text-input"
                                        value={selectedQuestion.question.text}
                                        onChange={(e) => updateQField(selectedQ.sId, selectedQ.qId, { text: e.target.value })}
                                        placeholder="Enter your question…"
                                        rows={3}
                                        className="w-full text-sm border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    />
                                </div>

                                    {/* Type */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-600">Answer Type</Label>
                                    <Select
                                        value={selectedQuestion.question.questionType}
                                        onValueChange={(v) => updateQField(selectedQ.sId, selectedQ.qId, { questionType: v as QuestionType })}
                                    >
                                        <SelectTrigger data-testid="question-type-select" className="h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {QUESTION_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Options (for select types) */}
                                {(selectedQuestion.question.questionType === "SINGLE_SELECT" || selectedQuestion.question.questionType === "MULTI_SELECT") && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-gray-600">Options</Label>
                                        {(selectedQuestion.question.options ?? []).map((opt, oi) => (
                                            <div key={oi} className="flex gap-1">
                                                <Input
                                                    value={opt.label}
                                                    onChange={(e) => {
                                                        const next = [...(selectedQuestion.question.options ?? [])];
                                                        next[oi] = { value: e.target.value, label: e.target.value };
                                                        updateQField(selectedQ.sId, selectedQ.qId, { options: next });
                                                    }}
                                                    className="h-7 text-xs"
                                                    placeholder={`Option ${oi + 1}`}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const next = (selectedQuestion.question.options ?? []).filter((_, i) => i !== oi);
                                                        updateQField(selectedQ.sId, selectedQ.qId, { options: next });
                                                    }}
                                                    className="p-1 rounded hover:bg-red-100 text-red-400"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="ghost" size="sm" className="h-7 text-xs gap-1"
                                            onClick={() => {
                                                const next = [...(selectedQuestion.question.options ?? []), { value: "", label: "" }];
                                                updateQField(selectedQ.sId, selectedQ.qId, { options: next });
                                            }}
                                        >
                                            <Plus className="h-3 w-3" /> Add option
                                        </Button>
                                    </div>
                                )}

                                {/* Flags */}
                                <div className="space-y-2.5 p-3 bg-gray-50 rounded-lg">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <Checkbox
                                            checked={selectedQuestion.isMandatory}
                                            onCheckedChange={(c) => updateQMeta(selectedQ.sId, selectedQ.qId, { isMandatory: !!c })}
                                        />
                                        <span className="text-sm text-gray-700">Required</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <Checkbox
                                            checked={selectedQuestion.promoteToRfp}
                                            onCheckedChange={(c) => updateQMeta(selectedQ.sId, selectedQ.qId, { promoteToRfp: !!c })}
                                        />
                                        <span className="text-sm text-gray-700">Promote to RFP</span>
                                    </label>
                                </div>

                                {/* Help text */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-600">Help Text <span className="text-gray-400 font-normal">(optional)</span></Label>
                                    <Input
                                        value={selectedQuestion.question.helpText ?? ""}
                                        onChange={(e) => updateQField(selectedQ.sId, selectedQ.qId, { helpText: e.target.value })}
                                        className="h-8 text-xs"
                                        placeholder="Guidance shown to suppliers…"
                                    />
                                </div>

                                {/* Regulatory tag */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-600">Regulatory Tag</Label>
                                    <Select
                                        value={(selectedQuestion.question as any).regulatoryTag ?? "None"}
                                        onValueChange={(v) => updateQField(selectedQ.sId, selectedQ.qId, { regulatoryTag: v === "None" ? undefined : v } as any)}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {REG_TAGS.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                            </div>
                        </>
                    )}
                </div>

            </div>

            {/* ── Template Settings Modal ─────────────────────────────── */}
            <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" /> Template Settings
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Template Name <span className="text-red-500">*</span></Label>
                            <Input
                                value={name}
                                onChange={(e) => { setName(e.target.value); setNameError(""); }}
                                placeholder="e.g. IT Vendor Qualification — Standard"
                                className={nameError ? "border-red-500" : ""}
                            />
                            {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Sub-category</Label>
                                <Input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="e.g. Cloud Infrastructure" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Version <span className="text-xs text-gray-400 font-normal">(integer, e.g. 1, 2, 3)</span></Label>
                            <Input
                                type="number"
                                min={1}
                                value={version}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    if (!isNaN(v) && v >= 1) setVersion(v);
                                }}
                                className="max-w-[100px]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Regions <span className="text-xs text-gray-400">(comma-separated)</span></Label>
                            <Input value={regionsRaw} onChange={(e) => setRegionsRaw(e.target.value)} placeholder="e.g. North America, Europe" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Regulatory Overlays <span className="text-xs text-gray-400">(comma-separated)</span></Label>
                            <Input value={overlaysRaw} onChange={(e) => setOverlaysRaw(e.target.value)} placeholder="e.g. GDPR, SOC2, ISO27001" />
                        </div>
                        {isPublished && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-700">This template is published. Any changes will require re-publishing.</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setMetaOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Publish Confirm Dialog ──────────────────────────────── */}
            <Dialog open={publishConfirm} onOpenChange={setPublishConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Publish Template?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">
                        Once published, this template becomes read-only. You can still create a new version later. Active RFI events using this template will not be affected.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setPublishConfirm(false)}>Cancel</Button>
                        <Button data-testid="confirm-publish-btn" onClick={handlePublish} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Publish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Question Library Picker ─────────────────────────────── */}
            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> Question Library
                        </DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder="Search questions…"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        className="mb-3"
                    />
                    {pickerLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {filteredLibrary.map((q) => (
                                <div
                                    key={q.questionId}
                                    className="p-3 rounded-lg border hover:bg-slate-50 cursor-pointer flex items-start justify-between gap-3"
                                    onClick={() => addFromLibrary(q)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{q.text}</p>
                                        <div className="flex gap-1.5 mt-1">
                                            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", typeColor(q.questionType))}>
                                                {typeLabel(q.questionType)}
                                            </span>
                                            {q.category && <Badge variant="secondary" className="text-xs">{q.category}</Badge>}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                            {filteredLibrary.length === 0 && (
                                <p className="text-center py-8 text-muted-foreground text-sm">No questions found.</p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPickerOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
