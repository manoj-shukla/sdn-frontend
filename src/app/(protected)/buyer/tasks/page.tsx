"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { Button } from "@/components/ui/button";
import { useBuyerRole } from "@/app/(protected)/buyer/context/BuyerRoleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, AlertCircle, Calendar, FileText, ChevronRight, ChevronDown, Building2, MapPin, Wallet, FileCheck, Loader2, RefreshCw, Eye, Shield, ShieldCheck, Settings, Clock, RotateCcw, MessageSquare, StickyNote } from 'lucide-react';
import { toast } from "sonner";

interface ApprovalTask {
    stepInstanceId: number;
    instanceId: number;
    stepOrder: number;
    stepName: string;
    status: string;
    supplierName: string;
    supplierId: number;
    workflowName: string;
    assignedRoleId: number;
    startedAt?: string;
    // Company Details
    website?: string;
    description?: string;
    country?: string;
    // Finance Details
    bankName?: string;
    accountNumber?: string;
    taxId?: string;
    isGstRegistered?: boolean;
    gstin?: string;
    // Documents
    documents?: any[];
    addresses?: any[];
    contacts?: any[];
    // Change Request specifics
    isChangeRequest?: boolean;
    items?: any[];
    submissionType?: 'INITIAL' | 'RESUBMISSION' | 'UPDATE';
    proposed?: any; // New backend-provided proposed state
}

// Safely convert backend documents payload (array | JSON string | null) to an array
const normalizeDocuments = (docs: any): any[] => {
    if (!docs) return [];
    if (Array.isArray(docs)) return docs;
    if (typeof docs === "string") {
        try { const parsed = JSON.parse(docs); return Array.isArray(parsed) ? parsed : []; }
        catch { return []; }
    }
    return [];
};

