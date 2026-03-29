"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Loader2, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface StepDetail {
    stepInstanceId: number;
    stepOrder: number;
    stepName: string;
    assignedRoleId: number;
    status: 'COMPLETED' | 'PENDING' | 'WAITING' | 'REJECTED' | 'REWORK_REQUIRED' | 'APPROVED';
    isOptional: boolean;
    actionByUsername?: string;
    actionByRole?: string;
    comments?: string;
}

interface WorkflowExecution {
    instanceId: number;
    supplierId: number;
    workflowId: number;
    workflowName: string;
    currentStepOrder: number;
    status: string;
    submissionType: string;
    startedAt: string;
    completedAt?: string;
    rejectedAt?: string;
    steps?: StepDetail[];
}

interface ApprovalWorkflowProgressProps {
    supplierId: number;
    isSupplierView?: boolean;
}

export function ApprovalWorkflowProgress({ supplierId, isSupplierView = false }: ApprovalWorkflowProgressProps) {
    const [execution, setExecution] = useState<WorkflowExecution | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchExecution = async () => {
            try {
                setLoading(true);
                // First get all executions for the supplier
                const execsRes = await apiClient.get(`/api/executions?supplierId=${supplierId}`);
                const execs = Array.isArray(execsRes) ? execsRes : ((execsRes as any)?.executions || (execsRes as any)?.data || []);

                // Find the most recent active or completed execution
                const targetExec = execs?.sort((a: any, b: any) =>
                    new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
                )[0];

                if (targetExec?.instanceId) {
                    // Fetch full details including steps
                    const detailRes = await apiClient.get(`/api/executions/${targetExec.instanceId}`) as WorkflowExecution;
                    setExecution(detailRes);
                } else {
                    setExecution(null);
                }
            } catch (err) {
                console.error("Failed to fetch workflow execution data", err);
                setError("Could not load workflow status.");
            } finally {
                setLoading(false);
            }
        };

        if (supplierId) {
            fetchExecution();
        }
    }, [supplierId]);

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Loading approval status...
                </CardContent>
            </Card>
        );
    }

    if (error || !execution) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Approval Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-center border rounded-lg border-dashed bg-muted/10">
                        {error ? (
                            <>
                                <AlertCircle className="w-8 h-8 mb-2 text-destructive" />
                                <p>{error}</p>
                            </>
                        ) : (
                            <>
                                <Clock className="w-8 h-8 mb-2" />
                                <p>No active approval workflow found for this supplier.</p>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { steps = [] } = execution;
    const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
            case 'APPROVED': // Sometimes mapped locally
                return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'PENDING':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'REJECTED':
                return <XCircle className="w-5 h-5 text-destructive" />;
            case 'REWORK_REQUIRED':
                return <AlertCircle className="w-5 h-5 text-amber-500" />;
            default:
                return <div className="w-5 h-5 rounded-full border-2 border-muted" />; // WAITING
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
            case 'APPROVED':
                return <Badge variant="success">Completed</Badge>;
            case 'PENDING':
                return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
            case 'REJECTED':
                return <Badge variant="destructive">Rejected</Badge>;
            case 'REWORK_REQUIRED':
                return <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">Needs Rework</Badge>;
            default:
                return <Badge variant="secondary" className="text-muted-foreground">Waiting</Badge>;
        }
    };

    // Simplify the supplier view
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                    Approval Progress
                    {!isSupplierView && execution.workflowName && (
                        <Badge variant="outline" className="text-xs font-normal">
                            Workflow: {execution.workflowName}
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    Track the current status of the onboarding approval.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative space-y-0 pl-1">
                    {sortedSteps.map((step, idx) => {
                        const isLast = idx === sortedSteps.length - 1;
                        let displayStatus = step.status;

                        // Treat 'WAITING' steps before the current step as anomaly or skipped, but generally trust stepOrder
                        if (execution.status === 'COMPLETED' && step.status === 'WAITING') {
                            displayStatus = 'COMPLETED'; // If whole flow is done, mark trailing optional steps etc 
                        } else if (idx < execution.currentStepOrder - 1 && step.status === 'WAITING') {
                            displayStatus = 'COMPLETED'; // Previous steps must be done
                        }

                        // Determine visual styling for timeline segment
                        const isPast = displayStatus === 'COMPLETED' || displayStatus === 'APPROVED';
                        const isCurrent = displayStatus === 'PENDING' || displayStatus === 'REWORK_REQUIRED';

                        return (
                            <div key={step.stepInstanceId || idx} className="relative pl-8 pb-8 last:pb-0 group">
                                {/* Vertical Line connecting steps */}
                                {!isLast && (
                                    <div
                                        className={cn(
                                            "absolute left-2.5 top-6 bottom-[-6px] w-px",
                                            isPast ? "bg-emerald-500" : "bg-muted-foreground/20"
                                        )}
                                    />
                                )}

                                {/* Status Node Icon */}
                                <div className="absolute left-0 top-0.5 bg-background rounded-full z-10">
                                    {getStatusIcon(displayStatus)}
                                </div>

                                <div className={cn("flex flex-col gap-1 -mt-1", isPast ? "" : isCurrent ? "" : "opacity-60")}>
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold">{step.stepName}</h4>
                                        {getStatusBadge(displayStatus)}
                                    </div>

                                    {!isSupplierView && (
                                        <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-1">
                                            {step.actionByUsername && (
                                                <span className="font-medium text-foreground/80 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                    Approved by: {step.actionByUsername} {step.actionByRole && <span className="text-muted-foreground font-normal">({step.actionByRole})</span>}
                                                </span>
                                            )}
                                            {step.comments && (
                                                <p className="italic bg-muted/30 p-2 rounded border-l-2 border-muted mt-1">
                                                    "{step.comments}"
                                                </p>
                                            )}
                                            <span className="mt-1">Assigned Role ID: {step.assignedRoleId}</span>
                                            {step.isOptional && <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">(Optional Step)</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {execution.status === 'COMPLETED' && (
                    <div className="mt-8 bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-emerald-900">Workflow Complete</h4>
                            <p className="text-xs text-emerald-700 mt-1">
                                All required approval stages have been finalized.
                            </p>
                        </div>
                    </div>
                )}

                {execution.status === 'REJECTED' && (
                    <div className="mt-8 bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-destructive">Application Rejected</h4>
                            <p className="text-xs text-destructive/80 mt-1">
                                The onboarding application was rejected on {format(new Date(execution.rejectedAt || execution.completedAt || Date.now()), 'PPp')}.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
