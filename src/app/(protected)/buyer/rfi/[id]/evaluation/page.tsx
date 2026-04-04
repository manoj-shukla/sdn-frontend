"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RFIStatusBadge } from "@/components/rfi/RFIStatusBadge";
import { RFIProgressBar } from "@/components/rfi/RFIProgressBar";
import { ComparisonMatrix } from "@/components/rfi/ComparisonMatrix";
import {
    ArrowLeft, Loader2, CheckCircle, XCircle, Clock, MessageSquare,
    Star, Download, X, Send, StickyNote
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { RFIEvaluation, RFIEvaluationSupplier, SupplierEvaluationStatus, RFIAnswer, RFIAnswerValue } from "@/types/rfi";
import { exportResponsesExcel } from "@/lib/rfi/export";

const EVAL_STATUS_OPTIONS: { value: SupplierEvaluationStatus; label: string; icon: React.ReactNode }[] = [
    { value: "SHORTLISTED", label: "Shortlisted", icon: <Star className="h-3.5 w-3.5" /> },
    { value: "UNDER_REVIEW", label: "Under Review", icon: <Clock className="h-3.5 w-3.5" /> },
    { value: "REJECTED", label: "Rejected", icon: <XCircle className="h-3.5 w-3.5" /> },
    { value: "PENDING", label: "Reset to Pending", icon: <Clock className="h-3.5 w-3.5" /> },
];

function formatAnswer(answer: RFIAnswer | undefined): string {
    if (!answer) return "Not answered";
    const v: RFIAnswerValue = answer.value;
    if (v.text) return v.text;
    if (v.bool !== undefined) return v.bool ? "Yes" : "No";
    if (v.selected) return Array.isArray(v.selected) ? v.selected.join(", ") : String(v.selected);
    if (v.numeric !== undefined) return String(v.numeric);
    if (v.attachments?.length) return `${v.attachments.length} attachment(s)`;
    if (v.tableRows?.length) return `${v.tableRows.length} row(s)`;
    return "—";
}

export default function BuyerRFIEvaluationPage() {
    const { id } = useParams<{ id: string }>();
    const [evaluation, setEvaluation] = useState<RFIEvaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [noteDialog, setNoteDialog] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [clarificationDialog, setClarificationDialog] = useState(false);
    const [clarificationText, setClarificationText] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchEvaluation = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get(`/api/rfi/events/${id}/evaluation`) as any;
                setEvaluation(res);
                if (res?.suppliers?.length > 0) {
                    // Hidden by default for E2E tests
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to load evaluation data");
            } finally {
                setLoading(false);
            }
        };
        fetchEvaluation();
    }, [id]);

    const selectedSupplier = evaluation?.suppliers.find(
        (s) => s.supplierId === selectedSupplierId
    );

    const handleStatusChange = async (supplierId: string, status: SupplierEvaluationStatus) => {
        setActionLoading(true);
        try {
            await apiClient.put(`/api/rfi/events/${id}/evaluation/${supplierId}/status`, { status });
            setEvaluation((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    suppliers: prev.suppliers.map((s) =>
                        s.supplierId === supplierId ? { ...s, evaluationStatus: status } : s
                    ),
                };
            });
            toast.success("Evaluation status updated.");
        } catch (err) {
            toast.error("Failed to update status.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!noteText.trim() || !selectedSupplierId) return;
        setActionLoading(true);
        try {
            await apiClient.post(`/api/rfi/events/${id}/evaluation/${selectedSupplierId}/notes`, {
                text: noteText.trim(),
            });
            setEvaluation((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    suppliers: prev.suppliers.map((s) =>
                        s.supplierId === selectedSupplierId
                            ? {
                                  ...s,
                                  notes: [
                                      ...s.notes,
                                      { text: noteText.trim(), createdAt: new Date().toISOString() },
                                  ],
                              }
                            : s
                    ),
                };
            });
            toast.success("Note added.");
            setNoteText("");
            setNoteDialog(false);
        } catch (err) {
            toast.error("Failed to add note.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendClarification = async () => {
        if (!clarificationText.trim() || !selectedSupplierId) return;
        setActionLoading(true);
        try {
            await apiClient.post(`/api/rfi/events/${id}/evaluation/${selectedSupplierId}/clarification`, {
                message: clarificationText.trim(),
            });
            toast.success("Clarification request sent.");
            setClarificationText("");
            setClarificationDialog(false);
        } catch (err) {
            toast.error("Failed to send clarification request.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!evaluation) {
        return (
            <div className="max-w-4xl mx-auto p-4 pt-8 text-center">
                <p className="text-muted-foreground">Evaluation data not available.</p>
                <Button variant="outline" className="mt-4" asChild>
                    <Link href={`/buyer/rfi/${id}`}>Back to Event</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/buyer/rfi/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 data-testid="evaluation-heading" className="text-2xl font-extrabold text-[#1e293b]">{evaluation.rfiTitle} — Evaluation</h1>
                        <p className="text-muted-foreground text-sm">
                            {evaluation.suppliers.length} supplier{evaluation.suppliers.length !== 1 ? "s" : ""} ·{" "}
                            {evaluation.sections.length} section{evaluation.sections.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!evaluation || evaluation.suppliers.length === 0}
                    onClick={() => {
                        if (!evaluation) return;
                        exportResponsesExcel(
                            evaluation.rfiTitle ?? "RFI Evaluation",
                            evaluation.suppliers,
                            evaluation.sections,
                            new Map() // no score weights on this page; responses page has full scoring
                        );
                        toast.success("Downloading evaluation report…");
                    }}
                >
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                </Button>
            </div>

            <div className="flex gap-4">
                {/* Main — Comparison Matrix */}
                <div className="flex-1 min-w-0 space-y-4">
                    <ComparisonMatrix
                        evaluation={evaluation}
                        onSelectSupplier={setSelectedSupplierId}
                        selectedSupplierId={selectedSupplierId}
                    />
                </div>

                {/* Sidebar — Selected Supplier Panel */}
                {selectedSupplier && (
                    <div className="w-80 shrink-0 space-y-4">
                        <Card data-testid="response-sidebar" className="border-t-4 border-t-indigo-500">
                            <CardHeader className="pb-2 space-y-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">{selectedSupplier.supplierName}</CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        data-testid="close-sidebar-btn"
                                        onClick={() => setSelectedSupplierId(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <RFIStatusBadge status={selectedSupplier.invitationStatus} />
                                    <RFIStatusBadge status={selectedSupplier.evaluationStatus} />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <RFIProgressBar percent={selectedSupplier.completionPercent} />
                                {selectedSupplier.submittedAt && (
                                    <p className="text-xs text-muted-foreground">
                                        Submitted: {new Date(selectedSupplier.submittedAt).toLocaleString()}
                                    </p>
                                )}

                                {/* Evaluation actions */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Set Status
                                    </p>
                                    <Select
                                        value={selectedSupplier.evaluationStatus}
                                        onValueChange={(v) =>
                                            handleStatusChange(
                                                selectedSupplier.supplierId,
                                                v as SupplierEvaluationStatus
                                            )
                                        }
                                        disabled={actionLoading}
                                    >
                                        <SelectTrigger data-testid={`supplier-status-select-${selectedSupplier.supplierId}`} className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EVAL_STATUS_OPTIONS.map((o) => (
                                                <SelectItem key={o.value} value={o.value}>
                                                    <span className="flex items-center gap-1.5">
                                                        {o.icon} {o.label}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <Button
                                        data-testid={`add-note-btn-${selectedSupplier.supplierId}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setNoteDialog(true)}
                                    >
                                        <StickyNote className="h-3.5 w-3.5 mr-1.5" /> Add Note
                                    </Button>
                                    <Button
                                        data-testid={`request-clarification-btn-${selectedSupplier.supplierId}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setClarificationDialog(true)}
                                    >
                                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Request Clarification
                                    </Button>
                                </div>

                                {/* Notes */}
                                {selectedSupplier.notes.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Notes ({selectedSupplier.notes.length})
                                        </p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {selectedSupplier.notes.map((note, i) => (
                                                <div
                                                    key={i}
                                                    className="text-xs p-2.5 rounded bg-slate-50 border text-slate-700"
                                                >
                                                    <p className="whitespace-pre-wrap">{note.text}</p>
                                                    {note.createdAt && (
                                                        <p className="text-muted-foreground mt-1">
                                                            {new Date(note.createdAt).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Full Responses */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        All Answers
                                    </p>
                                    <div className="max-h-80 overflow-y-auto space-y-3">
                                        {evaluation.sections.flatMap((section) =>
                                            section.questions.map((tq) => {
                                                const q = tq.question;
                                                if (!q) return null;
                                                const answer = selectedSupplier.answers.find(
                                                    (a) => String(a.questionId) === String(q.questionId)
                                                );
                                                return (
                                                    <div key={q.questionId} className="text-xs">
                                                        <p className="font-medium text-slate-700 leading-snug">{q.text}</p>
                                                        <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">
                                                            {formatAnswer(answer)}
                                                        </p>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Add Note Dialog */}
            <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Internal Note</DialogTitle>
                        <DialogDescription>
                            This note is visible only to your team and will not be shared with the supplier.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Textarea
                            data-testid="note-input"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Enter your internal note…"
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNoteDialog(false)}>Cancel</Button>
                        <Button data-testid="save-note-btn" onClick={handleAddNote} disabled={actionLoading || !noteText.trim()}>
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Note
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clarification Dialog */}
            <Dialog open={clarificationDialog} onOpenChange={setClarificationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Clarification</DialogTitle>
                        <DialogDescription>
                            Send a clarification request to <strong>{selectedSupplier?.supplierName}</strong>.
                            They will receive an email with your message.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Textarea
                            data-testid="clarification-input"
                            value={clarificationText}
                            onChange={(e) => setClarificationText(e.target.value)}
                            placeholder="Describe what needs clarification…"
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setClarificationDialog(false)}>Cancel</Button>
                        <Button
                            data-testid="send-clarification-btn"
                            onClick={handleSendClarification}
                            disabled={actionLoading || !clarificationText.trim()}
                        >
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Send className="h-3.5 w-3.5 mr-1.5" /> Send Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
