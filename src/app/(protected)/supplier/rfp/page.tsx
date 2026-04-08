"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Calendar, Eye, Send, Clock, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SupplierRFPInvite {
    rfpId: string;
    rfpName: string;
    rfpStatus: string;
    currency: string;
    buyerName?: string;
    deadline?: string;
    inviteStatus: string;
    responseStatus?: string;
}

const STATUS_STYLES: Record<string, string> = {
    INVITED: "bg-blue-50 text-blue-700",
    ACCEPTED: "bg-indigo-50 text-indigo-700",
    DECLINED: "bg-rose-50 text-rose-700",
    SUBMITTED: "bg-green-50 text-green-700",
    AWARDED: "bg-violet-50 text-violet-700",
};

const RFP_STATUS_STYLES: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    OPEN: "bg-green-100 text-green-700",
    CLOSED: "bg-amber-100 text-amber-700",
    AWARDED: "bg-violet-100 text-violet-700",
    ARCHIVED: "bg-gray-100 text-gray-500",
};

export default function SupplierRFPPage() {
    const router = useRouter();
    const [invites, setInvites] = useState<SupplierRFPInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [respondingId, setRespondingId] = useState<string | null>(null);

    const fetchInvites = () => {
        apiClient.get("/api/rfp/my/invitations")
            .then((res: any) => setInvites(Array.isArray(res) ? res : []))
            .catch(() => toast.error("Failed to load RFP invitations"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchInvites(); }, []);

    const handleInvitationResponse = async (rfpId: string, action: "accept" | "decline") => {
        setRespondingId(rfpId + action);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/invitation/respond`, { action });
            toast.success(action === "accept" ? "Invitation accepted." : "Invitation declined.");
            fetchInvites();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to respond to invitation");
        } finally {
            setRespondingId(null);
        }
    };

    const getDaysLeft = (deadline?: string) => {
        if (!deadline) return null;
        return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    };

    const stats = [
        { label: "Invitations", value: invites.length, color: "text-indigo-600", accent: "bg-indigo-500" },
        { label: "Active RFPs", value: invites.filter(i => i.rfpStatus === "OPEN").length, color: "text-green-600", accent: "bg-green-500" },
        { label: "Submitted", value: invites.filter(i => i.responseStatus === "SUBMITTED").length, color: "text-blue-600", accent: "bg-blue-500" },
        { label: "Awarded", value: invites.filter(i => i.inviteStatus === "AWARDED").length, color: "text-violet-600", accent: "bg-violet-500" },
    ];

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">RFP Invitations</h1>
                    <p className="text-sm text-muted-foreground">View and respond to sourcing requests</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map(s => (
                    <Card key={s.label} className="relative overflow-hidden">
                        <div className={`h-0.5 ${s.accent}`} />
                        <div className="px-5 py-4">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Invitations List */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : invites.length === 0 ? (
                        <div className="text-center py-16">
                            <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                            <p className="text-muted-foreground">No RFP invitations yet.</p>
                            <p className="text-sm text-slate-400">You will see invitations here when buyers send you RFPs to quote.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {invites.map(invite => {
                                const daysLeft = getDaysLeft(invite.deadline);
                                const isExpired = daysLeft !== null && daysLeft <= 0;
                                const isUrgent = daysLeft !== null && daysLeft > 0 && daysLeft < 3;
                                const canRespond = invite.rfpStatus === "OPEN" && invite.responseStatus !== "SUBMITTED" && invite.inviteStatus !== "DECLINED";
                                const isPending = invite.inviteStatus === "INVITED";
                                const isAwarded = invite.inviteStatus === "AWARDED";

                                return (
                                    <div key={invite.rfpId} className={cn(
                                        "flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors",
                                        isAwarded && "bg-violet-50/40"
                                    )}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {isAwarded && <Trophy className="h-4 w-4 text-violet-600 flex-shrink-0" />}
                                                <span className="font-semibold text-sm">{invite.rfpName}</span>
                                                <Badge variant="outline" className={cn("text-[10px]", RFP_STATUS_STYLES[invite.rfpStatus])}>
                                                    {invite.rfpStatus}
                                                </Badge>
                                                <Badge variant="secondary" className={cn("text-[10px]", STATUS_STYLES[invite.inviteStatus])}>
                                                    {invite.responseStatus === "SUBMITTED" && invite.inviteStatus !== "AWARDED"
                                                        ? "Response Submitted"
                                                        : invite.inviteStatus}
                                                </Badge>
                                            </div>
                                            {invite.buyerName && (
                                                <p className="text-xs text-muted-foreground mt-0.5">from {invite.buyerName}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                                <span>{invite.currency}</span>
                                                {invite.deadline && (
                                                    <span className={cn("flex items-center gap-1", isExpired ? "text-rose-500" : isUrgent ? "text-amber-600" : "")}>
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(invite.deadline).toLocaleDateString()}
                                                        {daysLeft !== null && !isExpired && (
                                                            <span className={isUrgent ? "text-amber-600 font-medium" : ""}>
                                                                ({daysLeft}d left)
                                                            </span>
                                                        )}
                                                        {isExpired && <span className="text-rose-500">(Expired)</span>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Pending invitation — show Accept / Decline */}
                                            {isPending && invite.rfpStatus === "OPEN" && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1.5 border-rose-300 text-rose-600 hover:bg-rose-50"
                                                        disabled={!!respondingId}
                                                        onClick={() => handleInvitationResponse(invite.rfpId, "decline")}
                                                    >
                                                        {respondingId === invite.rfpId + "decline"
                                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            : <XCircle className="h-3.5 w-3.5" />}
                                                        Decline
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                                                        disabled={!!respondingId}
                                                        onClick={() => handleInvitationResponse(invite.rfpId, "accept")}
                                                    >
                                                        {respondingId === invite.rfpId + "accept"
                                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                        Accept
                                                    </Button>
                                                </>
                                            )}

                                            {/* Accepted & can respond */}
                                            {!isPending && invite.responseStatus === "SUBMITTED" ? (
                                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-green-600" onClick={() => router.push(`/supplier/rfp/${invite.rfpId}`)}>
                                                    <Eye className="h-3.5 w-3.5" /> View Response
                                                </Button>
                                            ) : !isPending && canRespond ? (
                                                <Button size="sm" className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push(`/supplier/rfp/${invite.rfpId}`)}>
                                                    <Send className="h-3.5 w-3.5" /> Submit Quote
                                                </Button>
                                            ) : !isPending && invite.responseStatus === "DRAFT" ? (
                                                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => router.push(`/supplier/rfp/${invite.rfpId}`)}>
                                                    <Clock className="h-3.5 w-3.5" /> Continue
                                                </Button>
                                            ) : !isPending && invite.inviteStatus !== "DECLINED" ? (
                                                <Button variant="ghost" size="sm" className="h-8" onClick={() => router.push(`/supplier/rfp/${invite.rfpId}`)}>
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
