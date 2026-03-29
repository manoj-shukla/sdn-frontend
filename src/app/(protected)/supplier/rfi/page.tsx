"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RFIStatusBadge } from "@/components/rfi/RFIStatusBadge";
import { RFIProgressBar } from "@/components/rfi/RFIProgressBar";
import { ClipboardList, Calendar, Building2, Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { RFIInvitation, InvitationStatus } from "@/types/rfi";

interface RFIInboxItem {
    invitationId: number;
    rfiId: number;
    rfiTitle: string;
    buyerName?: string;
    deadline: string;
    status: InvitationStatus;
    completionPercent?: number;
}

export default function SupplierRFIInboxPage() {
    const router = useRouter();
    const [items, setItems] = useState<RFIInboxItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInbox = async () => {
            try {
                setLoading(true);
                // The supplier's RFI inbox — backend returns invitations for this supplier
                const res = await apiClient.get("/api/rfi/invitations") as any;
                const raw = res.content || (Array.isArray(res) ? res : []);
                setItems(raw);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load RFI inbox");
            } finally {
                setLoading(false);
            }
        };
        fetchInbox();
    }, []);

    const getCTA = (item: RFIInboxItem) => {
        if (item.status === "SUBMITTED") {
            return (
                <Button variant="outline" size="sm" onClick={() => router.push(`/supplier/rfi/${item.rfiId}`)}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-600" /> View Submitted
                </Button>
            );
        }
        if (item.status === "IN_PROGRESS") {
            return (
                <Button size="sm" onClick={() => router.push(`/supplier/rfi/${item.rfiId}`)}>
                    Continue <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
            );
        }
        if (item.status === "EXPIRED") {
            return (
                <Button variant="outline" size="sm" disabled>
                    Expired
                </Button>
            );
        }
        return (
            <Button size="sm" onClick={() => router.push(`/supplier/rfi/${item.rfiId}`)}>
                Start <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
        );
    };

    const stats = {
        total: items.length,
        pending: items.filter((i) => i.status === "SENT" || i.status === "VIEWED").length,
        inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
        submitted: items.filter((i) => i.status === "SUBMITTED").length,
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 p-4 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <ClipboardList className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h1 data-testid="rfi-inbox-heading" className="text-3xl font-extrabold text-[#1e293b] tracking-tight">RFI Inbox</h1>
                    <p className="text-muted-foreground text-sm">Requests for Information from buyers</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total", value: stats.total },
                    { label: "Action Required", value: stats.pending, color: "text-amber-600" },
                    { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
                    { label: "Submitted", value: stats.submitted, color: "text-green-600" },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardHeader className="py-4 px-5">
                            <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                            <div className={`text-2xl font-bold ${s.color ?? "text-slate-700"}`}>{s.value}</div>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All RFI Invitations</CardTitle>
                    <CardDescription>Click a row or use the action button to respond</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>RFI Title</TableHead>
                                    <TableHead>Buyer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Deadline</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow
                                        key={item.invitationId ?? item.rfiId}
                                        data-testid={`rfi-invitation-row-${item.invitationId ?? item.rfiId}`}
                                        className="cursor-pointer hover:bg-slate-50"
                                        onClick={() => router.push(`/supplier/rfi/${item.rfiId}`)}
                                    >
                                        <TableCell className="font-medium">{item.rfiTitle}</TableCell>
                                        <TableCell>
                                            {item.buyerName ? (
                                                <span className="flex items-center gap-1.5 text-sm">
                                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {item.buyerName}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <RFIStatusBadge status={item.status} />
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1.5 text-sm">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                {new Date(item.deadline).toLocaleDateString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="min-w-[120px]">
                                            {item.completionPercent !== undefined ? (
                                                <RFIProgressBar percent={item.completionPercent} size="sm" />
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className="text-right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {getCTA(item)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-16">
                                            <ClipboardList className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-muted-foreground">No RFI invitations yet.</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Buyers will invite you to respond to Requests for Information here.
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
