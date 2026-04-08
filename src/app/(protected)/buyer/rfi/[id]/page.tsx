"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RFIStatusBadge } from "@/components/rfi/RFIStatusBadge";
import { RFIProgressBar } from "@/components/rfi/RFIProgressBar";
import {
    ClipboardList, Calendar, Users, FileText, Loader2,
    ArrowLeft, XCircle, GitBranch, Plus, AlertCircle, Send, TrendingUp,
    MessageSquare
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { RFIEvent, RFIInvitation } from "@/types/rfi";
import { InviteSupplierDialog, type InviteEntry } from "@/components/buyer/invite-supplier-dialog";

export default function BuyerRFIEventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [event, setEvent] = useState<RFIEvent | null>(null);
    const [invitations, setInvitations] = useState<RFIInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("invitations");
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [addInvDialogOpen, setAddInvDialogOpen] = useState(false);
    const [emailInvDialogOpen, setEmailInvDialogOpen] = useState(false);
    const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([]);
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<number>>(new Set());
    const [emailInvites, setEmailInvites] = useState<InviteEntry[]>([]);
    const [suppSearch, setSuppSearch] = useState("");

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [eventRes, invRes] = await Promise.all([
                apiClient.get(`/api/rfi/events/${id}`),
                apiClient.get(`/api/rfi/events/${id}/invitations`),
            ]);
            setEvent(eventRes as any);
            const rawInv = invRes as any;
            setInvitations(Array.isArray(rawInv) ? rawInv : rawInv?.content ?? []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load RFI event");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, [id]);

    const handleCloseRFI = async () => {
        setActionLoading(true);
        try {
            await apiClient.post(`/api/rfi/events/${id}/close`);
            toast.success("RFI closed successfully.");
            setCloseDialogOpen(false);
            fetchAll();
        } catch {
            toast.error("Failed to close RFI.");
        } finally {
            setActionLoading(false);
        }
    };

    const handlePublishRFI = async () => {
        setActionLoading(true);
        try {
            await apiClient.post(`/api/rfi/events/${id}/publish`);
            toast.success("RFI published successfully.");
            setPublishDialogOpen(false);
            fetchAll();
        } catch {
            toast.error("Failed to publish RFI.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleConvertToRFP = async () => {
        setActionLoading(true);
        try {
            const result = await apiClient.post(`/api/rfi/events/${id}/convert-to-rfp`) as any;
            const rfpDraft = result?.rfpDraft || result;
            const newRfpId = rfpDraft?.rfpId;
            const supplierCount = rfpDraft?.totalShortlisted;
            if (supplierCount != null) {
                toast.success(
                    `RFI converted — RFP draft created with ${supplierCount} pre-invited supplier${supplierCount !== 1 ? 's' : ''}.`
                );
            } else {
                toast.success("Navigating to linked RFP…");
            }
            setConvertDialogOpen(false);
            // Redirect to the RFP (new or recovered)
            if (newRfpId) {
                router.push(`/buyer/rfp/${newRfpId}`);
            } else {
                router.push(`/buyer/rfp`);
            }
        } catch {
            toast.error("Failed to convert to RFP.");
        } finally {
            setActionLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await apiClient.get("/api/suppliers") as any;
            const raw = res.content || (Array.isArray(res) ? res : []);
            const invitedIds = new Set(invitations.map(i => i.supplierId).filter(Boolean));
            setAvailableSuppliers(raw.filter((s: any) => !invitedIds.has(s.supplierId || s.supplierid)));
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddInvitations = async () => {
        if (selectedSupplierIds.size === 0 && emailInvites.length === 0) {
            toast.error("Please select at least one supplier or add an email invite.");
            return;
        }
        setActionLoading(true);
        try {
            const payload: any = {};
            if (selectedSupplierIds.size > 0) payload.supplierIds = [...selectedSupplierIds];
            if (emailInvites.length > 0) {
                payload.emailInvites = emailInvites.map(inv => ({ email: inv.email, legalName: inv.legalName }));
            }
            await apiClient.post(`/api/rfi/events/${id}/invitations`, payload);
            toast.success("Invitations sent successfully.");
            setAddInvDialogOpen(false);
            setSelectedSupplierIds(new Set());
            setEmailInvites([]);
            fetchAll();
        } catch {
            toast.error("Failed to add invitations.");
        } finally {
            setActionLoading(false);
        }
    };

    const shortlistedCount = invitations.filter(
        (inv) => (inv as any).evaluationStatus === "SHORTLISTED"
    ).length;

    const submissions = invitations.filter(i => i.status === "SUBMITTED");

    // ── Loading state ──
    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // ── Not found ──
    if (!event) {
        return (
            <div className="max-w-4xl mx-auto py-16 text-center">
                <p className="text-muted-foreground">RFI event not found.</p>
                <Button variant="outline" className="mt-4" asChild>
                    <Link href="/buyer/rfi">Back to RFI Events</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
                        <Link href="/buyer/rfi"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 data-testid="event-title" className="text-2xl font-bold tracking-tight text-slate-900">
                                {event.title}
                            </h1>
                            <div data-testid="event-status-badge">
                                <RFIStatusBadge status={event.status} />
                            </div>
                        </div>
                        {event.description && (
                            <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                            {event.startDate && (
                                <span className="flex items-center gap-1.5 text-blue-600">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Goes live: {new Date(event.startDate).toLocaleString()}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Deadline: {new Date(event.deadline).toLocaleString()}
                            </span>
                            {event.template?.name && (
                                <span className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    {event.template.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    {(event.status === "DRAFT" || event.status === "SCHEDULED") && (
                        <Button data-testid="publish-event-btn" size="sm" onClick={() => setPublishDialogOpen(true)}>
                            <Send className="h-4 w-4 mr-1.5" />
                            {event.status === "SCHEDULED" ? "Publish Now" : "Publish RFI"}
                        </Button>
                    )}
                    {event.status === "OPEN" && (
                        <Button data-testid="close-event-btn" variant="outline" size="sm" onClick={() => setCloseDialogOpen(true)}>
                            <XCircle className="h-4 w-4 mr-1.5" /> Close RFI
                        </Button>
                    )}
                    {/* Convert to RFP — visible for OPEN/CLOSED, disabled until conditions met */}
                    {(event.status === "OPEN" || event.status === "CLOSED") && (() => {
                        const notClosed   = event.status !== "CLOSED";
                        const noShortlist = shortlistedCount === 0;
                        const canPromote  = !notClosed && !noShortlist;
                        const hint = notClosed
                            ? "Close the RFI first"
                            : noShortlist
                            ? "Shortlist at least 1 supplier"
                            : null;
                        return (
                            <div
                                className="flex flex-col items-end gap-0.5"
                                title={hint ?? undefined}
                            >
                                <Button
                                    data-testid="convert-to-rfp-btn"
                                    size="sm"
                                    disabled={!canPromote}
                                    onClick={() => canPromote && setConvertDialogOpen(true)}
                                    className={!canPromote ? "opacity-50 cursor-not-allowed" : ""}
                                >
                                    <GitBranch className="h-4 w-4 mr-1.5" /> Convert to RFP
                                </Button>
                                {hint && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />{hint}
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                    {/* Already converted — show View RFP button (triggers recovery if RFP row missing) */}
                    {event.status === "CONVERTED" && (
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={handleConvertToRFP}
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <GitBranch className="h-4 w-4 mr-1.5" />}
                            View RFP
                        </Button>
                    )}
                    {/* Responses now live in the global Responses page */}
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/buyer/rfi/responses?eventId=${id}`}>
                            <MessageSquare className="h-4 w-4 mr-1.5" /> View Responses
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ── Scheduled banner ── */}
            {event.status === "SCHEDULED" && event.startDate && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
                    <p>
                        This RFI is <strong>scheduled</strong> and will automatically go live on{" "}
                        <strong>{new Date(event.startDate).toLocaleString()}</strong>.
                        Suppliers won&apos;t receive invites until then. You can also publish it immediately using the button above.
                    </p>
                </div>
            )}

            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Invited", value: invitations.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Submitted", value: submissions.length, icon: Send, color: "text-green-600", bg: "bg-green-50" },
                    { label: "Awaiting", value: invitations.length - submissions.length, icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Completion", value: `${invitations.length > 0 ? Math.round((submissions.length / invitations.length) * 100) : 0}%`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardContent className="pt-4 pb-4 px-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                    <p className="text-2xl font-bold mt-0.5">{s.value}</p>
                                </div>
                                <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                                    <s.icon className={`h-5 w-5 ${s.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/50 border">
                    <TabsTrigger data-testid="invitations-tab" value="invitations" className="gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Invitations
                        {invitations.length > 0 && (
                            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-muted text-[10px] font-bold">
                                {invitations.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ── Invitations tab ── */}
                <TabsContent value="invitations" className="mt-4 space-y-4">
                    {/* Callout: responses & evaluation live in the Responses tab */}
                    {submissions.length > 0 && (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm">
                                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                                <span>
                                    <strong>{submissions.length} supplier{submissions.length !== 1 ? "s" : ""}</strong> submitted responses.
                                    Evaluation and scoring are available in the <strong>Responses</strong> tab.
                                </span>
                            </div>
                            <Button size="sm" variant="outline" asChild className="shrink-0">
                                <Link href={`/buyer/rfi/responses?eventId=${id}`}>
                                    View Responses
                                </Link>
                            </Button>
                        </div>
                    )}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Supplier Invitations</CardTitle>
                                {(event.status === "DRAFT" || event.status === "SCHEDULED" || event.status === "OPEN") && (
                                    <Button size="sm" variant="outline" onClick={() => { fetchSuppliers(); setAddInvDialogOpen(true); }}>
                                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Supplier
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Invited</TableHead>
                                        <TableHead>Last Activity</TableHead>
                                        <TableHead>Progress</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.map((inv) => (
                                        <TableRow key={inv.invitationId} data-testid={`supplier-invitation-row-${inv.invitationId}`}>
                                            <TableCell className="font-medium">
                                                {inv.supplierName || `Supplier #${inv.supplierId}`}
                                                {inv.supplierEmail && (
                                                    <div className="text-xs text-muted-foreground">{inv.supplierEmail}</div>
                                                )}
                                            </TableCell>
                                            <TableCell data-testid={`supplier-invitation-status-${inv.invitationId}`}>
                                                <RFIStatusBadge status={inv.status} />
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {inv.submittedAt
                                                    ? new Date(inv.submittedAt).toLocaleDateString()
                                                    : inv.viewedAt
                                                    ? new Date(inv.viewedAt).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="min-w-[130px]">
                                                {inv.status === "SUBMITTED" ? (
                                                    <RFIProgressBar percent={100} size="sm" />
                                                ) : inv.status === "IN_PROGRESS" ? (
                                                    <RFIProgressBar percent={50} size="sm" />
                                                ) : inv.status === "VIEWED" ? (
                                                    <RFIProgressBar percent={15} size="sm" />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Not started</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {invitations.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                No invitations yet. Click &quot;Add Supplier&quot; to invite suppliers.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>

            {/* ── Publish RFI Dialog ── */}
            <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Publish RFI Event</DialogTitle>
                        <DialogDescription>
                            Publishing this RFI will make it live and notify all invited suppliers. They will be able to start submitting responses.
                        </DialogDescription>
                    </DialogHeader>
                    {invitations.length === 0 && (
                        <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-3 rounded text-sm">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>No suppliers have been invited yet. You can still publish and add suppliers afterwards.</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>Cancel</Button>
                        <Button data-testid="publish-rfi-confirm-btn" onClick={handlePublishRFI} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Publish RFI
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Close RFI Dialog ── */}
            <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Close RFI Event</DialogTitle>
                        <DialogDescription>
                            Closing this RFI will prevent further responses. You can then evaluate submissions and optionally convert to RFP.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-3 rounded text-sm">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>This action cannot be undone. Suppliers will no longer be able to submit responses.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
                        <Button data-testid="close-rfi-confirm-btn" variant="destructive" onClick={handleCloseRFI} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Close RFI
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Convert to RFP Dialog ── */}
            <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convert to RFP</DialogTitle>
                        <DialogDescription>
                            This will create an RFP event pre-populated with shortlisted suppliers and promoted questions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-3 rounded bg-blue-50 text-blue-800 text-sm">
                        <strong>{shortlistedCount} shortlisted supplier{shortlistedCount !== 1 ? "s" : ""}</strong> will be included in the new RFP.
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConvertToRFP} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Convert to RFP
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Add Invitations Dialog ── */}
            <Dialog open={addInvDialogOpen} onOpenChange={setAddInvDialogOpen}>
                <DialogContent className="sm:max-w-[580px]">
                    <DialogHeader>
                        <DialogTitle>Add Suppliers to RFI</DialogTitle>
                        <DialogDescription>
                            Select suppliers from your directory or invite new ones by email.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Directory search */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">From Directory</label>
                            <input
                                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Search suppliers..."
                                value={suppSearch}
                                onChange={(e) => setSuppSearch(e.target.value)}
                            />
                            <div className="max-h-44 overflow-y-auto border rounded-md divide-y text-sm">
                                {availableSuppliers
                                    .filter(s => (s.legalName || s.legalname || "").toLowerCase().includes(suppSearch.toLowerCase()))
                                    .map(s => {
                                        const sid = s.supplierId || s.supplierid;
                                        const isSelected = selectedSupplierIds.has(sid);
                                        return (
                                            <div
                                                key={sid}
                                                className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? "bg-primary/5" : ""}`}
                                                onClick={() => {
                                                    const next = new Set(selectedSupplierIds);
                                                    if (next.has(sid)) next.delete(sid);
                                                    else next.add(sid);
                                                    setSelectedSupplierIds(next);
                                                }}
                                            >
                                                <span className="font-medium">{s.legalName || s.legalname}</span>
                                                {isSelected && <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center"><Plus className="h-2.5 w-2.5 text-white rotate-45" /></div>}
                                            </div>
                                        );
                                    })}
                                {availableSuppliers.length === 0 && (
                                    <div className="px-3 py-4 text-muted-foreground text-center text-xs">All directory suppliers are already invited.</div>
                                )}
                            </div>
                            {selectedSupplierIds.size > 0 && (
                                <p className="text-xs text-primary font-medium">{selectedSupplierIds.size} supplier{selectedSupplierIds.size !== 1 ? "s" : ""} selected</p>
                            )}
                        </div>

                        {/* Email invites */}
                        <div className="space-y-2 border-t pt-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Invite by Email</label>
                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary" onClick={() => setEmailInvDialogOpen(true)}>
                                    <Plus className="h-3 w-3" /> Add Guest
                                </Button>
                            </div>
                            {emailInvites.length > 0 ? (
                                <div className="border rounded-md divide-y text-sm">
                                    {emailInvites.map((inv, idx) => (
                                        <div key={idx} className="px-3 py-2 flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">{inv.legalName}</div>
                                                <div className="text-xs text-muted-foreground">{inv.email}</div>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => setEmailInvites(prev => prev.filter((_, i) => i !== idx))}>
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">No email invitations added. Click &quot;Add Guest&quot; to invite external suppliers.</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddInvDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddInvitations} disabled={actionLoading || (selectedSupplierIds.size === 0 && emailInvites.length === 0)}>
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Send Invitations
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Invite by Email Dialog ── */}
            <InviteSupplierDialog
                isOpen={emailInvDialogOpen}
                onClose={() => setEmailInvDialogOpen(false)}
                onAdd={(invite) => {
                    setEmailInvites(prev => [...prev, invite]);
                    setEmailInvDialogOpen(false);
                }}
            />
        </div>
    );
}
