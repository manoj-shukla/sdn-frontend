"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RFIStatusBadge } from "@/components/rfi/RFIStatusBadge";
import { RFIProgressBar } from "@/components/rfi/RFIProgressBar";
import {
    ClipboardList, Calendar, Users, FileText, BarChart2, Loader2,
    ArrowLeft, XCircle, GitBranch, Plus, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { RFIEvent, RFIInvitation, RFIEventAnalytics } from "@/types/rfi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function BuyerRFIEventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [event, setEvent] = useState<RFIEvent | null>(null);
    const [invitations, setInvitations] = useState<RFIInvitation[]>([]);
    const [analytics, setAnalytics] = useState<RFIEventAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("invitations");
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [eventRes, invRes] = await Promise.all([
                apiClient.get(`/api/rfi/events/${id}`),
                apiClient.get(`/api/rfi/events/${id}/invitations`),
            ]);
            setEvent(eventRes as any);
            const rawInv = (invRes as any);
            setInvitations(Array.isArray(rawInv) ? rawInv : rawInv?.content ?? []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load RFI event");
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await apiClient.get(`/api/rfi/analytics/events/${id}`);
            setAnalytics(res as any);
        } catch (err) {
            console.error("Analytics fetch failed", err);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [id]);

    useEffect(() => {
        if (activeTab === "analytics") fetchAnalytics();
    }, [activeTab]);

    const handleCloseRFI = async () => {
        setActionLoading(true);
        try {
            await apiClient.post(`/api/rfi/events/${id}/close`);
            toast.success("RFI closed successfully.");
            setCloseDialogOpen(false);
            fetchAll();
        } catch (err) {
            toast.error("Failed to close RFI.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleConvertToRFP = async () => {
        setActionLoading(true);
        try {
            const res = await apiClient.post(`/api/rfi/events/${id}/convert-to-rfp`) as any;
            toast.success("RFI converted to RFP successfully.");
            setConvertDialogOpen(false);
            router.push(`/buyer/rfp`);
        } catch (err) {
            toast.error("Failed to convert to RFP.");
        } finally {
            setActionLoading(false);
        }
    };

    const shortlistedCount = invitations.filter(
        (inv) => (inv as any).evaluationStatus === "SHORTLISTED"
    ).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="max-w-4xl mx-auto p-4 pt-8 text-center">
                <p className="text-muted-foreground">RFI event not found.</p>
                <Button variant="outline" className="mt-4" asChild>
                    <Link href="/buyer/rfi">Back to RFI Events</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 p-4 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" asChild className="mt-1">
                        <Link href="/buyer/rfi"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 data-testid="event-title" className="text-2xl font-extrabold text-[#1e293b]">{event.title}</h1>
                            <div data-testid="event-status-badge">
                                <RFIStatusBadge status={event.status} />
                            </div>
                        </div>
                        {event.description && (
                            <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Deadline: {new Date(event.deadline).toLocaleString()}
                            </span>
                            {event.template?.name && (
                                <span className="flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5" />
                                    {event.template.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    {event.status === "OPEN" && (
                        <Button data-testid="close-event-btn" variant="outline" onClick={() => setCloseDialogOpen(true)}>
                            <XCircle className="h-4 w-4 mr-1.5" /> Close RFI
                        </Button>
                    )}
                    {event.status === "CLOSED" && shortlistedCount > 0 && (
                        <Button data-testid="convert-to-rfp-btn" onClick={() => setConvertDialogOpen(true)}>
                            <GitBranch className="h-4 w-4 mr-1.5" /> Convert to RFP
                        </Button>
                    )}
                    <Button variant="outline" asChild>
                        <Link href={`/buyer/rfi/${id}/evaluation`}>
                            <BarChart2 className="h-4 w-4 mr-1.5" /> Evaluate
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Invited", value: invitations.length, icon: Users },
                    { label: "Submitted", value: invitations.filter((i) => i.status === "SUBMITTED").length, icon: FileText },
                    { label: "In Progress", value: invitations.filter((i) => i.status === "IN_PROGRESS").length, icon: ClipboardList },
                    { label: "Completion", value: `${event.completionPercent ?? 0}%`, icon: BarChart2 },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardContent className="pt-4 pb-4 px-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                    <p className="text-2xl font-bold mt-0.5">{s.value}</p>
                                </div>
                                <s.icon className="h-8 w-8 text-slate-200" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/50 border">
                    <TabsTrigger data-testid="invitations-tab" value="invitations" className="data-[state=active]:bg-background">
                        <Users className="h-3.5 w-3.5 mr-1.5" /> Invitations
                    </TabsTrigger>
                    <TabsTrigger value="evaluation" className="data-[state=active]:bg-background">
                        <BarChart2 className="h-3.5 w-3.5 mr-1.5" /> Evaluation
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="data-[state=active]:bg-background">
                        <BarChart2 className="h-3.5 w-3.5 mr-1.5" /> Analytics
                    </TabsTrigger>
                </TabsList>

                {/* Invitations tab */}
                <TabsContent value="invitations" className="m-0 mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Supplier Invitations</CardTitle>
                                {event.status === "DRAFT" || event.status === "OPEN" ? (
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href={`/buyer/rfi/create`}>
                                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Supplier
                                        </Link>
                                    </Button>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Sent</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Completion</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.map((inv) => (
                                        <TableRow key={inv.invitationId || inv.id} data-testid={`supplier-invitation-row-${inv.invitationId || inv.id}`}>
                                            <TableCell className="font-medium">
                                                {inv.supplierName || `Supplier #${inv.supplierId}`}
                                                {inv.supplierEmail && (
                                                    <div className="text-xs text-muted-foreground">{inv.supplierEmail}</div>
                                                )}
                                            </TableCell>
                                            <TableCell data-testid={`supplier-invitation-status-${inv.invitationId || inv.id}`}>
                                                <RFIStatusBadge status={inv.status} />
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {inv.submittedAt ? new Date(inv.submittedAt).toLocaleDateString() : "—"}
                                            </TableCell>
                                            <TableCell className="min-w-[120px]">
                                                {inv.status === "SUBMITTED" ? (
                                                    <RFIProgressBar percent={100} size="sm" />
                                                ) : inv.status === "IN_PROGRESS" ? (
                                                    <RFIProgressBar percent={50} size="sm" />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {invitations.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                                No invitations yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Evaluation tab */}
                <TabsContent value="evaluation" className="m-0 mt-4">
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <BarChart2 className="h-12 w-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">Evaluation Workspace</h3>
                            <p className="text-muted-foreground max-w-sm mb-6">
                                Compare supplier responses side-by-side and manage shortlisting decisions.
                            </p>
                            <Button asChild>
                                <Link href={`/buyer/rfi/${id}/evaluation`}>
                                    Open Evaluation Workspace
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Analytics tab */}
                <TabsContent value="analytics" className="m-0 mt-4">
                    {!analytics ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { label: "Total Invited", value: analytics.totalInvited },
                                    { label: "Viewed", value: analytics.viewed },
                                    { label: "In Progress", value: analytics.inProgress },
                                    { label: "Submitted", value: analytics.submitted },
                                    { label: "Expired", value: analytics.expired },
                                ].map((s) => (
                                    <Card key={s.label}>
                                        <CardContent className="pt-4 pb-3 px-4">
                                            <p className="text-xs text-muted-foreground">{s.label}</p>
                                            <p className="text-xl font-bold mt-0.5">{s.value}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            {analytics.submissionsByDay?.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Submissions Over Time</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={analytics.submissionsByDay}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                                <Tooltip />
                                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Close RFI Dialog */}
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

            {/* Convert to RFP Dialog */}
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
        </div>
    );
}
