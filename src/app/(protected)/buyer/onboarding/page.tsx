"use client";

import { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useBuyerRole } from "@/app/(protected)/buyer/context/BuyerRoleContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    CheckCircle, XCircle, AlertCircle, FileText, ChevronRight, Building2, MapPin,
    Wallet, FileCheck, Loader2, RefreshCw, Eye, Shield, Lock, Clock, RotateCcw,
    MessageSquare, Search, ClipboardList, User,
} from "lucide-react";
import { toast } from "sonner";

/* ─────────────────────────── Types ─────────────────────────── */
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
    website?: string;
    description?: string;
    country?: string;
    bankName?: string;
    accountNumber?: string;
    taxId?: string;
    isGstRegistered?: boolean;
    gstin?: string;
    documents?: any[];
    addresses?: any[];
    contacts?: any[];
    isChangeRequest?: boolean;
    items?: any[];
    submissionType?: "INITIAL" | "RESUBMISSION" | "UPDATE";
    proposed?: any;
}

type ScopeKey = "procurement" | "finance" | "compliance" | "ap" | "other";

/* ─────────────────────────── Helpers ─────────────────────────── */
const normalizeDocuments = (docs: any): any[] => {
    if (!docs) return [];
    if (Array.isArray(docs)) return docs;
    if (typeof docs === "string") {
        try { const p = JSON.parse(docs); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
};

const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown";
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 60) return `${Math.max(0, mins)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const hoursSince = (dateStr?: string) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    return (Date.now() - d.getTime()) / 3600000;
};

const STUCK_THRESHOLD_HOURS = 48;

const getReviewScope = (stepName?: string): ScopeKey => {
    const n = (stepName || "").toLowerCase();
    if (n.includes("procurement")) return "procurement";
    if (n.includes("finance")) return "finance";
    if (n.includes("compliance")) return "compliance";
    if (n.includes("ap") || n.includes("activation") || n.includes("accounts payable")) return "ap";
    return "other";
};

/** Strict section visibility by stepName scope. Admin sees all. */
const canSee = (
    role: string,
    scope: ScopeKey,
    section: "company" | "addresses" | "contacts" | "bank" | "docs" | "activation"
) => {
    if (role === "Admin") return true;
    switch (scope) {
        case "procurement": return section === "company" || section === "addresses" || section === "contacts";
        case "finance":     return section === "bank";
        case "compliance":  return section === "docs";
        case "ap":          return section === "activation";
        default:            return role === "Admin";
    }
};

/* ─────────────────────────── Pipeline visual ─────────────────────────── */
type NodeState = "done" | "active" | "stuck" | "pending";

function buildPipeline(
    tasks: ApprovalTask[]
): { step: number; label: string; state: NodeState; assignedRoleId?: number; startedAt?: string; }[] {
    const sorted = [...tasks].sort((a, b) => a.stepOrder - b.stepOrder);
    const maxStep = Math.max(...sorted.map(t => t.stepOrder || 1), 3);
    const stepNameByOrder = new Map<number, ApprovalTask>();
    sorted.forEach(t => { if (!stepNameByOrder.has(t.stepOrder)) stepNameByOrder.set(t.stepOrder, t); });

    const activeOrder = sorted[0]?.stepOrder ?? 1;

    return Array.from({ length: maxStep }, (_, i) => {
        const order = i + 1;
        const task = stepNameByOrder.get(order);
        let state: NodeState = "pending";
        if (order < activeOrder) state = "done";
        else if (order === activeOrder) {
            state = task && hoursSince(task.startedAt) > STUCK_THRESHOLD_HOURS ? "stuck" : "active";
        }
        return {
            step: order,
            label: task?.stepName ?? `Step ${order}`,
            state,
            assignedRoleId: task?.assignedRoleId,
            startedAt: task?.startedAt,
        };
    });
}

const dotClasses = (s: NodeState) =>
    s === "done"   ? "bg-green-600 text-white"
    : s === "active" ? "bg-amber-500 text-white ring-4 ring-amber-500/25"
    : s === "stuck"  ? "bg-red-600 text-white ring-4 ring-red-600/25"
    :                  "bg-muted text-muted-foreground border-2 border-dashed border-border";

const connectorClasses = (s: NodeState) =>
    s === "done"   ? "bg-green-600"
    : s === "active" || s === "stuck" ? "bg-amber-500"
    : "bg-border";

/* ─────────────────────────── Page ─────────────────────────── */
export default function BuyerOnboardingPage() {
    const { user } = useAuthStore();
    const { role } = useBuyerRole();

    const [tasks, setTasks] = useState<ApprovalTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const [drawerSupplier, setDrawerSupplier] = useState<number | null>(null);

    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [comment, setComment] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "stuck" | "new">("all");

    const [previewDoc, setPreviewDoc] = useState<string | null>(null);

    const [tab, setTab] = useState<"pipeline" | "queue">(role === "Admin" ? "pipeline" : "queue");
    useEffect(() => { setTab(role === "Admin" ? "pipeline" : "queue"); }, [role]);

    useEffect(() => { if (user) fetchTasks(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, role]);

    async function fetchTasks() {
        try {
            setIsLoading(true);
            const results = await Promise.allSettled([
                apiClient.get("/api/approvals/pending"),
                apiClient.get("/api/change-requests/pending"),
            ]);
            const onboardingRes = results[0].status === "fulfilled" ? results[0].value : [];
            const changeReqRes  = results[1].status === "fulfilled" ? results[1].value : [];

            const onboardingTasks: ApprovalTask[] = (onboardingRes as any[] || []).map(t => ({
                stepInstanceId: t.stepInstanceId || t.stepinstanceid,
                instanceId: t.instanceId || t.instanceid,
                stepOrder: t.stepOrder || t.steporder,
                stepName: t.stepName || t.stepname,
                status: t.status,
                supplierName: t.supplierName || t.suppliername,
                supplierId: t.supplierId || t.supplierid,
                workflowName: t.workflowName || t.workflowname || "Onboarding",
                assignedRoleId: t.assignedRoleId || t.assignedroleid,
                startedAt: t.startedAt || t.startedat || t.sentAt || t.sentat || t.requestedAt || t.requestedat,
                website: t.website, description: t.description, country: t.country,
                bankName: t.bankName || t.bankname,
                accountNumber: t.accountNumber || t.accountnumber,
                taxId: t.taxId || t.taxid,
                isGstRegistered: t.isGstRegistered || t.isgstregistered,
                gstin: t.gstin,
                documents: normalizeDocuments(t.documents),
                addresses: normalizeDocuments(t.addresses),
                contacts: normalizeDocuments(t.contacts),
                submissionType: t.submissionType || t.submissiontype,
            }));

            const changeTasks: ApprovalTask[] = (changeReqRes as any[] || []).map(t => {
                const rid = t.requestId || t.requestid || 0;
                const sid = t.supplierId || t.supplierid;
                const r = (role || "").toLowerCase();
                let stepName = "Profile Update Review";
                if (r.includes("procurement")) stepName = "Procurement Update Review";
                else if (r.includes("finance")) stepName = "Finance Update Review";
                else if (r.includes("compliance")) stepName = "Compliance Update Review";
                else if (r.includes("ap")) stepName = "AP Update Review";

                return {
                    stepInstanceId: rid + 1_000_000,
                    instanceId: rid,
                    stepOrder: 0,
                    stepName,
                    status: t.status,
                    supplierName: t.supplierName || t.suppliername || "Unknown Supplier",
                    supplierId: sid,
                    workflowName: "Change Request",
                    assignedRoleId: 0,
                    startedAt: t.requestedAt || t.requestedat,
                    isChangeRequest: true,
                    items: t.items || [],
                    submissionType: "UPDATE",
                    website: t.website, description: t.description, country: t.country,
                    bankName: t.bankName || t.bankname,
                    accountNumber: t.accountNumber || t.accountnumber,
                    taxId: t.taxId || t.taxid,
                    isGstRegistered: t.isGstRegistered || t.isgstregistered,
                    gstin: t.gstin,
                    documents: normalizeDocuments(t.documents || t.proposed?.documents),
                    addresses: normalizeDocuments(t.addresses || t.proposed?.addresses),
                    contacts: normalizeDocuments(t.contacts || t.proposed?.contacts),
                    proposed: t.proposed,
                };
            });

            changeTasks.forEach(ct => {
                const overlap = onboardingTasks.filter(ot => ot.supplierId === ct.supplierId && ot.submissionType === "UPDATE");
                if (overlap.length) {
                    overlap.forEach(ot => {
                        ot.proposed = ct.proposed;
                        if (!ot.items?.length) ot.items = ct.items;
                        else {
                            const ids = new Set(ot.items.map((i: any) => i.itemId));
                            ot.items = [...ot.items, ...((ct.items || []).filter((i: any) => !ids.has(i.itemId)))];
                        }
                    });
                }
            });
            const filteredChange = changeTasks.filter(ct =>
                !onboardingTasks.some(ot => ot.supplierId === ct.supplierId && ot.submissionType === "UPDATE")
            );
            setTasks([...onboardingTasks, ...filteredChange]);
        } catch (e) {
            console.error("Failed to fetch tasks", e);
            toast.error("Could not load onboarding tasks.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAction(task: ApprovalTask, action: "APPROVE" | "REJECT" | "REWORK" | "NOTE", comments?: string) {
        setProcessingId(task.stepInstanceId);
        try {
            const isDirectCR = task.workflowName === "Change Request" && task.stepOrder === 0;
            if (isDirectCR) {
                if (action === "APPROVE")      await apiClient.post(`/api/change-requests/${task.instanceId}/approve`, {});
                else if (action === "REJECT")  await apiClient.post(`/api/change-requests/${task.instanceId}/reject`,  { reason: comments });
                else if (action === "REWORK")  await apiClient.post(`/api/change-requests/${task.instanceId}/reject`,  { reason: `[REWORK REQUESTED] ${comments || ""}` });
            } else {
                const ep = action === "APPROVE" ? "approve" : action === "REJECT" ? "reject" : action === "REWORK" ? "rework" : "note";
                await apiClient.post(`/api/approvals/${task.instanceId}/${ep}`, {
                    stepOrder: task.stepOrder,
                    stepInstanceId: task.stepInstanceId,
                    comments: comments || `${action} via Portal`,
                });
            }
            if (action === "NOTE") toast.success("Note added");
            else toast.success(({ APPROVE: "Approved", REJECT: "Rejected", REWORK: "Sent for rework" } as Record<string, string>)[action]);
            if (action !== "NOTE") {
                setTasks(prev => prev.filter(t => t.stepInstanceId !== task.stepInstanceId));
                setSelectedTaskId(null);
                setComment("");
            }
            fetchTasks();
        } catch (err: any) {
            toast.error(`Error: ${err.response?.data?.error || "Action failed"}`);
        } finally {
            setProcessingId(null);
        }
    }

    const resolvePreviewUrl = (url: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const base = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
        const absolute = `${base}${url.startsWith('/') ? '' : '/'}${url}`;

        // <iframe src="..."> cannot send an Authorization header, so protected
        // API routes must authenticate via a `?token=` query param. Attach the
        // JWT for any /api/* preview URL.
        if (typeof window !== 'undefined' && absolute.includes('/api/')) {
            const token = localStorage.getItem('token');
            if (token) {
                const sep = absolute.includes('?') ? '&' : '?';
                return `${absolute}${sep}token=${encodeURIComponent(token)}`;
            }
        }
        return absolute;
    };

    async function handleVerifyDocument(documentId: number, status: "VERIFIED" | "REJECTED") {
        try {
            await apiClient.put(`/api/documents/${documentId}/verify`, { status });
            setTasks(prev => prev.map(t => t.documents
                ? { ...t, documents: t.documents.map(d => d.documentId === documentId ? { ...d, verificationStatus: status } : d) }
                : t));
        } catch (err: any) {
            toast.error(`Error: ${err.response?.data?.error || "Failed to verify"}`);
        }
    }

    const groupedBySupplier = useMemo(() => {
        const map: Record<number, { supplierName: string; tasks: ApprovalTask[] }> = {};
        tasks.forEach(t => {
            if (!map[t.supplierId]) map[t.supplierId] = { supplierName: t.supplierName, tasks: [] };
            map[t.supplierId].tasks.push(t);
        });
        return map;
    }, [tasks]);

    const pipelineRows = useMemo(() => {
        const rows = Object.entries(groupedBySupplier).map(([sid, g]) => {
            const pipeline = buildPipeline(g.tasks);
            const stuckStep = pipeline.find(s => s.state === "stuck");
            const activeStep = pipeline.find(s => s.state === "active");
            const current = stuckStep || activeStep;
            return {
                supplierId: Number(sid),
                supplierName: g.supplierName,
                submissionType: g.tasks[0]?.submissionType || "INITIAL",
                workflowName: g.tasks[0]?.workflowName || "Onboarding",
                pipeline,
                currentLabel: current?.label ?? "—",
                currentState: current?.state ?? "pending",
                age: getRelativeTime(current?.startedAt),
                country: g.tasks[0]?.country,
            };
        });
        return rows.filter(r => {
            if (filter === "stuck" && r.currentState !== "stuck") return false;
            if (filter === "new" && r.submissionType !== "INITIAL") return false;
            if (search && !r.supplierName.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [groupedBySupplier, filter, search]);

    const myQueueTasks = useMemo(() => {
        if (role === "Admin") return tasks;
        return tasks.filter(t => {
            const scope = getReviewScope(t.stepName);
            return (role === "Procurement" && scope === "procurement")
                || (role === "Finance"     && scope === "finance")
                || (role === "Compliance"  && scope === "compliance")
                || (role === "AP"          && scope === "ap");
        });
    }, [tasks, role]);

    const stats = useMemo(() => {
        const pipelines = Object.values(groupedBySupplier).map(g => buildPipeline(g.tasks));
        return {
            totalSuppliers: Object.keys(groupedBySupplier).length,
            stuck: pipelines.filter(p => p.some(s => s.state === "stuck")).length,
            myQueue: myQueueTasks.length,
            newThisWeek: tasks.filter(t => t.submissionType === "INITIAL" && hoursSince(t.startedAt) < 24 * 7).length,
        };
    }, [groupedBySupplier, myQueueTasks, tasks]);

    const selectedTask = myQueueTasks.find(t => t.stepInstanceId === selectedTaskId) || null;
    const drawerGroup = drawerSupplier != null ? groupedBySupplier[drawerSupplier] : null;

    return (
        <div className="space-y-6 p-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Supplier Onboarding</h1>
                    <p className="text-sm text-muted-foreground">Track where approvals are in flight and action items assigned to you.</p>
                    <Badge variant="secondary" className="mt-2 text-xs">Role View: {role}</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={fetchTasks} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="In Pipeline" value={stats.totalSuppliers} sub="active suppliers" />
                <StatCard label="Stuck > 48h" value={stats.stuck} tone="red" sub="need attention" />
                <StatCard label="My Queue" value={stats.myQueue} tone="amber" sub={`assigned to ${role}`} />
                <StatCard label="New This Week" value={stats.newThisWeek} tone="blue" sub="initial submissions" />
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList>
                    <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                    <TabsTrigger value="queue">My Queue {stats.myQueue ? `(${stats.myQueue})` : ""}</TabsTrigger>
                </TabsList>

                <TabsContent value="pipeline" className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <div className="flex gap-2 items-center flex-wrap">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search supplier…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs border rounded-md bg-background w-56 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            {(["all", "stuck", "new"] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                        filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    {f === "all" ? "All" : f === "stuck" ? "Stuck" : "New"}
                                </button>
                            ))}
                        </div>
                        <PipelineLegend />
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : pipelineRows.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                            <th className="text-left px-4 py-3 border-b">Supplier</th>
                                            <th className="text-left px-4 py-3 border-b">Type</th>
                                            <th className="text-left px-4 py-3 border-b">Pipeline</th>
                                            <th className="text-left px-4 py-3 border-b">Current Step</th>
                                            <th className="text-left px-4 py-3 border-b">Age</th>
                                            <th className="text-left px-4 py-3 border-b">Status</th>
                                            <th className="px-4 py-3 border-b"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pipelineRows.map(r => (
                                            <tr
                                                key={r.supplierId}
                                                onClick={() => setDrawerSupplier(r.supplierId)}
                                                className="border-b hover:bg-muted/40 cursor-pointer"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">{r.supplierName}</span>
                                                        <span className="text-[11px] text-muted-foreground">{r.country || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="text-[10px]">{r.workflowName}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center">
                                                        {r.pipeline.map((s, i) => (
                                                            <div key={s.step} className="flex items-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold ${dotClasses(s.state)}`}>
                                                                        {s.state === "done" ? "✓" : s.state === "stuck" ? "!" : s.step}
                                                                    </div>
                                                                    <div className="text-[9px] max-w-[64px] truncate text-muted-foreground">{s.label}</div>
                                                                </div>
                                                                {i < r.pipeline.length - 1 && (
                                                                    <div className={`h-0.5 w-5 mb-4 ${connectorClasses(s.state)}`} />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium">{r.currentLabel}</td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">{r.age}</td>
                                                <td className="px-4 py-3">
                                                    {r.currentState === "stuck" ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                                            <AlertCircle className="h-3 w-3" /> STUCK
                                                        </span>
                                                    ) : r.currentState === "active" ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                            <Clock className="h-3 w-3" /> WAITING
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="queue" className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : myQueueTasks.length === 0 ? (
                        <EmptyState role={role} />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
                            <Card className="overflow-hidden">
                                <CardHeader className="bg-foreground text-background py-3 px-4">
                                    <CardTitle className="text-sm">My Pending Actions ({myQueueTasks.length})</CardTitle>
                                </CardHeader>
                                <div className="divide-y max-h-[calc(100vh-320px)] overflow-y-auto">
                                    {myQueueTasks.map(t => {
                                        const stuck = hoursSince(t.startedAt) > STUCK_THRESHOLD_HOURS;
                                        const isSel = t.stepInstanceId === selectedTaskId;
                                        return (
                                            <button
                                                key={t.stepInstanceId}
                                                onClick={() => { setSelectedTaskId(t.stepInstanceId); setComment(""); }}
                                                className={`w-full text-left p-3 hover:bg-muted/50 transition ${
                                                    isSel ? "bg-primary/5 border-l-4 border-primary" : stuck ? "border-l-4 border-red-600" : "border-l-4 border-transparent"
                                                }`}
                                            >
                                                <div className="font-semibold text-sm">{t.supplierName}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{t.stepName}</div>
                                                <div className="flex items-center justify-between mt-1.5">
                                                    <span className="text-[10px] text-muted-foreground">{getRelativeTime(t.startedAt)}</span>
                                                    {stuck && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 rounded-full">
                                                            <AlertCircle className="h-2.5 w-2.5" /> Stuck
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </Card>

                            <Card className="flex flex-col overflow-hidden">
                                {!selectedTask ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 py-20">
                                        <ClipboardList className="h-10 w-10 opacity-40" />
                                        <p className="text-sm">Select an item from the list to review.</p>
                                    </div>
                                ) : (
                                    <ApproverDetail
                                        task={selectedTask}
                                        role={role}
                                        processing={processingId === selectedTask.stepInstanceId}
                                        comment={comment}
                                        onCommentChange={setComment}
                                        onAction={(a) => handleAction(selectedTask, a, comment)}
                                        onVerifyDoc={handleVerifyDocument}
                                        onPreview={(url) => setPreviewDoc(resolvePreviewUrl(url))}
                                    />
                                )}
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={!!drawerGroup} onOpenChange={(o) => !o && setDrawerSupplier(null)}>
                <DialogContent className="max-w-lg">
                    {drawerGroup && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{drawerGroup.supplierName}</DialogTitle>
                                <DialogDescription>Onboarding pipeline timeline</DialogDescription>
                            </DialogHeader>
                            <PipelineTimeline tasks={drawerGroup.tasks} />
                            <DialogFooter className="sm:justify-between">
                                <a
                                    href={`/buyer/suppliers/${drawerSupplier}`}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Open full supplier profile →
                                </a>
                                <Button variant="outline" size="sm" onClick={() => setDrawerSupplier(null)}>Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Document Preview</DialogTitle>
                    </DialogHeader>
                    {previewDoc && (
                        <iframe src={previewDoc} className="w-full h-[70vh] rounded border" />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ─────────────────────────── Subcomponents ─────────────────────────── */

function StatCard({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone?: "red" | "amber" | "blue" }) {
    const dot = tone === "red" ? "bg-red-600" : tone === "amber" ? "bg-amber-500" : tone === "blue" ? "bg-primary" : "bg-muted-foreground";
    return (
        <Card>
            <CardContent className="py-4 px-5">
                <div className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">{label}</div>
                <div className="text-2xl font-bold mt-1 flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                    {value}
                </div>
                {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
            </CardContent>
        </Card>
    );
}

function PipelineLegend() {
    return (
        <div className="flex gap-3 text-[10px] text-muted-foreground items-center">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />Done</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Active</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-600" />Stuck &gt;48h</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-border bg-muted" />Pending</span>
        </div>
    );
}

function EmptyState({ role }: { role?: string } = {}) {
    return (
        <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center text-center">
                <CheckCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-semibold">All clear</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    {role
                        ? `No tasks currently assigned to ${role}.`
                        : "No suppliers are currently in the onboarding pipeline."}
                </p>
            </CardContent>
        </Card>
    );
}

function PipelineTimeline({ tasks }: { tasks: ApprovalTask[] }) {
    const pipeline = buildPipeline(tasks);
    return (
        <div className="relative pl-7 space-y-4 mt-2">
            <div className="absolute left-[10px] top-1 bottom-1 w-0.5 bg-border" />
            {pipeline.map((s) => (
                <div key={s.step} className="relative">
                    <div className={`absolute -left-7 top-1 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-background ${dotClasses(s.state)}`}>
                        {s.state === "done" ? "✓" : s.state === "stuck" ? "!" : s.step}
                    </div>
                    <div className="bg-muted rounded-md px-3 py-2">
                        <div className="font-semibold text-sm">{s.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                            {s.state === "done" ? "Completed"
                                : s.state === "stuck" ? `Stuck since ${getRelativeTime(s.startedAt)}`
                                : s.state === "active" ? `Waiting ${getRelativeTime(s.startedAt)}`
                                : "Pending"}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─────────────────── Approver detail (RBAC-scoped) ─────────────────── */
function ApproverDetail({
    task, role, processing, comment, onCommentChange, onAction, onVerifyDoc, onPreview,
}: {
    task: ApprovalTask;
    role: string;
    processing: boolean;
    comment: string;
    onCommentChange: (v: string) => void;
    onAction: (a: "APPROVE" | "REJECT" | "REWORK" | "NOTE") => void;
    onVerifyDoc: (id: number, status: "VERIFIED" | "REJECTED") => void;
    onPreview: (url: string) => void;
}) {
    const scope = getReviewScope(task.stepName);

    return (
        <>
            <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-lg font-bold">{task.supplierName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Shield className="h-3 w-3" />
                            You are reviewing as <span className="font-semibold text-foreground">{role}</span>
                            <span>•</span>
                            <span>{task.stepName}</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{task.workflowName}</Badge>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <Section title="Company Details" icon={Building2} visible={canSee(role, scope, "company")}>
                    <KV label="Country" value={task.country} />
                    <KV label="Website" value={task.website} />
                    <KV label="Description" value={task.description} span />
                </Section>

                <Section title="Addresses" icon={MapPin} visible={canSee(role, scope, "addresses")} count={task.addresses?.length}>
                    {task.addresses?.length ? task.addresses.map((a: any, i: number) => (
                        <div key={i} className="col-span-2 text-xs bg-muted/40 rounded p-2">
                            <div className="font-medium">{a.addressType || "Address"} {a.isPrimary && <Badge variant="secondary" className="ml-1 text-[9px]">Primary</Badge>}</div>
                            <div className="text-muted-foreground">{[a.addressLine1, a.addressLine2, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(", ")}</div>
                        </div>
                    )) : <EmptyRow />}
                </Section>

                <Section title="Contacts" icon={User} visible={canSee(role, scope, "contacts")} count={task.contacts?.length}>
                    {task.contacts?.length ? task.contacts.map((c: any, i: number) => (
                        <div key={i} className="col-span-2 text-xs bg-muted/40 rounded p-2">
                            <div className="font-medium">{c.firstName} {c.lastName} {c.isPrimary && <Badge variant="secondary" className="ml-1 text-[9px]">Primary</Badge>}</div>
                            <div className="text-muted-foreground">{c.email} • {c.phone} • {c.designation}</div>
                        </div>
                    )) : <EmptyRow />}
                </Section>

                <Section title="Bank Account (BA) Details" icon={Wallet} visible={canSee(role, scope, "bank")}
                    restrictedNote="Bank details are only visible to Finance approvers for this step.">
                    <KV label="Bank" value={task.bankName} />
                    <KV label="Account No." value={task.accountNumber} mask />
                    <KV label="Tax ID" value={task.taxId} />
                    <KV label="GSTIN" value={task.gstin} />
                    <KV label="GST Registered" value={task.isGstRegistered ? "Yes" : "No"} />
                </Section>

                <Section title="Documents" icon={FileText} visible={canSee(role, scope, "docs")} count={task.documents?.length}
                    restrictedNote="Documents are only visible to Compliance approvers for this step.">
                    {task.documents?.length ? (
                        <div className="col-span-2 space-y-1.5">
                            {task.documents.map((d: any) => (
                                <div key={d.documentId} className="flex items-center justify-between bg-muted/40 rounded px-3 py-2 text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <div className="min-w-0">
                                            <div className="font-medium truncate">{d.documentName || d.documentType}</div>
                                            <div className="text-muted-foreground">{d.documentType}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Badge variant={
                                            d.verificationStatus === "VERIFIED" ? "default" :
                                            d.verificationStatus === "REJECTED" ? "destructive" : "outline"
                                        } className="text-[9px]">
                                            {d.verificationStatus || "PENDING"}
                                        </Badge>
                                        {(d.documentId || d.id) && (
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onPreview(`/api/documents/${d.documentId || d.id}/view`)}>
                                                <Eye className="h-3 w-3" />
                                            </Button>
                                        )}
                                        {scope === "compliance" && d.verificationStatus !== "VERIFIED" && (
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={() => onVerifyDoc(d.documentId, "VERIFIED")}>
                                                <CheckCircle className="h-3 w-3" />
                                            </Button>
                                        )}
                                        {scope === "compliance" && d.verificationStatus !== "REJECTED" && (
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => onVerifyDoc(d.documentId, "REJECTED")}>
                                                <XCircle className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <EmptyRow />}
                </Section>

                <Section title="Activation Checklist" icon={CheckCircle} visible={canSee(role, scope, "activation")}
                    restrictedNote="Activation checklist is only visible to AP activators for this step.">
                    <div className="col-span-2 text-xs text-muted-foreground">
                        {scope === "ap"
                            ? "Ready to activate. Approving this step will unlock the supplier for PO/invoice processing."
                            : <EmptyRow />}
                    </div>
                </Section>

                {task.items && task.items.length > 0 && (
                    <Section title="Proposed Data Changes" icon={RotateCcw} visible={true} count={task.items.length}>
                        <div className="col-span-2 space-y-2">
                            {task.items.map((it: any, i: number) => {
                                const isDoc = it.fieldName === 'documents';
                                let oldV = it.oldValue || '—';
                                let newV = it.newValue || '—';
                                
                                if (isDoc) {
                                    try {
                                        const d = JSON.parse(it.newValue);
                                        newV = `New Document: ${d.documentName || d.documentType}`;
                                    } catch(e) { /* ignore */ }
                                }

                                return (
                                    <div key={i} className="text-[11px] bg-amber-50/50 border border-amber-200/50 rounded-lg px-3 py-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold uppercase tracking-tight text-[10px] text-amber-800">{it.fieldName}</span>
                                            <Badge variant="secondary" className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">{it.changeCategory || 'Update'}</Badge>
                                        </div>
                                        <div className="grid grid-cols-[1fr_20px_1fr] items-center gap-2">
                                            <div className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 truncate line-through opacity-60">{oldV}</div>
                                            <div className="flex justify-center"><ChevronRight className="h-3 w-3 text-muted-foreground" /></div>
                                            <div className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 truncate font-semibold">{newV}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                )}
            </div>

            <div className="border-t bg-muted/30 px-5 py-3 space-y-2">
                <textarea
                    value={comment}
                    onChange={(e) => onCommentChange(e.target.value)}
                    placeholder="Add comments (required for reject / rework)…"
                    className="w-full text-xs border rounded-md p-2 bg-background min-h-[60px] resize-y outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => onAction("NOTE")} disabled={processing || !comment.trim()}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> Note
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onAction("REWORK")} disabled={processing || !comment.trim()} className="text-amber-700 border-amber-300 hover:bg-amber-50">
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Rework
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onAction("REJECT")} disabled={processing || !comment.trim()} className="text-red-700 border-red-300 hover:bg-red-50">
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => onAction("APPROVE")} disabled={processing} className="bg-green-600 hover:bg-green-700">
                        {processing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                        Approve
                    </Button>
                </div>
            </div>
        </>
    );
}

function Section({
    title, icon: Icon, visible, children, count, restrictedNote,
}: {
    title: string; icon: any; visible: boolean; children?: React.ReactNode;
    count?: number; restrictedNote?: string;
}) {
    if (!visible) {
        return (
            <div className="rounded-md border border-dashed bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="font-medium">{title}</span>
                    <Badge variant="outline" className="text-[9px] ml-auto">Restricted</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                    {restrictedNote || "This section is not part of your review scope."}
                </p>
            </div>
        );
    }
    return (
        <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                <Icon className="h-3.5 w-3.5" /> {title}
                {typeof count === "number" && <span className="ml-1 text-muted-foreground/70">({count})</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {children}
            </div>
        </div>
    );
}

function KV({ label, value, mask, span }: { label: string; value?: any; mask?: boolean; span?: boolean }) {
    const display = value == null || value === "" ? "—" : mask ? `•••• ${String(value).slice(-4)}` : String(value);
    return (
        <div className={`text-xs ${span ? "col-span-2" : ""}`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="font-medium mt-0.5 break-words">{display}</div>
        </div>
    );
}

function EmptyRow() {
    return <div className="col-span-2 text-xs text-muted-foreground italic">No data submitted.</div>;
}
