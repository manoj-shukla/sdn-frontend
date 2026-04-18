"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RFIProgressBar } from "@/components/rfi/RFIProgressBar";
import { ConditionalQuestionForm } from "@/components/rfi/ConditionalQuestionForm";
import {
    ArrowLeft, Loader2, CheckCircle, Save, Send, ChevronRight, ChevronLeft, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
    RFIEvent, RFITemplate, RFITemplateSection, RFIResponseProgress,
    RFIAnswerValue, RFIRuleEvaluation
} from "@/types/rfi";

interface RFIEventWithTemplate extends RFIEvent {
    template: RFITemplate & { sections: RFITemplateSection[] };
}

const DEBOUNCE_MS = 1200;

export default function SupplierRFIResponsePage() {
    const { rfi_id } = useParams<{ rfi_id: string }>();
    const router = useRouter();

    const [event, setEvent] = useState<RFIEventWithTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSectionIdx, setActiveSectionIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, RFIAnswerValue>>({});
    const [visibleQuestionIds, setVisibleQuestionIds] = useState<string[]>([]);
    const [progress, setProgress] = useState<RFIResponseProgress | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Compute progress locally so the bar updates immediately as user types ──
    const localProgress = (() => {
        if (!event) return { answered: 0, totalRequired: 0, percentComplete: 0 };
        const visibleSet = new Set(visibleQuestionIds);
        let totalRequired = 0;
        let answered = 0;
        for (const section of event.template?.sections ?? []) {
            for (const tq of section.questions ?? []) {
                const q = tq.question;
                if (!q || !tq.isMandatory) continue;
                if (!visibleSet.has(String(q.questionId))) continue;
                totalRequired++;
                const val = answers[String(q.questionId)];
                if (
                    val &&
                    (val.text !== undefined ||
                        val.selected !== undefined ||
                        val.numeric !== undefined ||
                        val.bool !== undefined ||
                        (val.attachments?.length ?? 0) > 0 ||
                        (val.tableRows?.length ?? 0) > 0)
                ) {
                    answered++;
                }
            }
        }
        const percentComplete = totalRequired === 0 ? 100 : Math.round((answered / totalRequired) * 100);
        return { answered, totalRequired, percentComplete };
    })();

    // Fetch event + template + existing response
    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                const eventRes = await apiClient.get(`/api/rfi/events/${rfi_id}`);
                const ev = eventRes as any;
                setEvent(ev);

                // Progress is non-critical — don't block page load if it fails
                apiClient.get(`/api/rfi/responses/${rfi_id}/progress`)
                    .then((res) => setProgress(res as any))
                    .catch(() => {});

                // Load saved draft answers
                try {
                    const draftRes = await apiClient.get(`/api/rfi/responses/${rfi_id}`) as any;
                    if (draftRes?.answers) {
                        const answersMap: Record<string, RFIAnswerValue> = {};
                        for (const a of draftRes.answers) {
                            const qId = a.questionId;
                            if (qId != null && qId !== "" && qId !== "null" && qId !== "undefined") {
                                answersMap[String(qId)] = a.answerValue ?? a.value;
                            }
                        }
                        setAnswers(answersMap);
                    }
                    if (draftRes?.status === "SUBMITTED") {
                        setSubmitted(true);
                    }
                } catch {
                    // No draft yet — that's fine
                }

                // Fetch rule evaluation for initial state
                try {
                    const rulesRes = await apiClient.get(`/api/rfi/rules/${rfi_id}/evaluate`) as any;
                    setVisibleQuestionIds(rulesRes?.visibleQuestionIds ?? getAllQuestionIds(ev));
                } catch {
                    // Fallback: all questions visible
                    setVisibleQuestionIds(getAllQuestionIds(ev));
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to load RFI");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [rfi_id]);

    function getAllQuestionIds(ev: any): string[] {
        const ids: string[] = [];
        for (const section of ev?.template?.sections ?? []) {
            for (const tq of section.questions ?? []) {
                if (tq.question?.questionId) ids.push(String(tq.question.questionId));
            }
        }
        return ids;
    }

    // Build a clean answer payload.
    // Question IDs are UUID strings — do NOT convert to Number (that turns every
    // UUID into NaN). Only strip entries whose key is the literal string "null" or
    // "undefined", which happens when a question object arrives from the backend
    // with a missing questionId and the frontend stored the answer under that key.
    function buildAnswerPayload(currentAnswers: Record<string, RFIAnswerValue>) {
        return Object.entries(currentAnswers).flatMap(([qId, value]) => {
            if (!qId || qId === "null" || qId === "undefined") return [];
            return [{ questionId: qId, value }];
        });
    }

    // Re-evaluate rules when answers change
    const evaluateRules = useCallback(
        async (currentAnswers: Record<string, RFIAnswerValue>) => {
            if (!event) return;
            try {
                const payload = { answers: buildAnswerPayload(currentAnswers) };
                const res = await apiClient.post(`/api/rfi/rules/${rfi_id}/evaluate`, payload) as any;
                if (res?.visibleQuestionIds) {
                    setVisibleQuestionIds(res.visibleQuestionIds);
                }
            } catch {
                // Rules evaluation is best-effort
            }
        },
        [event, rfi_id]
    );

    // Auto-save draft (debounced)
    const saveDraft = useCallback(
        async (currentAnswers: Record<string, RFIAnswerValue>) => {
            try {
                setSaving(true);
                const payload = { answers: buildAnswerPayload(currentAnswers) };
                await apiClient.post(`/api/rfi/responses/${rfi_id}/draft`, payload);
                // Refresh progress
                const prog = await apiClient.get(`/api/rfi/responses/${rfi_id}/progress`) as any;
                setProgress(prog);
            } catch (err) {
                console.error("Auto-save failed", err);
            } finally {
                setSaving(false);
            }
        },
        [rfi_id]
    );

    const handleAnswerChange = (questionId: string | number, value: RFIAnswerValue) => {
        const qId = String(questionId);
        const next = { ...answers, [qId]: value };
        setAnswers(next);
        // Clear error for this question
        if (errors[qId]) {
            setErrors((prev) => { const e = { ...prev }; delete e[qId]; return e; });
        }

        // Debounce: re-evaluate rules + auto-save
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            evaluateRules(next);
            saveDraft(next);
        }, DEBOUNCE_MS);
    };

    const handleAttachFile = async (questionId: string | number, file: File) => {
        const qId = String(questionId);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("questionId", qId);
            const res = await apiClient.post(`/api/rfi/responses/${rfi_id}/documents`, formData) as any;
            const attachment = {
                attachmentId: res.attachmentId,
                questionId: qId,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                url: res.url,
            };
            const existing = answers[qId] ?? {};
            handleAnswerChange(questionId, {
                ...existing,
                attachments: [...(existing.attachments ?? []), attachment],
            });
            toast.success("File uploaded.");
        } catch (err) {
            toast.error("Failed to upload file.");
        }
    };

    const handleSubmit = async () => {
        const newErrors: Record<string, string> = {};
        if (event) {
            const visibleSet = new Set(visibleQuestionIds);
            for (const section of event.template.sections) {
                for (const tq of section.questions) {
                    const q = tq.question;
                    const qId = q ? String(q.questionId) : null;
                    if (!q || !qId || !visibleSet.has(qId) || !tq.isMandatory) continue;
                    const val = answers[qId];
                    const isEmpty =
                        !val ||
                        (val.text === undefined && val.selected === undefined &&
                            val.numeric === undefined && val.bool === undefined &&
                            (!val.attachments || val.attachments.length === 0) &&
                            (!val.tableRows || val.tableRows.length === 0));
                    if (isEmpty) newErrors[qId] = "This question is required.";
                }
            }
        }
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast.error("Please answer all required questions before submitting.");
            setConfirmDialogOpen(false);
            // Navigate to first section with an error
            if (event) {
                for (let si = 0; si < event.template.sections.length; si++) {
                    const section = event.template.sections[si];
                    const hasError = section.questions.some(
                        (tq) => tq.question && newErrors[String(tq.question.questionId)]
                    );
                    if (hasError) {
                        setActiveSectionIdx(si);
                        break;
                    }
                }
            }
            return;
        }

        setSubmitting(true);
        try {
            const payload = { answers: buildAnswerPayload(answers) };
            await apiClient.post(`/api/rfi/responses/${rfi_id}/submit`, payload);
            setSubmitted(true);
            setConfirmDialogOpen(false);
            toast.success("Response submitted successfully!");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to submit response.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="max-w-3xl mx-auto p-4 pt-8 text-center">
                <p className="text-muted-foreground">RFI not found or you don't have access.</p>
                <Button variant="outline" className="mt-4" asChild>
                    <Link href="/supplier/rfi">Back to RFI Inbox</Link>
                </Button>
            </div>
        );
    }

    const sections = event.template?.sections ?? [];
    const isDeadlinePassed = new Date(event.deadline) < new Date();
    const isReadOnly = submitted || isDeadlinePassed;

    return (
        <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
            {/* Left Sidebar — Section Navigation */}
            <div className="w-72 shrink-0 bg-white border-r flex flex-col">
                {/* Header */}
                <div className="p-4 border-b">
                    <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
                        <Link href="/supplier/rfi">
                            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
                        </Link>
                    </Button>
                    <h2 data-testid="rfi-response-heading" className="font-bold text-sm text-slate-800 leading-tight">{event.title}</h2>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <span>Due {new Date(event.deadline).toLocaleDateString()}</span>
                        {submitted && (
                            <span className="text-green-600 font-medium">· SUBMITTED</span>
                        )}
                        {!submitted && isDeadlinePassed && (
                            <span className="text-red-500 font-medium">· EXPIRED</span>
                        )}
                    </div>
                    <div className="mt-3">
                        <RFIProgressBar
                            percent={localProgress.percentComplete}
                            size="md"
                        />
                        <p data-testid="progress-text" className="text-xs text-muted-foreground mt-1">
                            {localProgress.answered} / {localProgress.totalRequired} required answered
                        </p>
                    </div>
                </div>

                {/* Sections */}
                <div className="flex-1 overflow-y-auto p-2">
                    {sections.map((section, si) => {
                        const sectionErrors = section.questions.some(
                            (tq) => tq.question && errors[String(tq.question.questionId)]
                        );
                        const allAnswered = section.questions
                            .filter((tq) => tq.isMandatory && tq.question && visibleQuestionIds.includes(String(tq.question.questionId)))
                            .every((tq) => {
                                const val = answers[String(tq.question!.questionId)];
                                return val && (
                                    val.text !== undefined ||
                                    val.selected !== undefined ||
                                    val.numeric !== undefined ||
                                    val.bool !== undefined ||
                                    (val.attachments?.length ?? 0) > 0
                                );
                            });

                        return (
                            <button
                                key={si}
                                data-testid={`section-nav-${section.sectionId ?? si}`}
                                onClick={() => setActiveSectionIdx(si)}
                                className={cn(
                                    "w-full text-left px-3 py-2.5 rounded-lg mb-1 flex items-center gap-2 transition-colors text-sm",
                                    activeSectionIdx === si
                                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <div className={cn(
                                    "h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                    sectionErrors
                                        ? "bg-red-100 text-red-600"
                                        : allAnswered
                                        ? "bg-green-100 text-green-700"
                                        : "bg-slate-100 text-slate-500"
                                )}>
                                    {sectionErrors ? "!" : allAnswered ? "✓" : si + 1}
                                </div>
                                <span className="truncate">{section.title}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Footer — submitted state vs editable state */}
                <div className="p-4 border-t space-y-2">
                    {submitted ? (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2.5 text-sm font-medium">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            Response submitted — read-only
                        </div>
                    ) : (
                        <>
                            {saving && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Auto-saving…
                                </p>
                            )}
                            <Button
                                data-testid="save-draft-btn"
                                className="w-full"
                                variant="outline"
                                size="sm"
                                disabled={saving || isDeadlinePassed}
                                onClick={() => saveDraft(answers)}
                            >
                                <Save className="h-3.5 w-3.5 mr-1.5" /> Save Draft
                            </Button>
                            <Button
                                data-testid="submit-btn"
                                className="w-full"
                                size="sm"
                                disabled={submitting || isDeadlinePassed}
                                onClick={() => setConfirmDialogOpen(true)}
                            >
                                <Send className="h-3.5 w-3.5 mr-1.5" /> Submit Response
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                    {/* Submitted banner */}
                    {submitted && (
                        <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
                            <CheckCircle className="h-5 w-5 mt-0.5 shrink-0 text-green-600" />
                            <div data-testid="submission-success">
                                <p className="font-semibold text-sm">Response submitted successfully</p>
                                <p className="text-sm mt-0.5">
                                    Your answers are shown below in read-only mode. The buyer will review them in their evaluation workspace.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Progress bar — only shown while editing */}
                    {!submitted && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                                <span className="text-sm text-muted-foreground">
                                    {localProgress.percentComplete}% complete
                                </span>
                            </div>
                            <RFIProgressBar percent={localProgress.percentComplete} size="lg" showLabel={false} />
                        </div>
                    )}

                    {!submitted && isDeadlinePassed && (
                        <div className="mb-4 flex items-start gap-2 bg-red-50 text-red-800 p-3 rounded-lg text-sm">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>The deadline for this RFI has passed. You can no longer submit responses.</p>
                        </div>
                    )}

                    {/* Questions */}
                    <Card>
                        <CardContent className="pt-6">
                            <ConditionalQuestionForm
                                sections={sections}
                                answers={answers}
                                visibleQuestionIds={visibleQuestionIds}
                                onAnswerChange={handleAnswerChange}
                                onAttachFile={handleAttachFile}
                                errors={errors}
                                disabled={isReadOnly}
                                activeSectionIndex={activeSectionIdx}
                            />
                        </CardContent>
                    </Card>

                    {/* Section navigation */}
                    <div className="flex items-center justify-between mt-6">
                        <Button
                            data-testid="prev-section-btn"
                            variant="outline"
                            onClick={() => setActiveSectionIdx((s) => Math.max(0, s - 1))}
                            disabled={activeSectionIdx === 0}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Section {activeSectionIdx + 1} of {sections.length}
                        </span>
                        {activeSectionIdx < sections.length - 1 ? (
                            <Button
                                data-testid="next-section-btn"
                                onClick={() => setActiveSectionIdx((s) => Math.min(sections.length - 1, s + 1))}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : !isReadOnly ? (
                            <Button
                                onClick={() => setConfirmDialogOpen(true)}
                                disabled={submitting}
                            >
                                <Send className="h-4 w-4 mr-1.5" /> Submit Response
                            </Button>
                        ) : (
                            <div />
                        )}
                    </div>
                </div>
            </div>

            {/* Confirm Submit Dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Your Response</DialogTitle>
                        <DialogDescription>
                            Once submitted, you won't be able to edit your answers. Please review before confirming.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <RFIProgressBar percent={localProgress.percentComplete} />
                        <p className="text-sm text-muted-foreground">
                            {localProgress.answered} of {localProgress.totalRequired} required questions answered
                        </p>
                        {localProgress.percentComplete < 100 && (
                            <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-3 rounded text-sm">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>
                                    You have unanswered required questions. Are you sure you want to submit now?
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                            Review First
                        </Button>
                        <Button data-testid="confirm-submit-btn" onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Send className="h-4 w-4 mr-1.5" /> Confirm & Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
