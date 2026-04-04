"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RFIStatusBadge } from "@/components/rfi/RFIStatusBadge";
import { FileText, Plus, Search, Loader2, Archive, Copy, Pencil, Trash2, Eye, Globe, Upload } from "lucide-react";
import { RFITemplateImportDialog } from "@/components/rfi/RFITemplateImportDialog";
import Link from "next/link";
import { toast } from "sonner";
import type { RFITemplate } from "@/types/rfi";

export default function BuyerRFITemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<RFITemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "PUBLISHED" | "DRAFT" | "ARCHIVED">("all");
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewingTemplate, setViewingTemplate] = useState<RFITemplate | null>(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/api/rfi/templates") as any;
            const raw = res.content || (Array.isArray(res) ? res : []);
            setTemplates(raw);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handlePublish = async (id: number) => {
        try {
            await apiClient.post(`/api/rfi/templates/${id}/publish`);
            toast.success("Template published.");
            fetchTemplates();
        } catch (err) {
            toast.error("Failed to publish template.");
        }
    };

    const handleArchive = async (id: number, status: string) => {
        const isDraft = status === "DRAFT";
        const msg = isDraft
            ? "Delete this draft? This cannot be undone."
            : "Archive this template? It will no longer be available for new RFI events.";
        if (!confirm(msg)) return;
        try {
            await apiClient.post(`/api/rfi/templates/${id}/archive`);
            toast.success(isDraft ? "Draft deleted." : "Template archived.");
            fetchTemplates();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || (isDraft ? "Failed to delete draft." : "Failed to archive template."));
        }
    };

    const handleNewVersion = async (id: number) => {
        try {
            const res = await apiClient.post(`/api/rfi/templates/${id}/new-version`) as any;
            const newId = res.templateId || res.id;
            toast.success("New version created as draft.");
            router.push(`/buyer/rfi/templates/${newId}/edit`);
        } catch (err) {
            toast.error("Failed to create new version.");
        }
    };

    const handleViewTemplate = async (t: RFITemplate) => {
        setViewDialogOpen(true);
        setViewLoading(true);
        try {
            // Fetch template detail + question library in parallel so we can
            // hydrate any question whose `text` is missing from the template response
            const [templateRes, questionsRes] = await Promise.all([
                apiClient.get(`/api/rfi/templates/${t.templateId}`) as Promise<any>,
                apiClient.get("/api/rfi/questions").catch(() => null) as Promise<any>,
            ]);

            // Build a questionId → question lookup from the library
            const rawQuestions: any[] =
                questionsRes?.content || (Array.isArray(questionsRes) ? questionsRes : []);
            const questionMap = new Map<string, any>();
            rawQuestions.forEach((q: any) => {
                if (q.questionId != null) questionMap.set(String(q.questionId), q);
            });

            // Hydrate each template question with text if the API didn't return it
            const hydrated = { ...templateRes };
            if (Array.isArray(hydrated.sections)) {
                hydrated.sections = hydrated.sections.map((section: any) => ({
                    ...section,
                    questions: (section.questions || []).map((tq: any) => {
                        const existing =
                            tq.question?.text ||
                            (tq.question as any)?.questionText ||
                            (tq as any)?.questionText;
                        if (existing) return tq; // already has text
                        const library = questionMap.get(String(tq.questionId));
                        if (!library) return tq;
                        return {
                            ...tq,
                            question: {
                                ...(tq.question || {}),
                                ...library,
                            },
                        };
                    }),
                }));
            }

            setViewingTemplate(hydrated);
        } catch (err) {
            // If detail fetch fails, fall back to the list-level data
            setViewingTemplate(t);
        } finally {
            setViewLoading(false);
        }
    };

    const filtered = templates.filter((t) => {
        const matchSearch = !search ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.category?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || t.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const stats = {
        total: templates.length,
        published: templates.filter((t) => t.status === "PUBLISHED").length,
        draft: templates.filter((t) => t.status === "DRAFT").length,
    };

    const statusChips: { label: string; value: typeof statusFilter }[] = [
        { label: "All", value: "all" },
        { label: "Published", value: "PUBLISHED" },
        { label: "Draft", value: "DRAFT" },
        { label: "Archived", value: "ARCHIVED" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 data-testid="template-library-heading" className="text-lg font-semibold text-slate-900">Template Library</h2>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
                        <Upload className="h-4 w-4" />
                        Import Templates
                    </Button>
                    <Button data-testid="create-template-btn" className="gap-2" onClick={() => router.push("/buyer/rfi/templates/create")}>
                        <Plus className="h-4 w-4" />
                        New Template
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex gap-1.5">
                    {statusChips.map((chip) => (
                        <button
                            key={chip.value}
                            onClick={() => setStatusFilter(chip.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                                statusFilter === chip.value
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-white text-muted-foreground border-border hover:bg-muted/50"
                            }`}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Template Cards Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((t) => (
                        <Card
                            key={t.templateId}
                            className="hover:border-primary/30 transition-colors relative overflow-hidden"
                            data-testid={`template-card-${t.templateId}`}
                        >
                            {/* Top accent line */}
                            <div className={`h-0.5 ${
                                t.status === "PUBLISHED" ? "bg-green-500" :
                                t.status === "DRAFT" ? "bg-amber-500" :
                                "bg-slate-300"
                            }`} />

                            <CardContent className="p-4">
                                {/* Status badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <span data-testid={`template-status-${t.templateId}`}><RFIStatusBadge status={t.status} /></span>
                                </div>

                                {/* Template name */}
                                <h3 className="font-semibold text-sm text-slate-900 mb-1.5 line-clamp-2">
                                    {t.name}
                                </h3>

                                {/* Category & version */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {t.category && (
                                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                                    )}
                                    <Badge variant="outline" className="text-[10px]">v{t.version}</Badge>
                                </div>

                                {/* Info */}
                                <p className="text-xs text-muted-foreground mb-4">
                                    {t.sections?.length ?? 0} sections
                                    {t.updatedAt && ` · Updated ${new Date(t.updatedAt).toLocaleDateString()}`}
                                </p>

                                {/* Actions */}
                                <div className="flex items-center justify-between border-t pt-3">
                                    <span className="text-xs text-muted-foreground">
                                        {t.questionCount ?? 0} questions
                                    </span>
                                    <div data-testid={`template-action-menu-${t.templateId}`} className="flex gap-1">
                                        {/* View - available for published/archived templates */}
                                        {(t.status === "PUBLISHED" || t.status === "ARCHIVED") && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                title="View Questions"
                                                onClick={() => handleViewTemplate(t)}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        {/* Edit - draft only */}
                                        {t.status === "DRAFT" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                title="Edit"
                                                onClick={() => router.push(`/buyer/rfi/templates/${t.templateId}/edit`)}
                                                data-testid={`template-edit-btn-${t.templateId}`}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        {/* Publish - draft only */}
                                        {t.status === "DRAFT" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-green-700 hover:text-green-700 hover:bg-green-50"
                                                onClick={() => handlePublish(t.templateId)}
                                                data-testid={`template-publish-btn-${t.templateId}`}
                                            >
                                                Publish
                                            </Button>
                                        )}
                                        {/* Clone */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-violet-600 hover:text-violet-600 hover:bg-violet-50"
                                            title="Clone"
                                            onClick={() => handleNewVersion(t.templateId)}
                                            data-testid={`template-new-version-btn-${t.templateId}`}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        {/* Archive / Delete Draft */}
                                        {t.status !== "ARCHIVED" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title={t.status === "DRAFT" ? "Delete Draft" : "Archive"}
                                                onClick={() => handleArchive(t.templateId, t.status)}
                                                data-testid={`template-archive-btn-${t.templateId}`}
                                            >
                                                {t.status === "DRAFT" ? <Trash2 className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                                            </Button>
                                        )}
                                        {/* Use for new RFI */}
                                        {t.status === "PUBLISHED" && (
                                            <Button
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => router.push("/buyer/rfi/create")}
                                            >
                                                Use
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Create New Template Card */}
                    <Card
                        className="border-dashed hover:border-primary/50 cursor-pointer transition-colors flex items-center justify-center min-h-[220px]"
                        onClick={() => router.push("/buyer/rfi/templates/create")}
                    >
                        <CardContent className="text-center py-8">
                            <div className="text-3xl mb-3 text-muted-foreground/50">+</div>
                            <p className="text-sm font-medium text-muted-foreground">Create New Template</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Start from scratch</p>
                        </CardContent>
                    </Card>

                    {filtered.length === 0 && (
                        <div className="col-span-full text-center py-16 text-muted-foreground">
                            {templates.length === 0
                                ? "No templates yet. Create one to get started."
                                : "No templates match your search."}
                        </div>
                    )}
                </div>
            )}

            {/* View Template Dialog - shows questions */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            {viewingTemplate?.name || "Template Details"}
                        </DialogTitle>
                        {viewingTemplate && (
                            <DialogDescription>
                                {viewingTemplate.category && `${viewingTemplate.category} · `}
                                Version {viewingTemplate.version} · {viewingTemplate.status}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    {viewLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : viewingTemplate?.sections && viewingTemplate.sections.length > 0 ? (
                        <div className="space-y-6 py-2">
                            {viewingTemplate.sections.map((section, si) => (
                                <div key={section.sectionId || si}>
                                    <h4 className="text-sm font-semibold text-slate-900 mb-1">
                                        Section {si + 1}: {section.title}
                                    </h4>
                                    {section.description && (
                                        <p className="text-xs text-muted-foreground mb-3">{section.description}</p>
                                    )}
                                    <div className="space-y-2 pl-3 border-l-2 border-primary/10">
                                        {section.questions?.map((tq, qi) => (
                                            <div
                                                key={tq.templateQuestionId || qi}
                                                className="bg-muted/30 rounded-md p-3"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                                                        Q{qi + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-800">
                                                            {tq.question?.text || (tq.question as any)?.questionText || (tq as any)?.questionText || (tq as any)?.text || "Untitled question"}
                                                        </p>
                                                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                                            {tq.question?.questionType && (
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                                                                    {tq.question.questionType.replace(/_/g, " ")}
                                                                </Badge>
                                                            )}
                                                            {tq.isMandatory && (
                                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
                                                            )}
                                                            {tq.promoteToRfp && (
                                                                <Badge className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border border-green-200 hover:bg-green-50">
                                                                    RFP
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!section.questions || section.questions.length === 0) && (
                                            <p className="text-xs text-muted-foreground py-2">No questions in this section.</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No sections or questions found in this template.
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Templates Dialog */}
            <RFITemplateImportDialog
                isOpen={importDialogOpen}
                onClose={() => setImportDialogOpen(false)}
                onImported={() => {
                    setImportDialogOpen(false);
                    fetchTemplates();
                }}
            />
        </div>
    );
}
