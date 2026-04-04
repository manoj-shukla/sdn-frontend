"use client";

import { Badge } from "@/components/ui/badge";
import type { RFIEventStatus, RFITemplateStatus, InvitationStatus, SupplierEvaluationStatus } from "@/types/rfi";

type AnyRFIStatus = RFIEventStatus | RFITemplateStatus | InvitationStatus | SupplierEvaluationStatus;

const STATUS_CONFIG: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; label: string }> = {
    // Event statuses
    DRAFT: { variant: "secondary", label: "DRAFT" },
    SCHEDULED: { variant: "warning", label: "SCHEDULED" },
    OPEN: { variant: "success", label: "OPEN" },
    CLOSED: { variant: "outline", label: "CLOSED" },
    CONVERTED: { variant: "default", label: "CONVERTED" },
    // Template statuses
    PUBLISHED: { variant: "success", label: "PUBLISHED" },
    ARCHIVED: { variant: "destructive", label: "ARCHIVED" },
    // Invitation statuses
    SENT: { variant: "secondary", label: "SENT" },
    VIEWED: { variant: "warning", label: "VIEWED" },
    IN_PROGRESS: { variant: "warning", label: "IN PROGRESS" },
    SUBMITTED: { variant: "success", label: "SUBMITTED" },
    EXPIRED: { variant: "destructive", label: "EXPIRED" },
    // Evaluation statuses
    PENDING: { variant: "secondary", label: "PENDING" },
    SHORTLISTED: { variant: "success", label: "SHORTLISTED" },
    REJECTED: { variant: "destructive", label: "REJECTED" },
    UNDER_REVIEW: { variant: "warning", label: "UNDER REVIEW" },
};

interface Props {
    status: AnyRFIStatus | string;
    className?: string;
}

export function RFIStatusBadge({ status, className }: Props) {
    const config = STATUS_CONFIG[status] ?? { variant: "secondary" as const, label: status };
    return (
        <Badge variant={config.variant} className={className}>
            {config.label}
        </Badge>
    );
}