export default function TasksPage() {
    const { user } = useAuthStore();
    const { role } = useBuyerRole(); // Get simulated role
    console.log("[ApprovalsPage] role:", role, "userId:", user?.userId, "buyerId:", user?.buyerId);
    const [tasks, setTasks] = useState<ApprovalTask[]>([]);
    const [showFullProfile, setShowFullProfile] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    // Document Preview State
    const [previewDoc, setPreviewDoc] = useState<string | null>(null);



    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [user, role]);

    const fetchTasks = async () => {
        try {
            setIsLoading(true);
            const results = await Promise.allSettled([
                apiClient.get('/api/approvals/pending'),
                apiClient.get('/api/change-requests/pending')
            ]);

            const onboardingRes = results[0].status === 'fulfilled' ? results[0].value : [];
            const changeReqRes = results[1].status === 'fulfilled' ? results[1].value : [];

            if (results[0].status === 'rejected') console.error("Onboarding fetch failed:", (results[0] as any).reason);
            if (results[1].status === 'rejected') console.error("Change requests fetch failed:", (results[1] as any).reason);

            const onboardingTasks: ApprovalTask[] = (onboardingRes as any[] || []).map(t => ({
                stepInstanceId: t.stepInstanceId || t.stepinstanceid,
                instanceId: t.instanceId || t.instanceid,
                stepOrder: t.stepOrder || t.steporder,
                stepName: t.stepName || t.stepname,
                status: t.status,
                supplierName: t.supplierName || t.suppliername,
                supplierId: t.supplierId || t.supplierid,
                workflowName: t.workflowName || t.workflowname || 'Onboarding',
                assignedRoleId: t.assignedRoleId || t.assignedroleid,
                startedAt: t.startedAt || t.startedat || t.sentAt || t.sentat || t.requestedAt || t.requestedat,
                website: t.website,
                description: t.description,
                country: t.country,
                bankName: t.bankName || t.bankname,
                accountNumber: t.accountNumber || t.accountnumber,
                taxId: t.taxId || t.taxid,
                isGstRegistered: t.isGstRegistered || t.isgstregistered,
                gstin: t.gstin,
                documents: normalizeDocuments(t.documents),
                addresses: normalizeDocuments(t.addresses),
                contacts: normalizeDocuments(t.contacts),
                submissionType: t.submissionType || t.submissiontype
            }));

            // Map Change Requests with robust casing and property checks
            const changeTasks: ApprovalTask[] = (changeReqRes as any[] || []).map(t => {
                const rid = t.requestId || t.requestid || 0;
                const sid = t.supplierId || t.supplierid;

                const normalizedUserRole = (role || '').toLowerCase();
                let stepName = 'Profile Update Review';
                if (normalizedUserRole.includes('procurement')) stepName = 'Procurement Update Review';
                else if (normalizedUserRole.includes('finance')) stepName = 'Finance Update Review';
                else if (normalizedUserRole.includes('compliance')) stepName = 'Compliance Update Review';
                else if (normalizedUserRole.includes('ap')) stepName = 'AP Update Review';

                console.log(`[ApprovalsPage] Mapping changeTask for supplier: ${t.supplierName}, role: ${role}, assigned stepName: ${stepName}`);

                return {
                    stepInstanceId: rid + 1000000, // Offset for uniqueness
                    instanceId: rid,
                    stepOrder: 0,
                    stepName: stepName,
                    status: t.status,
                    supplierName: t.supplierName || t.suppliername || 'Unknown Supplier',
                    supplierId: sid,
                    workflowName: 'Change Request',
                    assignedRoleId: 0,
                    startedAt: t.requestedAt || t.requestedat,
                    isChangeRequest: true,
                    items: t.items || [],
                    submissionType: 'UPDATE',
                    website: t.website || t.Website || t.WEBSITE,
                    description: t.description || t.Description || t.DESCRIPTION,
                    country: t.country || t.Country || t.COUNTRY,
                    bankName: t.bankName || t.bankname || t.supplierBankName || t.supplierbankname,
                    accountNumber: t.accountNumber || t.accountnumber,
                    taxId: t.taxId || t.taxid,
                    isGstRegistered: t.isGstRegistered || t.isgstregistered,
                    gstin: t.gstin,
                    documents: normalizeDocuments(t.documents || t.proposed?.documents),
                    addresses: normalizeDocuments(t.addresses || t.proposed?.addresses),
                    contacts: normalizeDocuments(t.contacts || t.proposed?.contacts),
                    proposed: t.proposed || undefined
                };
            });

            // Merge and Deduplicate: Merge 'proposed' from changeTasks into onboardingTasks
            changeTasks.forEach(ct => {
                const overlappingOnboardingTasks = onboardingTasks.filter(ot =>
                    ot.supplierId === ct.supplierId &&
                    ot.submissionType === 'UPDATE'
                );
                
                if (overlappingOnboardingTasks.length > 0) {
                    // Copy proposed state to all overlapping workflow tasks so UI renders correctly
                    overlappingOnboardingTasks.forEach(ot => {
                        ot.proposed = ct.proposed;
                        // Also merge items if onboarding task doesn't have them
                        if (!ot.items || ot.items.length === 0) {
                            ot.items = ct.items;
                        } else {
                            // Merge missing items
                            const existingItemIds = new Set(ot.items.map((i: any) => i.itemId));
                            const itemsToAdd = (ct.items || []).filter((i: any) => !existingItemIds.has(i.itemId));
                            ot.items = [...ot.items, ...itemsToAdd];
                        }
                    });
                }
            });

            const filteredChangeTasks = changeTasks.filter(ct => {
                return !onboardingTasks.some(ot =>
                    ot.supplierId === ct.supplierId &&
                    ot.submissionType === 'UPDATE'
                );
            });

            setTasks([...onboardingTasks, ...filteredChangeTasks]);
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getFilteredTasks = () => {
        return tasks;
    };

    const filteredTasks = getFilteredTasks();

    const getRelativeTime = (dateStr?: string) => {
        if (!dateStr) return 'Unknown';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            if (isNaN(diffMs)) return 'Unknown';
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            if (diffMins < 60) return `${Math.max(0, diffMins)}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return `${diffDays}d ago`;
        } catch (e) { return 'Invalid date'; }
    };

    const handleAction = async (task: any, action: 'APPROVE' | 'REJECT' | 'REWORK' | 'NOTE', comments?: string) => {
        setProcessingId(task.stepInstanceId);
        try {
            // Direct change requests (no backing workflow) have stepOrder === 0.
            // Workflow-backed change requests (workflowtemplateid = 0) come through
            // the approvals/pending endpoint and have a real stepOrder — they must use
            // the workflow approval route, NOT the change-request route.
            const isDirectChangeRequest = task.workflowName === 'Change Request' && task.stepOrder === 0;

            if (isDirectChangeRequest) {
                let res: any = null;
                if (action === 'APPROVE') {
                    res = await apiClient.post(`/api/change-requests/${task.instanceId}/approve`, {});
                } else if (action === 'REJECT' || action === 'REWORK') {
                    const reason = action === 'REWORK' ? `[REWORK REQUESTED] ${comments}` : comments;
                    res = await apiClient.post(`/api/change-requests/${task.instanceId}/reject`, { reason });
                }
                // Show contextual toast: if already processed by this role, say so
                const resData = res as any;
                const toastMsg = action === 'APPROVE'
                    ? (resData?.status === 'ROLE_COMPLETE' ? 'Your items were already processed — other roles still have pending items.' : 'Approved successfully')
                    : action === 'REJECT' ? 'Rejected' : 'Sent for rework';
                toast.success(toastMsg);
                // Optimistically remove this task while the server re-fetches the authoritative list
                setTasks(prev => prev.filter(t => t.stepInstanceId !== task.stepInstanceId));
                setExpandedSupplier(null);
                fetchTasks();
                return;
            }

            // All other tasks (onboarding steps + workflow-backed change requests)
            const endpoint = action === 'APPROVE' ? 'approve' :
                action === 'REJECT' ? 'reject' :
                    action === 'REWORK' ? 'rework' : 'note';

            await apiClient.post(`/api/approvals/${task.instanceId}/${endpoint}`, {
                stepOrder: task.stepOrder,
                stepInstanceId: task.stepInstanceId,  // ensures only this specific parallel step is updated
                comments: comments || `${action} via Portal`
            });
            if (action !== 'NOTE') {
                const actionMsgs = { 'APPROVE': 'Approved', 'REJECT': 'Rejected', 'REWORK': 'Rework Requested' };
                toast.success(`${actionMsgs[action] || action} successfully`);
                // Optimistically remove this step while re-fetching (next step may re-appear if it's now pending)
                setTasks(prev => prev.filter(t => t.stepInstanceId !== task.stepInstanceId));
                setExpandedSupplier(null);
                fetchTasks();
            } else toast.success("Note added successfully");
        } catch (error: any) {
            console.error("Action failed", error);
            const msg = error.response?.data?.error || "Action failed. Please try again.";
            toast.error(`Error: ${msg}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleVerifyDocument = async (documentId: number, status: 'VERIFIED' | 'REJECTED') => {
        try {
            await apiClient.put(`/api/documents/${documentId}/verify`, { status });
            // Update local state directly instead of full refresh for better UX
            setTasks(prevTasks => prevTasks.map(task => {
                if (task.documents) {
                    const updatedDocuments = task.documents.map(doc =>
                        doc.documentId === documentId ? { ...doc, verificationStatus: status } : doc
                    );
                    return { ...task, documents: updatedDocuments };
                }
                return task;
            }));
        } catch (error: any) {
            console.error("Failed to verify document", error);
            const msg = error.response?.data?.error || "Failed to update document status";
            toast.error(`Error: ${msg}`);
        }
    };

    const groupedTasks = filteredTasks.reduce((acc, task) => {
        if (!acc[task.supplierId]) {
            acc[task.supplierId] = {
                supplierName: task.supplierName,
                tasks: []
            };
        }
        acc[task.supplierId].tasks.push(task);
        return acc;
    }, {} as Record<number, { supplierName: string, tasks: ApprovalTask[] }>);

    const [expandedSupplier, setExpandedSupplier] = useState<number | null>(null);

    // Auto-expand logic removed to fix "Back" button issue.
    // Previously, if only 1 supplier existed, it would force expand, preventing the user from going back to the list.
    useEffect(() => {
        const keys = Object.keys(groupedTasks);
        if (expandedSupplier && !groupedTasks[expandedSupplier]) {
            setExpandedSupplier(null);
        }
    }, [filteredTasks.length, expandedSupplier, groupedTasks]);

    // Admin (Buyer Admin) can now access this page for global oversight.


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
                <p className="text-muted-foreground">Pending tasks grouped by supplier.</p>
                <Badge variant="secondary" className="mt-2">
                    Viewing as: {role}
                </Badge>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchTasks()} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border rounded-lg border-dashed bg-muted/10 text-center">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">All caught up!</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                        You have no pending approval tasks.
                    </p>
                </div>
            ) : (expandedSupplier && groupedTasks[expandedSupplier]) ? (
                <div className="space-y-4">
                    <Button variant="ghost" onClick={() => setExpandedSupplier(null)} className="pl-0 hover:pl-2 transition-all">
                        ← Back to Folders
                    </Button>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle>{groupedTasks[expandedSupplier].supplierName}</CardTitle>
                                <CardDescription>Review and take action on pending items.</CardDescription>
                            </div>
                            <div className="flex items-center space-x-2 bg-muted/30 px-3 py-1.5 rounded-full border border-muted-foreground/10">
                                <label className="text-xs font-medium cursor-pointer flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={showFullProfile}
                                        onChange={(e) => setShowFullProfile(e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-gray-300 focus:ring-primary"
                                    />
                                    View Full Profile
                                </label>
                            </div>
                        </CardHeader>
                        <div className="p-6 pt-0 space-y-6">
                            {(() => {
                                const supplierTasks = groupedTasks[expandedSupplier].tasks;
                                const baseTask = supplierTasks[0]; // Share data from first available task

                                // Helper: Render Actions (Defined as function to avoid React remount issues)
                                const isAdminRole = (role?.toLowerCase() || '').includes('admin');

                                const renderActions = (task: ApprovalTask, isDisabled: boolean = false) => {
                                    if (isDisabled || isAdminRole) {
                                        return (
                                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t opacity-60">
                                                <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                                                    <Eye className="w-3 h-3" />
                                                    {isAdminRole ? 'Admin oversight — no approval action required' : 'Pending other steps'}
                                                </span>
                                            </div>
                                        );
                                    }

                                    const hasPendingDocuments = (task.documents || []).some((doc: any) =>
                                        !doc.verificationStatus || doc.verificationStatus === 'PENDING'
                                    );

                                    const hasPendingDocumentChanges = (task.items || []).some((item: any) => {
                                        const isDoc = (item.fieldName || item.fieldname) === 'documents';
                                        return isDoc && (!item.status || item.status === 'PENDING');
                                    });

                                    const isApproveDisabled = processingId === task.stepInstanceId || hasPendingDocuments || hasPendingDocumentChanges;

                                    return (
                                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                            <Dialog>
                                                <DialogTrigger asChild><Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">Reject</Button></DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader><DialogTitle>Reject Application</DialogTitle><DialogDescription>Reason for rejection (visible to supplier).</DialogDescription></DialogHeader>
                                                    <div className="py-2"><textarea id={`comment-reject-${task.stepInstanceId}`} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Reason..." /></div>
                                                    <DialogFooter><Button variant="destructive" onClick={() => { const comment = (document.getElementById(`comment-reject-${task.stepInstanceId}`) as HTMLTextAreaElement).value; if (!comment) return toast.error("Comment is required"); handleAction(task, 'REJECT', comment); }}>Confirm Rejection</Button></DialogFooter>
                                                </DialogContent>
                                            </Dialog>

                                            <Dialog>
                                                <DialogTrigger asChild><Button variant="outline" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"><RotateCcw className="mr-2 h-4 w-4" /> Rework</Button></DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader><DialogTitle>Request Rework</DialogTitle><DialogDescription>Explain what needs to be fixed.</DialogDescription></DialogHeader>
                                                    <div className="py-2"><textarea id={`comment-rework-${task.stepInstanceId}`} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Instructions..." /></div>
                                                    <DialogFooter><Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { const comment = (document.getElementById(`comment-rework-${task.stepInstanceId}`) as HTMLTextAreaElement).value; if (!comment) return toast.error("Instructions are required"); handleAction(task, 'REWORK', comment); }}>Send for Rework</Button></DialogFooter>
                                                </DialogContent>
                                            </Dialog>

                                            <Dialog>
                                                <DialogTrigger asChild><Button variant="ghost" size="icon" title="Add Note"><StickyNote className="h-4 w-4 text-muted-foreground" /></Button></DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader><DialogTitle>Add Internal Note</DialogTitle><DialogDescription>Not visible to supplier.</DialogDescription></DialogHeader>
                                                    <div className="py-2"><textarea id={`comment-note-${task.stepInstanceId}`} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Note..." /></div>
                                                    <DialogFooter><Button onClick={() => { const comment = (document.getElementById(`comment-note-${task.stepInstanceId}`) as HTMLTextAreaElement).value; if (!comment) return toast.error("Note content is required"); handleAction(task, 'NOTE', comment); }}>Save Note</Button></DialogFooter>
                                                </DialogContent>
                                            </Dialog>

                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        disabled={isApproveDisabled}
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        title={hasPendingDocuments || hasPendingDocumentChanges ? "All documents must be approved or rejected before approving." : ""}
                                                    >
                                                        {processingId === task.stepInstanceId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Approve
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Approve Application</DialogTitle>
                                                        <DialogDescription>Add any final comments or instructions for the supplier.</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-2">
                                                        <label htmlFor={`comment-approve-${task.stepInstanceId}`} className="text-xs font-medium mb-1 block">Comments (Optional)</label>
                                                        <textarea
                                                            id={`comment-approve-${task.stepInstanceId}`}
                                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                            placeholder="Comments (optional)..."
                                                        />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                            onClick={async () => {
                                                                const comment = (document.getElementById(`comment-approve-${task.stepInstanceId}`) as HTMLTextAreaElement).value;
                                                                await handleAction(task, 'APPROVE', comment);
                                                            }}
                                                        >
                                                            Final Approval
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    );
                                };

                                // Helper: Get consolidated data - NOW JUST RETURNS THE TASK'S PROPOSED DATA
                                const getConsolidatedData = () => {
                                    // Use backend-provided 'proposed' object if available
                                    if (baseTask.proposed) {
                                        // CRITICAL: Merge 'items' back in so the UI can calculate Diffs (Old vs New)
                                        return {
                                            ...baseTask.proposed,
                                            items: baseTask.items
                                        };
                                    }

                                    // Fallback for legacy/other tasks (though backend should now always provide proposed for change requests)
                                    return baseTask;
                                };

                                const consolidatedData = getConsolidatedData();

                                // Helper: Render Primary Profile Details (Used in consolidated views)
                                const renderProfileDetails = (data: ApprovalTask) => {
                                    const renderComparisonField = (label: string, fieldKey: string, currentValue: any) => {
                                        // Check consolidated items for a change
                                        const change = consolidatedData.items?.find((i: any) => (i.fieldName || i.fieldname || '').toLowerCase() === fieldKey.toLowerCase());
                                        if (change) {
                                            return (
                                                <div className="space-y-1">
                                                    <div className="font-medium text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] text-muted-foreground line-through decoration-orange-300 opacity-60 truncate">
                                                            {change.oldValue || change.oldvalue || '(Empty)'}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="text-sm font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 flex items-center gap-1">
                                                                <ChevronRight className="h-3 w-3" /> {change.newValue || change.newvalue}
                                                            </div>
                                                            <Badge variant="outline" className="text-[9px] h-4 bg-orange-100/50 border-orange-200 text-orange-600 px-1 font-bold">UPDATED</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="space-y-1">
                                                <div className="font-medium text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
                                                <div className="font-semibold text-sm">{currentValue || 'N/A'}</div>
                                            </div>
                                        );
                                    };

                                    return (
                                        <div className="space-y-6 pt-5 border-t mt-4">
                                            <div className="grid md:grid-cols-2 gap-6 text-sm">
                                                {renderComparisonField('Legal Name', 'legalName', data.supplierName || consolidatedData.supplierName)}
                                                {renderComparisonField('Website', 'website', data.website || consolidatedData.website)}
                                                <div className="col-span-2 space-y-1">
                                                    {renderComparisonField('Description', 'description', data.description || consolidatedData.description)}
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Registered Address</h5>
                                                    {(() => {
                                                        const primary = consolidatedData.addresses?.find((a: any) => a.isPrimary);
                                                        const first = consolidatedData.addresses?.[0];
                                                        const addr = primary || first;

                                                        if (!addr) return <p className="text-xs text-muted-foreground italic">No address details.</p>;

                                                        return (
                                                            <div className="text-xs border-l-2 border-primary/20 pl-3 py-0.5 space-y-0.5">
                                                                <div className="font-medium">{addr.addressLine1}</div>
                                                                {addr.addressLine2 && <div>{addr.addressLine2}</div>}
                                                                {/* Only render City/State/Postal line if at least one exists */}
                                                                {(addr.city || addr.postalCode || addr.state) && (
                                                                    <div className="text-muted-foreground">
                                                                        {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
                                                                    </div>
                                                                )}
                                                                {addr.country && <div className="text-muted-foreground font-medium">{addr.country}</div>}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="space-y-2">
                                                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Primary Contact</h5>
                                                    {(() => {
                                                        const primary = consolidatedData.contacts?.find((c: any) => c.isPrimary);
                                                        const first = consolidatedData.contacts?.[0];
                                                        const c = primary || first;

                                                        if (!c) return <p className="text-xs text-muted-foreground italic">No contact details.</p>;

                                                        return (
                                                            <div className="text-xs border-l-2 border-primary/20 pl-3 py-0.5 space-y-0.5">
                                                                <div className="font-medium">{c.firstName} {c.lastName}</div>
                                                                <div className="text-blue-600">{c.email}</div>
                                                                {c.phone && <div className="text-muted-foreground">{c.phone}</div>}
                                                                {c.designation && <div className="text-[10px] bg-muted px-1.5 py-0.5 rounded inline-block mt-1">{c.designation}</div>}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                };

                                const sections = [
                                    {
                                        id: 'procurement',
                                        title: 'Procurement Review',
                                        icon: Building2,
                                        color: 'blue',
                                        tasks: supplierTasks.filter((t: any) =>
                                            /procurement/i.test(t.stepName) ||
                                            (t.isChangeRequest && role?.toLowerCase().includes('procurement'))
                                        ),
                                        render: (data: ApprovalTask) => (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200/50 mb-2">
                                                    <div className="flex items-start gap-3">
                                                        <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                                        <div>
                                                            <div className="font-semibold text-blue-900 text-sm">Strategic Review Required</div>
                                                            <p className="text-blue-700 text-xs mt-0.5 leading-relaxed">
                                                                Assessing <strong>{data.supplierName}</strong> for capability, compliance, and strategic fit.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-xs pb-4">
                                                    <div className="bg-muted/30 p-2 rounded">
                                                        <div className="text-muted-foreground mb-1 uppercase tracking-tight font-bold text-[9px]">Country</div>
                                                        <div className="font-medium">{data.country || (data as any).proposed?.country || 'N/A'}</div>
                                                    </div>
                                                    <div className="bg-muted/30 p-2 rounded">
                                                        <div className="text-muted-foreground mb-1 uppercase tracking-tight font-bold text-[9px]">Business Type</div>
                                                        <div className="font-medium text-blue-600">{data.isChangeRequest ? 'Update Request' : 'New Onboarding'}</div>
                                                    </div>
                                                </div>
                                                {/* CONSOLIDATED PROFILE DATA */}
                                                {renderProfileDetails(data)}
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'address',
                                        title: 'Company Profile & Contact',
                                        icon: Building2,
                                        color: 'blue',
                                        tasks: supplierTasks.filter((t: any) => /profile/i.test(t.stepName) && !t.isChangeRequest), // Generic profile step
                                        render: (data: ApprovalTask) => (
                                            <div className="space-y-6">
                                                {/* Merged Company Details */}
                                                <div className="grid md:grid-cols-2 gap-6 text-sm border-b pb-6">
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-muted-foreground">Legal Name</div>
                                                        <div>{data.supplierName}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-muted-foreground">Website</div>
                                                        <div>{data.website || 'N/A'}</div>
                                                    </div>
                                                    <div className="col-span-2 space-y-1">
                                                        <div className="font-medium text-muted-foreground">Description</div>
                                                        <div className="text-muted-foreground">{data.description || 'No description provided.'}</div>
                                                    </div>
                                                </div>

                                                {/* Address & Contact */}
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Address</h5>
                                                        {(data.addresses && data.addresses.length > 0) ? data.addresses.filter((a: any) => a.isPrimary).map((addr: any, i: number) => (
                                                            <div key={i} className="text-sm border-l-2 border-l-gray-300 pl-3">
                                                                <div>{addr.addressLine1}</div>
                                                                {addr.addressLine2 && <div>{addr.addressLine2}</div>}
                                                                <div>{addr.city}, {addr.postalCode}</div>
                                                                <div>{addr.country}</div>
                                                            </div>
                                                        )) : <p className="text-sm text-muted-foreground italic">No address details available.</p>}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Contact</h5>
                                                        {(data.contacts && data.contacts.length > 0) ? data.contacts.filter((c: any) => c.isPrimary).map((c: any, i: number) => (
                                                            <div key={i} className="text-sm border-l-2 border-l-gray-300 pl-3">
                                                                <div className="font-medium">{c.firstName} {c.lastName}</div>
                                                                <div className="text-muted-foreground text-xs">{c.email}</div>
                                                                <div className="text-muted-foreground text-xs">{c.phone}</div>
                                                            </div>
                                                        )) : <p className="text-sm text-muted-foreground italic">No contact details available.</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'changes',
                                        title: 'Requested Profile Changes',
                                        icon: RefreshCw,
                                        color: 'orange',
                                        tasks: supplierTasks.filter((t: any) => t.isChangeRequest),
                                        render: (data: ApprovalTask) => {
                                            const normalizedRole = role?.toLowerCase() || '';
                                            const allItems = data.items || [];

                                            // Role-based filtering of change items
                                            const filteredItems = (normalizedRole.includes('admin')) ? allItems : allItems.filter(item => {
                                                const field = (item.fieldName || item.fieldname || '').toLowerCase();

                                                if (normalizedRole.includes('finance')) {
                                                    return /bank|account|tax|gst|pan|swift|ifsc|beneficiary/i.test(field);
                                                }
                                                if (normalizedRole.includes('compliance')) {
                                                    return /legal|name|registration|document|file/i.test(field);
                                                }
                                                if (normalizedRole.includes('procurement')) {
                                                    // Relationship owners see non-sensitive changes for awareness,
                                                    // but sensitive finance data (Bank/Tax) is strictly MASKED.
                                                    const isSensitive = /bank|account|tax|gst|pan|swift|ifsc|beneficiary/i.test(field);
                                                    return !isSensitive;
                                                }
                                                return true; // Fallback for other roles
                                            });

                                            if (filteredItems.length === 0) {
                                                return null; // Let the filter handle hiding the section
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    <div className="bg-orange-50 border border-orange-100 rounded p-3 text-xs text-orange-800 flex items-start gap-2">
                                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                        <p>This supplier has requested updates to their approved profile. Review the changes below.</p>
                                                    </div>
                                                    <div className="border rounded divide-y overflow-hidden">
                                                        <div className="grid grid-cols-3 bg-muted/30 text-[10px] uppercase font-bold tracking-wider px-3 py-2">
                                                            <div>Field</div>
                                                            <div>Current Value</div>
                                                            <div>New Value</div>
                                                        </div>
                                                        {filteredItems.map((item: any, i: number) => {
                                                            const fieldName = item.fieldName || item.fieldname || '';
                                                            const isDoc = fieldName === 'documents';
                                                            const rawNewValue = item.newValue || item.newvalue;
                                                            const rawOldValue = item.oldValue || item.oldvalue;

                                                            // Try to parse JSON values (bank objects, etc.)
                                                            const tryParseJson = (val: any) => {
                                                                if (!val || typeof val !== 'string') return null;
                                                                const trimmed = val.trim();
                                                                if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
                                                                try { return JSON.parse(trimmed); } catch { return null; }
                                                            };

                                                            // Render a parsed object as clean labeled rows
                                                            const renderParsedObject = (obj: Record<string, any>, accent: string = 'orange') => {
                                                                const SKIP_KEYS = new Set(['bankid', 'bankId', 'supplierid', 'supplierId', 'createdat', 'createdAt', 'updatedat', 'updatedAt', 'status']);
                                                                const LABEL_MAP: Record<string, string> = {
                                                                    bankname: 'Bank Name', bankName: 'Bank Name',
                                                                    accountnumber: 'Account Number', accountNumber: 'Account Number',
                                                                    routingnumber: 'Routing Number', routingNumber: 'Routing Number',
                                                                    swiftcode: 'SWIFT / BIC', swiftCode: 'SWIFT / BIC',
                                                                    currency: 'Currency',
                                                                    isprimary: 'Primary Account', isPrimary: 'Primary Account',
                                                                    legalname: 'Legal Name', legalName: 'Legal Name',
                                                                    taxid: 'Tax ID', taxId: 'Tax ID',
                                                                    gstin: 'GSTIN',
                                                                    country: 'Country',
                                                                    website: 'Website',
                                                                };
                                                                const entries = Object.entries(obj).filter(([k]) => !SKIP_KEYS.has(k));
                                                                if (entries.length === 0) return <span className="italic text-muted-foreground text-xs">(empty)</span>;
                                                                return (
                                                                    <div className="divide-y divide-muted rounded border overflow-hidden">
                                                                        {entries.map(([k, v]) => (
                                                                            <div key={k} className="flex items-center gap-3 px-3 py-2 text-xs bg-white">
                                                                                <span className="text-muted-foreground font-medium min-w-[110px] shrink-0">{LABEL_MAP[k] || k}</span>
                                                                                <span className={`font-semibold text-${accent}-700`}>
                                                                                    {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? '—')}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            };

                                                            // Render a possibly-JSON value cell
                                                            const renderValueCell = (rawVal: any, accent: string = 'orange') => {
                                                                if (!rawVal) return <span className="italic text-muted-foreground text-xs">(Empty)</span>;
                                                                const parsed = tryParseJson(rawVal);
                                                                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                                                                    return renderParsedObject(parsed, accent);
                                                                }
                                                                return <span>{String(rawVal)}</span>;
                                                            };

                                                            let displayValue = renderValueCell(rawNewValue, 'orange');
                                                            let oldDisplayValue = renderValueCell(rawOldValue, 'slate');

                                                            if (isDoc && rawNewValue) {
                                                                try {
                                                                    const docMetadata = JSON.parse(rawNewValue);
                                                                    displayValue = (
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <FileText className="h-4 w-4 text-orange-600" />
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium text-xs text-orange-700">{docMetadata.documentName}</span>
                                                                                <span className="text-[10px] text-muted-foreground">{docMetadata.documentType}</span>
                                                                            </div>
                                                                            <div className="ml-auto flex items-center gap-1">
                                                                                {docMetadata.filePath && (
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-6 px-2 text-[10px] border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700"
                                                                                        onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'}/${docMetadata.filePath}`, '_blank')}
                                                                                    >
                                                                                        <Eye className="h-3 w-3 mr-1" /> View
                                                                                    </Button>
                                                                                )}
                                                                                {(item.status === 'PENDING' || !item.status) && (
                                                                                    <>
                                                                                        <Dialog>
                                                                                            <DialogTrigger asChild>
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                                                    title="Approve Document"
                                                                                                >
                                                                                                    <CheckCircle className="h-4 w-4" />
                                                                                                </Button>
                                                                                            </DialogTrigger>
                                                                                            <DialogContent>
                                                                                                <DialogHeader>
                                                                                                    <DialogTitle>Approve Document</DialogTitle>
                                                                                                    <DialogDescription>Are you sure you want to approve this document?</DialogDescription>
                                                                                                </DialogHeader>
                                                                                                <DialogFooter>
                                                                                                    <Button
                                                                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                                                                        onClick={async () => {
                                                                                                            try {
                                                                                                                await apiClient.post(`/api/change-requests/items/${item.itemId}/approve`, { requestId: data.instanceId });
                                                                                                                toast.success("Document Approved");
                                                                                                                fetchTasks();
                                                                                                            } catch (err) {
                                                                                                                console.error(err);
                                                                                                                toast.error("Failed to approve document");
                                                                                                            }
                                                                                                        }}
                                                                                                    >
                                                                                                        Confirm Approval
                                                                                                    </Button>
                                                                                                </DialogFooter>
                                                                                            </DialogContent>
                                                                                        </Dialog>
                                                                                        <Dialog>
                                                                                            <DialogTrigger asChild>
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                                                    title="Reject Document"
                                                                                                >
                                                                                                    <XCircle className="h-4 w-4" />
                                                                                                </Button>
                                                                                            </DialogTrigger>
                                                                                            <DialogContent>
                                                                                                <DialogHeader>
                                                                                                    <DialogTitle>Reject Document</DialogTitle>
                                                                                                    <DialogDescription>Are you sure you want to reject this document?</DialogDescription>
                                                                                                </DialogHeader>
                                                                                                <DialogFooter>
                                                                                                    <Button
                                                                                                        variant="destructive"
                                                                                                        onClick={async () => {
                                                                                                            try {
                                                                                                                await apiClient.post(`/api/change-requests/items/${item.itemId}/reject`, { requestId: data.instanceId });
                                                                                                                toast("Document Rejected");
                                                                                                                fetchTasks();
                                                                                                            } catch (err) {
                                                                                                                console.error(err);
                                                                                                                toast.error("Failed to reject document");
                                                                                                            }
                                                                                                        }}
                                                                                                    >
                                                                                                        Confirm Rejection
                                                                                                    </Button>
                                                                                                </DialogFooter>
                                                                                            </DialogContent>
                                                                                        </Dialog>
                                                                                    </>
                                                                                )}
                                                                                {item.status === 'APPROVED' && <span className="text-[10px] text-green-600 font-bold px-2">APPROVED</span>}
                                                                                {item.status === 'REJECTED' && <span className="text-[10px] text-red-600 font-bold px-2">REJECTED</span>}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                } catch (e) {
                                                                    // Fallback if doc parsing fails
                                                                }
                                                            }

                                                            // Human-readable field label
                                                            const FIELD_LABELS: Record<string, string> = {
                                                                bankname: 'Bank Name', bankName: 'Bank Name',
                                                                accountnumber: 'Account Number', accountNumber: 'Account Number',
                                                                routingnumber: 'Routing Number', routingNumber: 'Routing Number',
                                                                swiftcode: 'SWIFT / BIC', swiftCode: 'SWIFT / BIC',
                                                                currency: 'Currency', isprimary: 'Primary Account', isPrimary: 'Primary Account',
                                                                legalname: 'Legal Name', legalName: 'Legal Name',
                                                                taxid: 'Tax ID', taxId: 'Tax ID',
                                                                documents: 'Document',
                                                                website: 'Website', country: 'Country', description: 'Description',
                                                            };
                                                            const displayLabel = FIELD_LABELS[fieldName] || fieldName;

                                                            // If new value is a parsed object, render the row spanning full width
                                                            const parsedNew = tryParseJson(rawNewValue);
                                                            const isObjectValue = parsedNew && typeof parsedNew === 'object' && !Array.isArray(parsedNew) && !isDoc;

                                                            if (isObjectValue) {
                                                                return (
                                                                    <div key={i} className="px-3 py-3 border-b last:border-b-0 hover:bg-muted/10 transition-colors">
                                                                        <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">{displayLabel}</div>
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div>
                                                                                <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Current</div>
                                                                                <div className="text-sm text-muted-foreground italic">
                                                                                    {rawOldValue ? renderValueCell(rawOldValue, 'slate') : <span className="text-muted-foreground">(None)</span>}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-[10px] font-bold text-orange-600 uppercase mb-1">Proposed</div>
                                                                                <div className="text-sm">{renderParsedObject(parsedNew, 'orange')}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div key={i} className="grid grid-cols-3 text-sm px-3 py-2.5 items-start hover:bg-muted/10 transition-colors border-b last:border-b-0">
                                                                    <div className="font-medium text-xs break-all pr-2 pt-0.5">{displayLabel}</div>
                                                                    <div className="text-muted-foreground italic text-xs" title={rawOldValue}>{oldDisplayValue}</div>
                                                                    <div className="text-orange-600 font-semibold text-xs">{displayValue}</div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    },
                                    {
                                        id: 'invoice',
                                        title: 'Invoice Setup',
                                        icon: Settings,
                                        color: 'indigo',
                                        tasks: supplierTasks.filter((t: any) => /ap|activation|enabler|payable/i.test(t.stepName)),
                                        render: (data: ApprovalTask) => (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-200/50 mb-2 text-sm">
                                                    <div className="font-semibold text-indigo-900 mb-1">AP Setup Required</div>
                                                    <p className="text-indigo-700 text-xs leading-relaxed">
                                                        Final validation of supplier details and activation in the ERP system.
                                                    </p>
                                                </div>
                                                {/* CONSOLIDATED PROFILE DATA */}
                                                {renderProfileDetails(data)}
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'finance',
                                        title: 'Finance & Tax Checklist',
                                        icon: Wallet,
                                        color: 'amber',
                                        tasks: supplierTasks.filter((t: any) =>
                                            /finance/i.test(t.stepName) ||
                                            (t.isChangeRequest && role?.toLowerCase().includes('finance'))
                                        ),
                                        render: (data: ApprovalTask) => (
                                            <div className="space-y-6">
                                                {data.isChangeRequest && (
                                                    <div className="bg-orange-50/50 border border-orange-200/50 rounded-lg p-4 mb-2">
                                                        <div className="flex items-start gap-3">
                                                            <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                                                            <div>
                                                                <div className="font-semibold text-orange-900 text-sm">Proposed Finance Updates</div>
                                                                <p className="text-orange-700 text-xs mt-0.5 leading-relaxed">
                                                                    Review the requested changes to banking and tax details.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 border rounded divide-y overflow-hidden bg-white/50">
                                                            {(() => {
                                                                const financeItems = (data.items || []).filter((item: any) =>
                                                                    /bank|account|tax|gst|pan|swift|ifsc|beneficiary/i.test(item.fieldName || item.fieldname || '')
                                                                );
                                                                if (financeItems.length === 0) return <p className="p-3 text-xs text-muted-foreground italic">No finance-specific changes requested.</p>;
                                                                return financeItems.map((item: any, i: number) => {
                                                                    const FIELD_LABELS: Record<string, string> = {
                                                                        bankname: 'Bank Name', bankName: 'Bank Name',
                                                                        accountnumber: 'Account #', accountNumber: 'Account #',
                                                                        routingnumber: 'Routing #', routingNumber: 'Routing #',
                                                                        swiftcode: 'SWIFT / BIC', swiftCode: 'SWIFT / BIC',
                                                                        currency: 'Currency', taxid: 'Tax ID', taxId: 'Tax ID',
                                                                        gstin: 'GSTIN', isprimary: 'Primary', isPrimary: 'Primary',
                                                                    };
                                                                    const fieldName = item.fieldName || item.fieldname || '';
                                                                    const rawNew = item.newValue || item.newvalue || '';
                                                                    const rawOld = item.oldValue || item.oldvalue || '';
                                                                    const tryParse = (v: string) => { try { const p = JSON.parse(v); return typeof p === 'object' && !Array.isArray(p) ? p : null; } catch { return null; } };
                                                                    const parsedNew = typeof rawNew === 'string' && rawNew.startsWith('{') ? tryParse(rawNew) : null;
                                                                    const parsedOld = typeof rawOld === 'string' && rawOld.startsWith('{') ? tryParse(rawOld) : null;
                                                                    const SKIP = new Set(['bankid','bankId','supplierid','supplierId','createdat','createdAt','updatedat','updatedAt','status']);
                                                                    const renderObj = (obj: Record<string, any>, accent = 'orange') => (
                                                                        <div className="divide-y divide-muted rounded border overflow-hidden">
                                                                            {Object.entries(obj).filter(([k]) => !SKIP.has(k)).map(([k, v]) => (
                                                                                <div key={k} className="flex items-center gap-3 px-3 py-2 text-xs bg-white">
                                                                                    <span className="text-muted-foreground font-medium min-w-[100px] shrink-0">{FIELD_LABELS[k] || k}</span>
                                                                                    <span className={`font-semibold text-${accent}-700`}>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? '—')}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                    if (parsedNew) {
                                                                        return (
                                                                            <div key={i} className="px-3 py-2.5 border-b last:border-b-0">
                                                                                <div className="font-semibold text-[10px] text-muted-foreground uppercase mb-1.5">{FIELD_LABELS[fieldName] || fieldName}</div>
                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                    <div><div className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Current</div><div className="text-xs">{parsedOld ? renderObj(parsedOld, 'slate') : <span className="italic text-muted-foreground">(None)</span>}</div></div>
                                                                                    <div><div className="text-[9px] font-bold text-orange-600 uppercase mb-0.5">Proposed</div><div className="text-xs">{renderObj(parsedNew, 'orange')}</div></div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <div key={i} className="grid grid-cols-3 text-xs px-3 py-2 items-center border-b last:border-b-0">
                                                                            <div className="font-medium">{FIELD_LABELS[fieldName] || fieldName}</div>
                                                                            <div className="text-muted-foreground italic">{parsedOld ? String(rawOld) : (rawOld || '(Empty)')}</div>
                                                                            <div className="text-orange-600 font-bold">{rawNew}</div>
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {(() => {
                                                        const bankName = data.bankName || (data as any).proposed?.bankName;
                                                        const accountNumber = data.accountNumber || (data as any).proposed?.accountNumber;
                                                        const taxId = data.taxId || (data as any).proposed?.taxId;
                                                        const isGst = data.isGstRegistered || (data as any).proposed?.isGstRegistered;
                                                        const gstin = data.gstin || (data as any).proposed?.gstin;
                                                        return (
                                                            <>
                                                                <div className="space-y-2">
                                                                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Banking Details</h5>
                                                                    {bankName ? (
                                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm border-l-2 border-l-gray-300 pl-3">
                                                                            <div className="text-muted-foreground">Bank Name:</div><div className="font-medium">{bankName}</div>
                                                                            <div className="text-muted-foreground">Account #:</div><div className="font-medium">****{String(accountNumber || '').slice(-4)}</div>
                                                                        </div>
                                                                    ) : <p className="text-sm text-muted-foreground italic">No banking details.</p>}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tax & GST</h5>
                                                                    {(isGst || gstin || taxId) ? (
                                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm border-l-2 border-l-gray-300 pl-3">
                                                                            <div className="text-muted-foreground">Tax ID:</div><div className="font-medium">{taxId || 'N/A'}</div>
                                                                            <div className="text-muted-foreground">GST Reg:</div><div className="font-medium">{isGst ? 'Yes' : 'No'}</div>
                                                                            {isGst && <><div className="text-muted-foreground">GSTIN:</div><div className="font-medium">{gstin}</div></>}
                                                                        </div>
                                                                    ) : <p className="text-sm text-muted-foreground italic">No tax details.</p>}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )
                                    },
                                    {
                                        id: 'compliance',
                                        title: 'Compliance Checklist',
                                        icon: FileCheck,
                                        color: 'emerald',
                                        tasks: supplierTasks.filter((t: any) =>
                                            /compliance/i.test(t.stepName) ||
                                            (t.isChangeRequest && role?.toLowerCase().includes('compliance'))
                                        ),
                                        render: (data: ApprovalTask) => (
                                            <div className="space-y-6">
                                                {data.isChangeRequest && (() => {
                                                    const complianceItems = (data.items || []).filter((item: any) =>
                                                        /legalName|businessType|registration|document/i.test(item.fieldName || item.fieldname || '')
                                                    );
                                                    if (complianceItems.length === 0) return null;
                                                    return (
                                                        <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-lg p-4 mb-2">
                                                            <div className="flex items-start gap-3">
                                                                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <div className="font-semibold text-emerald-900 text-sm">Proposed Identity Updates</div>
                                                                    <p className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
                                                                        Review changes to legal name or registration details.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-4 border rounded divide-y overflow-hidden bg-white/50">
                                                                {complianceItems.map((item: any, i: number) => {
                                                                    const isDoc = (item.fieldName || item.fieldname) === 'documents';
                                                                    let displayValue = item.newValue || item.newvalue;
                                                                    let docMetadata: any = null;

                                                                    if (isDoc && displayValue) {
                                                                        try {
                                                                            docMetadata = JSON.parse(displayValue);
                                                                            displayValue = (
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <FileText className="h-4 w-4 text-emerald-600" />
                                                                                    <div className="flex flex-col">
                                                                                        <span className="font-medium text-xs text-emerald-700">{docMetadata.documentName}</span>
                                                                                        <span className="text-[10px] text-muted-foreground">Type: {docMetadata.documentType || 'Unspecified'}</span>
                                                                                    </div>
                                                                                    <div className="ml-auto flex items-center gap-1">
                                                                                        {docMetadata.filePath && (
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-6 px-2 text-[10px] border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                                                                                                onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'}/${docMetadata.filePath}`, '_blank')}
                                                                                            >
                                                                                                <Eye className="h-3 w-3 mr-1" /> View
                                                                                            </Button>
                                                                                        )}
                                                                                        {(item.status === 'PENDING' || !item.status) && (
                                                                                            <>
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                                                    onClick={async (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        if (!confirm("Approve this document?")) return;
                                                                                                        try {
                                                                                                            await apiClient.post(`/api/change-requests/items/${item.itemId}/approve`, { requestId: data.instanceId });
                                                                                                            toast.success("Document Approved");
                                                                                                            fetchTasks();
                                                                                                        } catch (err) {
                                                                                                            console.error(err);
                                                                                                            toast.error("Failed to approve document");
                                                                                                        }
                                                                                                    }}
                                                                                                    title="Approve Document"
                                                                                                >
                                                                                                    <CheckCircle className="h-4 w-4" />
                                                                                                </Button>
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                                                    onClick={async (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        if (!confirm("Reject this document?")) return;
                                                                                                        try {
                                                                                                            await apiClient.post(`/api/change-requests/items/${item.itemId}/reject`, { requestId: data.instanceId });
                                                                                                            toast("Document Rejected");
                                                                                                            fetchTasks();
                                                                                                        } catch (err) {
                                                                                                            console.error(err);
                                                                                                            toast.error("Failed to reject document");
                                                                                                        }
                                                                                                    }}
                                                                                                    title="Reject Document"
                                                                                                >
                                                                                                    <XCircle className="h-4 w-4" />
                                                                                                </Button>
                                                                                            </>
                                                                                        )}
                                                                                        {item.status === 'APPROVED' && <span className="text-[10px] text-green-600 font-bold px-2">APPROVED</span>}
                                                                                        {item.status === 'REJECTED' && <span className="text-[10px] text-red-600 font-bold px-2">REJECTED</span>}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        } catch (e) {
                                                                            // Fallback
                                                                        }
                                                                    }

                                                                    return (
                                                                        <div key={i} className="grid grid-cols-3 text-xs px-3 py-2 items-center">
                                                                            <div className="font-medium">{item.fieldName || item.fieldname}</div>
                                                                            <div className="text-muted-foreground truncate italic">{item.oldValue || item.oldvalue || '(Empty)'}</div>
                                                                            <div className="text-orange-600 font-bold">{displayValue}</div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-2 flex items-center"><FileText className="h-4 w-4 mr-2" /> Submitted Documents</h4>
                                                    {data.documents && data.documents.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                            {data.documents.map((doc: any) => (
                                                                <div key={doc.documentId} className="flex flex-col p-3 border rounded bg-muted/20 gap-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex flex-col truncate">
                                                                            <span className="font-medium text-sm truncate" title={doc.documentName}>{doc.documentName}</span>
                                                                            <span className="text-xs text-muted-foreground capitalize">{doc.documentType}</span>
                                                                        </div>
                                                                        <Button variant="ghost" size="icon" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'}/${doc.fileUrl}`, '_blank')}><Eye className="h-4 w-4" /></Button>
                                                                    </div>

                                                                    {/* Verification Controls */}
                                                                    <div className="flex items-center justify-between pt-2 border-t mt-1">
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${doc.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                                                                            doc.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                                                'bg-yellow-100 text-yellow-700'
                                                                            }`}>
                                                                            {doc.verificationStatus || 'PENDING'}
                                                                        </span>

                                                                        {doc.verificationStatus !== 'VERIFIED' && (
                                                                            <div className="flex gap-1">
                                                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                                    title="Verify"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleVerifyDocument(doc.documentId, 'VERIFIED');
                                                                                    }}>
                                                                                    <CheckCircle className="w-4 h-4" />
                                                                                </Button>
                                                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                                    title="Reject Document"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleVerifyDocument(doc.documentId, 'REJECTED');
                                                                                    }}>
                                                                                    <XCircle className="w-4 h-4" />
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : <p className="text-sm text-muted-foreground italic">No documents found.</p>}
                                                </div>
                                            </div>
                                        )
                                    },
                                ];

                                return (
                                    <div className="space-y-6">
                                        {sections.filter(section => {
                                            const normalizedRole = role?.toLowerCase() || '';

                                            // Conditional Focus Logic
                                            if (!showFullProfile) {
                                                const hasChangeRequest = supplierTasks.some((t: any) => t.isChangeRequest);
                                                const isStaticSection = ['address', 'invoice'].includes(section.id);

                                                // If we have change requests, hide static profile/address blocks by default
                                                if (hasChangeRequest && isStaticSection) {
                                                    return false;
                                                }

                                                // Procurement: AP Activation hidden by default for relationship review
                                                if (normalizedRole.includes('procurement') && (section.id === 'invoice')) {
                                                    return false;
                                                }
                                            }

                                            // Access Control Logic
                                            if (normalizedRole.includes('admin')) return true;

                                            // 1. Finance: See Finance checklist (Proposed Changes are merged inside)
                                            if (normalizedRole.includes('finance')) {
                                                return section.id === 'finance';
                                            }
                                            // 2. Compliance: See Compliance checklist (Proposed Changes are merged inside)
                                            if (normalizedRole.includes('compliance')) {
                                                return section.id === 'compliance';
                                            }
                                            // 3. Procurement: See Strategic Review (Consolidated)
                                            if (normalizedRole.includes('procurement')) {
                                                return section.id === 'procurement';
                                            }
                                            // 4. AP: See Invoice Setup (Consolidated)
                                            if (normalizedRole.includes('ap')) {
                                                return section.id === 'invoice';
                                            }

                                            // Fallback: original logic if role is not one of the above
                                            if (section.id === 'finance') return normalizedRole.includes('finance');
                                            if (section.id === 'compliance') return normalizedRole.includes('compliance');
                                            if (section.id === 'procurement') return normalizedRole.includes('procurement');
                                            if (section.id === 'invoice') return normalizedRole.includes('ap');
                                            if (section.id === 'address') {
                                                return !normalizedRole.includes('finance') && !normalizedRole.includes('compliance');
                                            }
                                            return true;
                                        }).map(section => {
                                            const Icon = section.icon;
                                            const activeTask = section.tasks.length > 0 ? section.tasks[0] : null;
                                            // Ensure we always show the section if we have ANY data, even if not active
                                            const displayData = activeTask || baseTask;

                                            // Safety check: if no displayData, skip (should be rare)
                                            if (!displayData) return null;

                                            const colorClass = section.color === 'orange' ? 'orange' :
                                                section.color === 'blue' ? 'blue' :
                                                    section.color === 'indigo' ? 'indigo' :
                                                        section.color === 'amber' ? 'amber' : 'emerald';

                                            return (
                                                <div key={section.id} className={`border rounded-lg p-5 bg-card shadow-sm border-l-4 border-l-${colorClass}-500`}>
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h3 className={`font-bold text-lg flex items-center gap-2 text-${colorClass}-700`}>
                                                            <Icon className={`h-5 w-5 text-${colorClass}-600`} /> {section.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            {(() => {
                                                                const normalizedRole = role?.toLowerCase() || '';
                                                                const isAdmin = normalizedRole.includes('admin');
                                                                const displayTask = activeTask || baseTask;

                                                                return (
                                                                    <>
                                                                        {displayTask.submissionType === 'RESUBMISSION' && (
                                                                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                                                <RefreshCw className="mr-1 h-3 w-3" /> Resubmission
                                                                            </Badge>
                                                                        )}
                                                                        {displayTask.submissionType === 'INITIAL' && (
                                                                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                                                                New Supplier
                                                                            </Badge>
                                                                        )}
                                                                        <Badge variant="outline" className={`text-${section.color}-600 border-${section.color}-200 bg-${section.color}-50`}>
                                                                            {displayTask.stepName}
                                                                        </Badge>
                                                                        {!activeTask && !isAdmin && (
                                                                            <Badge variant="secondary" className="bg-gray-100 text-gray-500 font-normal ml-2">Read Only</Badge>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>

                                                    {section.render(displayData)}

                                                    {/* Render Actions specific to section (active or disabled) */}
                                                    {(() => {
                                                        // Admin = read-only oversight, no action buttons
                                                        if (isAdminRole) {
                                                            return renderActions(baseTask, true);
                                                        }
                                                        if (activeTask) {
                                                            return renderActions(activeTask);
                                                        }
                                                        return renderActions(baseTask, true);
                                                    })()}
                                                </div>
                                            );
                                        })}

                                        {/* Fallback for tasks that don't fit into the 3 main buckets */}
                                        {supplierTasks.filter((t: any) => !/ap|activation|enabler|payable|finance|compliance|procurement|profile/i.test(t.stepName)).map((task: ApprovalTask) => (
                                            <div key={task.stepInstanceId} className="border rounded-lg p-5 bg-card shadow-sm">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="font-bold text-lg">{task.stepName}</h3>
                                                    <Badge variant="secondary">{task.workflowName}</Badge>
                                                </div>
                                                {renderActions(task)}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(groupedTasks).filter(([, group]: [string, any]) => {
                        const normalizedRole = (role || '').toLowerCase();
                        // Admins see everything
                        if (normalizedRole.includes('admin')) return true;
                        // Check if any task is relevant to this role
                        return group.tasks.some((t: any) => {
                            const stepName = (t.stepName || '').toLowerCase();
                            const isOnboarding = !t.isChangeRequest;
                            // Onboarding tasks are relevant to the role the step is assigned to
                            if (isOnboarding) {
                                if (normalizedRole.includes('finance') && /finance/i.test(stepName)) return true;
                                if (normalizedRole.includes('compliance') && /compliance/i.test(stepName)) return true;
                                if (normalizedRole.includes('procurement') && /procurement/i.test(stepName)) return true;
                                if (normalizedRole.includes('ap') && /ap|activation|enabler|payable/i.test(stepName)) return true;
                                return false;
                            }
                            // Change requests: check if this role has any actionable items
                            if (t.isChangeRequest && t.items?.length > 0) {
                                return t.items.some((item: any) => {
                                    const field = (item.fieldName || item.fieldname || '').toLowerCase();
                                    if (normalizedRole.includes('finance')) return /bank|account|tax|gst|pan|swift|ifsc|beneficiary/i.test(field);
                                    if (normalizedRole.includes('compliance')) return /legal|name|registration|document/i.test(field);
                                    if (normalizedRole.includes('procurement')) return !/bank|account|tax|gst|pan|swift|ifsc|beneficiary/i.test(field);
                                    // AP: no change request items are relevant
                                    return false;
                                });
                            }
                            return true;
                        });
                    }).map(([supplierId, group]: [string, any]) => {
                        const hasChangeRequest = group.tasks.some((t: any) => t.isChangeRequest);
                        return (
                            <Card
                                key={supplierId}
                                className={`cursor-pointer hover:shadow-md transition-all border-l-4 group ${hasChangeRequest ? 'border-l-orange-500' : 'border-l-primary'}`}
                                onClick={() => setExpandedSupplier(Number(supplierId))}
                            >
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center justify-between group-hover:text-primary transition-colors">
                                        <span className="flex items-center gap-2">
                                            {group.supplierName}
                                            {hasChangeRequest && (
                                                <Badge className="text-[9px] bg-orange-100 text-orange-700 border-orange-300 px-1.5 py-0 font-bold" variant="outline">Updated</Badge>
                                            )}
                                        </span>
                                        <Badge variant="secondary">{group.tasks.length}</Badge>
                                    </CardTitle>
                                    <CardDescription>Pending Actions</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground">
                                        {(() => {
                                            // Group tasks by name to avoid duplicates like "Profile Update Review" repeating
                                            const uniqueTasks = group.tasks.reduce((acc: any[], task: any) => {
                                                const existing = acc.find(a => a.name === task.stepName);
                                                if (existing) {
                                                    existing.count++;
                                                } else {
                                                    acc.push({ name: task.stepName, count: 1 });
                                                }
                                                return acc;
                                            }, []);

                                            return (
                                                <>
                                                    {uniqueTasks.slice(0, 3).map((ut: any, i: number) => {
                                                        const nameLower = (ut.name || '').toLowerCase();
                                                        let color = 'bg-gray-400';
                                                        if (nameLower.includes('compliance')) color = 'bg-blue-500';
                                                        else if (nameLower.includes('finance')) color = 'bg-amber-500';
                                                        else if (nameLower.includes('ap') || nameLower.includes('activation') || nameLower.includes('payable')) color = 'bg-emerald-500';

                                                        return (
                                                            <div key={i} className="flex items-center gap-2 py-1">
                                                                <div className={`w-2 h-2 rounded-full ${color}`} />
                                                                <span className="truncate">
                                                                    {ut.name} {ut.count > 1 ? `(${ut.count} requests)` : ''}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {uniqueTasks.length > 3 && (
                                                        <div className="text-xs pt-1">+ {uniqueTasks.length - 3} more categories</div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
