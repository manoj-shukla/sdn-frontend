"use client";
import { toast } from "sonner";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2, Plus, GitBranch, Copy, Trash2, Shield, Globe, AlertTriangle,
    ChevronRight, GripVertical, Star, Lock, ArrowUp, ArrowDown, Pencil, Check
} from "lucide-react";

// ─── Types ───
interface Workflow {
    workflowId: number;
    name: string;
    description: string;
    isActive: boolean;
    isDefault: boolean;
    isSystemEnforced: boolean;
    clonedFromId: number | null;
    stepCount: number;
    supplierCount: number;
    ruleCount: number;
}

interface WorkflowDetail extends Workflow {
    steps: WorkflowStep[];
}

interface WorkflowStep {
    stepId: number;
    stepOrder: number;
    stepName: string;
    stepDescription: string;
    assignedRoleId: number;
    roleName: string;
    isOptional: boolean;
}

interface Role {
    roleId: number;
    roleName: string;
    description: string;
}

interface CountryRiskRule {
    ruleId: number;
    country: string;
    riskLevel: string;
    workflowId: number;
    workflowName: string;
}

// ─── Component ───
export default function WorkflowsPage() {
    const { user } = useAuthStore();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [rules, setRules] = useState<CountryRiskRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("templates");

    // Dialog states
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
    const [cloneSourceId, setCloneSourceId] = useState<number | null>(null);
    const [cloneName, setCloneName] = useState("");
    const [isCloning, setIsCloning] = useState(false);

    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDetail | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Edit name/description
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);

    // Add step dialog
    const [addStepOpen, setAddStepOpen] = useState(false);
    const [newStepName, setNewStepName] = useState("");
    const [newStepDesc, setNewStepDesc] = useState("");
    const [newStepRole, setNewStepRole] = useState("");
    const [newStepPosition, setNewStepPosition] = useState("");
    const [isAddingStep, setIsAddingStep] = useState(false);

    // Country risk rule state
    const [ruleCountry, setRuleCountry] = useState("");
    const [ruleRisk, setRuleRisk] = useState("");
    const [ruleWorkflowId, setRuleWorkflowId] = useState("");
    const [isSavingRule, setIsSavingRule] = useState(false);

    // Create workflow dialog
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createName, setCreateName] = useState("");
    const [createDesc, setCreateDesc] = useState("");
    const [createSteps, setCreateSteps] = useState<{ stepName: string; assignedRoleId: string }[]>([
        { stepName: "", assignedRoleId: "" }
    ]);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (user?.buyerId) loadAll();
    }, [user?.buyerId]);

    const loadAll = async () => {
        if (!user?.buyerId) return;
        setIsLoading(true);
        try {
            const [wfRes, rolesRes, rulesRes] = await Promise.all([
                apiClient.get(`/api/workflows/buyer/${user.buyerId}`),
                apiClient.get(`/api/workflows/roles/${user.buyerId}`),
                apiClient.get(`/api/workflows/country-rules/${user.buyerId}`)
            ]);
            setWorkflows(wfRes as any);
            setRoles((rolesRes as any).map((r: any) => ({
                roleId: r.roleId || r.roleid,
                roleName: r.roleName || r.rolename,
                description: r.description
            })));
            setRules(rulesRes as any);
        } catch (e) {
            console.error("Failed to load workflow data:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Handlers ───

    const handleClone = async () => {
        if (!cloneSourceId || !cloneName || !user?.buyerId) return;
        setIsCloning(true);
        try {
            await apiClient.post(`/api/workflows/clone`, {
                sourceWorkflowId: cloneSourceId,
                newName: cloneName,
                buyerId: user.buyerId
            });
            setCloneDialogOpen(false);
            setCloneName("");
            loadAll();
        } catch (e) {
            console.error("Clone failed:", e);
        } finally {
            setIsCloning(false);
        }
    };

    const handleViewDetails = async (workflowId: number) => {
        setIsLoadingDetail(true);
        setDetailDialogOpen(true);
        try {
            const res = await apiClient.get(`/api/workflows/${workflowId}`);
            setSelectedWorkflow(res as any);
        } catch (e) {
            console.error("Failed to load workflow details:", e);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleSetDefault = async (workflowId: number) => {
        try {
            await apiClient.put(`/api/workflows/${workflowId}/default`);
            toast.success("Default workflow updated");
            loadAll();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || e?.message || "Failed to set default");
        }
    };

    const handleDeleteWorkflow = async (workflowId: number) => {
        if (!confirm("Delete this workflow? Suppliers using it will revert to the default workflow.")) return;
        try {
            await apiClient.delete(`/api/workflows/${workflowId}`);
            loadAll();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || e?.message || "Delete failed");
        }
    };

    const handleAddStep = async () => {
        if (!selectedWorkflow || !newStepName || !newStepRole) return;
        setIsAddingStep(true);
        try {
            await apiClient.post(`/api/workflows/${selectedWorkflow.workflowId}/steps`, {
                stepName: newStepName,
                stepDescription: newStepDesc,
                assignedRoleId: parseInt(newStepRole),
                position: newStepPosition ? parseInt(newStepPosition) : undefined
            });
            // Refresh details
            const res = await apiClient.get(`/api/workflows/${selectedWorkflow.workflowId}`);
            setSelectedWorkflow(res as any);
            setAddStepOpen(false);
            setNewStepName("");
            setNewStepDesc("");
            setNewStepRole("");
            setNewStepPosition("");
            loadAll();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || e?.message || "Failed to add step");
        } finally {
            setIsAddingStep(false);
        }
    };

    const handleRemoveStep = async (stepId: number) => {
        if (!selectedWorkflow) return;
        if (!confirm("Remove this step from the workflow?")) return;
        try {
            await apiClient.delete(`/api/workflows/${selectedWorkflow.workflowId}/steps/${stepId}`);
            const res = await apiClient.get(`/api/workflows/${selectedWorkflow.workflowId}`);
            setSelectedWorkflow(res as any);
            loadAll();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || e?.message || "Failed to remove step");
        }
    };

    const handleMoveStep = async (stepIndex: number, direction: 'up' | 'down') => {
        if (!selectedWorkflow) return;
        const steps = [...selectedWorkflow.steps];
        const swapIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
        if (swapIndex < 0 || swapIndex >= steps.length) return;

        const stepOrders = steps.map((s, i) => {
            if (i === stepIndex) return { stepId: s.stepId, newOrder: steps[swapIndex].stepOrder };
            if (i === swapIndex) return { stepId: s.stepId, newOrder: steps[stepIndex].stepOrder };
            return { stepId: s.stepId, newOrder: s.stepOrder };
        });

        try {
            await apiClient.put(`/api/workflows/${selectedWorkflow.workflowId}/steps/reorder`, { stepOrders });
            const res = await apiClient.get(`/api/workflows/${selectedWorkflow.workflowId}`);
            setSelectedWorkflow(res as any);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || e?.message || "Failed to reorder");
        }
    };

    // Country rules
    const handleSaveRule = async () => {
        if (!ruleCountry || !ruleRisk || !ruleWorkflowId || !user?.buyerId) return;
        setIsSavingRule(true);
        try {
            await apiClient.post(`/api/workflows/country-rules`, {
                buyerId: user.buyerId,
                country: ruleCountry,
                riskLevel: ruleRisk,
                workflowId: parseInt(ruleWorkflowId)
            });
            setRuleCountry("");
            setRuleRisk("");
            setRuleWorkflowId("");
            loadAll();
        } catch (e) {
            console.error("Failed to save rule:", e);
        } finally {
            setIsSavingRule(false);
        }
    };

    const handleDeleteRule = async (ruleId: number) => {
        try {
            await apiClient.delete(`/api/workflows/country-rules/${ruleId}`);
            loadAll();
        } catch (e) {
            console.error("Failed to delete rule:", e);
        }
    };

    const handleCreateWorkflow = async () => {
        if (!createName || !user?.buyerId) return;
        setIsCreating(true);
        try {
            await apiClient.post(`/api/workflows`, {
                buyerId: user.buyerId,
                name: createName,
                description: createDesc,
                steps: createSteps.filter(s => s.stepName && s.assignedRoleId).map((s, i) => ({
                    stepOrder: i + 1,
                    stepName: s.stepName,
                    assignedRoleId: parseInt(s.assignedRoleId)
                }))
            });
            setCreateDialogOpen(false);
            setCreateName("");
            setCreateDesc("");
            setCreateSteps([{ stepName: "", assignedRoleId: "" }]);
            toast.success("Workflow created successfully");
            loadAll();
        } catch (e) {
            console.error("Create failed:", e);
        } finally {
            setIsCreating(false);
        }
    };

    const toggleStatus = async (id: number, currentStatus: boolean) => {
        try {
            await apiClient.patch(`/api/workflows/${id}/status`, { isActive: !currentStatus });
            loadAll();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || e?.message || "Failed to toggle status");
        }
    };

    // ─── Risk Level Colors ───
    const riskColor = (level: string) => {
        switch (level) {
            case 'High': return 'bg-red-100 text-red-700 border-red-200';
            case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Low': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // ─── Render ───
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Workflow Management</h1>
                    <p className="text-muted-foreground">Manage approval workflows and country-risk routing rules.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="templates" className="gap-2">
                        <GitBranch className="h-4 w-4" /> Workflow Templates
                    </TabsTrigger>
                    <TabsTrigger value="country-risk" className="gap-2">
                        <Globe className="h-4 w-4" /> Country Risk Rules
                    </TabsTrigger>
                </TabsList>

                {/* ═══════ TAB 1: WORKFLOW TEMPLATES ═══════ */}
                <TabsContent value="templates" className="space-y-4">
                    <div className="flex justify-end gap-2">
                        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Plus className="mr-2 h-4 w-4" /> New Workflow
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Create New Workflow</DialogTitle>
                                    <DialogDescription>Build a workflow from scratch with custom steps.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input placeholder="e.g. High-Risk Onboarding" value={createName} onChange={e => setCreateName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Input placeholder="Short description" value={createDesc} onChange={e => setCreateDesc(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2 border-t pt-4">
                                        <Label>Approval Steps</Label>
                                        <div className="space-y-2">
                                            {createSteps.map((step, i) => (
                                                <div key={i} className="flex items-end gap-2 p-3 bg-muted/50 rounded-md">
                                                    <div className="w-8 flex justify-center items-center h-9 font-bold text-xs text-muted-foreground rounded-full bg-background border">{i + 1}</div>
                                                    <div className="flex-1">
                                                        <Input value={step.stepName} onChange={e => {
                                                            const s = [...createSteps]; s[i].stepName = e.target.value; setCreateSteps(s);
                                                        }} placeholder="Step name" />
                                                    </div>
                                                    <div className="w-48">
                                                        <Select value={step.assignedRoleId} onValueChange={v => {
                                                            const s = [...createSteps]; s[i].assignedRoleId = v; setCreateSteps(s);
                                                        }}>
                                                            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                                                            <SelectContent>
                                                                {roles.map(r => (<SelectItem key={r.roleId} value={String(r.roleId)}>{r.roleName}</SelectItem>))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        if (createSteps.length > 1) setCreateSteps(createSteps.filter((_, idx) => idx !== i));
                                                    }} disabled={createSteps.length === 1}>
                                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setCreateSteps([...createSteps, { stepName: "", assignedRoleId: "" }])}>
                                                <Plus className="mr-2 h-4 w-4" /> Add Step
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateWorkflow} disabled={isCreating || !createName}>
                                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {workflows.map(wf => (
                                <Card key={wf.workflowId} className={`relative overflow-hidden transition-shadow hover:shadow-md ${wf.isDefault ? 'ring-2 ring-primary/30' : ''}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <GitBranch className="h-4 w-4 text-primary" />
                                                {wf.name}
                                            </CardTitle>
                                            <div className="flex gap-1">
                                                {wf.isDefault && (
                                                    <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 border-primary/20 text-primary">
                                                        <Star className="h-3 w-3" /> Default
                                                    </Badge>
                                                )}
                                                {wf.isSystemEnforced && (
                                                    <Badge variant="outline" className="text-[10px] gap-1 bg-amber-50 border-amber-200 text-amber-700">
                                                        <Lock className="h-3 w-3" /> System
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <CardDescription className="line-clamp-2 h-10 text-xs">{wf.description || "No description"}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>{wf.stepCount} steps</span>
                                            <span>•</span>
                                            <span>{wf.supplierCount} suppliers</span>
                                            {(wf.ruleCount || 0) > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{wf.ruleCount} rules</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <span className={wf.isActive ? 'text-green-600' : 'text-red-500'}>{wf.isActive ? 'Active' : 'Inactive'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleViewDetails(wf.workflowId)}>
                                                View & Edit
                                            </Button>
                                            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                                                setCloneSourceId(wf.workflowId);
                                                setCloneName(`${wf.name} (Copy)`);
                                                setCloneDialogOpen(true);
                                            }}>
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                            {!wf.isDefault && !wf.isSystemEnforced && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-muted-foreground hover:text-red-600"
                                                    onClick={() => handleDeleteWorkflow(wf.workflowId)}
                                                    disabled={wf.supplierCount > 0 || (wf.ruleCount || 0) > 0}
                                                    title={
                                                        wf.supplierCount > 0 ? "Cannot delete: Assigned to suppliers" :
                                                            (wf.ruleCount || 0) > 0 ? "Cannot delete: Used in risk rules" :
                                                                "Delete workflow"
                                                    }
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                        {!wf.isDefault && wf.isActive && (
                                            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => handleSetDefault(wf.workflowId)}>
                                                <Star className="mr-1 h-3 w-3" /> Set as Default
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                            {workflows.length === 0 && (
                                <div className="col-span-full text-center p-12 text-muted-foreground border rounded-lg border-dashed">
                                    <GitBranch className="mx-auto h-8 w-8 mb-3 opacity-50" />
                                    <p>No workflows yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* ═══════ TAB 2: COUNTRY RISK RULES ═══════ */}
                <TabsContent value="country-risk" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Globe className="h-5 w-5" />
                                Country Risk Auto-Assignment
                            </CardTitle>
                            <CardDescription>
                                Map supplier countries to risk levels and automatically assign the appropriate workflow template.
                                Rule priority: Manual Override → Country Rule → Default Workflow
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Add Rule Form */}
                            <div className="flex items-end gap-3 p-4 bg-muted/30 rounded-lg border border-dashed">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Country</Label>
                                    <Input placeholder="e.g. China, India, USA" value={ruleCountry} onChange={e => setRuleCountry(e.target.value)} />
                                </div>
                                <div className="w-36 space-y-1">
                                    <Label className="text-xs">Risk Level</Label>
                                    <Select value={ruleRisk} onValueChange={setRuleRisk}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">🟢 Low</SelectItem>
                                            <SelectItem value="Medium">🟡 Medium</SelectItem>
                                            <SelectItem value="High">🔴 High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-56 space-y-1">
                                    <Label className="text-xs">Workflow</Label>
                                    <Select value={ruleWorkflowId} onValueChange={setRuleWorkflowId}>
                                        <SelectTrigger><SelectValue placeholder="Assign workflow" /></SelectTrigger>
                                        <SelectContent>
                                            {workflows.filter(w => w.isActive).map(w => (
                                                <SelectItem key={w.workflowId} value={String(w.workflowId)}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleSaveRule} disabled={isSavingRule || !ruleCountry || !ruleRisk || !ruleWorkflowId}>
                                    {isSavingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                </Button>
                            </div>

                            {/* Rules Table */}
                            {rules.length > 0 ? (
                                <div className="rounded-md border overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                                                <th className="px-4 py-3">Country</th>
                                                <th className="px-4 py-3">Risk Level</th>
                                                <th className="px-4 py-3">Assigned Workflow</th>
                                                <th className="px-4 py-3 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {rules.map(rule => (
                                                <tr key={rule.ruleId} className="text-sm hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium">{rule.country}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={`text-xs ${riskColor(rule.riskLevel)}`}>
                                                            {rule.riskLevel === 'High' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                                            {rule.riskLevel}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        <span className="flex items-center gap-1.5">
                                                            <GitBranch className="h-3.5 w-3.5" /> {rule.workflowName}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteRule(rule.ruleId)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
                                    <Globe className="mx-auto h-8 w-8 mb-3 opacity-50" />
                                    <p>No country risk rules configured.</p>
                                    <p className="text-xs mt-1">Add rules above to auto-assign workflows based on supplier country.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ═══════ CLONE DIALOG ═══════ */}
            <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clone Workflow</DialogTitle>
                        <DialogDescription>Create a copy you can customize with extra steps.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        <div className="space-y-2">
                            <Label>New Workflow Name</Label>
                            <Input value={cloneName} onChange={e => setCloneName(e.target.value)} placeholder="e.g. High-Risk Onboarding" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleClone} disabled={isCloning || !cloneName}>
                            {isCloning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Copy className="mr-2 h-4 w-4" /> Clone
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════ WORKFLOW DETAIL / STEP EDITOR DIALOG ═══════ */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    {isLoadingDetail ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : selectedWorkflow ? (
                        <>
                            <DialogHeader>
                                {isEditingName && !selectedWorkflow.isSystemEnforced ? (
                                    <div className="space-y-2">
                                        <DialogTitle className="sr-only">Edit Workflow {selectedWorkflow.name}</DialogTitle>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="text-lg font-semibold"
                                                placeholder="Workflow name"
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={async () => {
                                                if (!editName || !selectedWorkflow) return;
                                                setIsSavingName(true);
                                                try {
                                                    await apiClient.put(`/api/workflows/${selectedWorkflow.workflowId}`, {
                                                        name: editName,
                                                        description: editDesc
                                                    });
                                                    setSelectedWorkflow({ ...selectedWorkflow, name: editName, description: editDesc });
                                                    setIsEditingName(false);
                                                    loadAll();
                                                } catch (e: any) {
                                                    toast.error(e?.response?.data?.error || e?.message || 'Failed to update');
                                                } finally {
                                                    setIsSavingName(false);
                                                }
                                            }} disabled={isSavingName}>
                                                {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                                            </Button>
                                        </div>
                                        <Input
                                            value={editDesc}
                                            onChange={e => setEditDesc(e.target.value)}
                                            className="text-sm"
                                            placeholder="Description"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <DialogTitle className="flex items-center gap-2">
                                            <GitBranch className="h-5 w-5 text-primary" />
                                            {selectedWorkflow.name}
                                            {selectedWorkflow.isSystemEnforced && (
                                                <Badge variant="outline" className="text-[10px] gap-1 bg-amber-50 border-amber-200 text-amber-700 ml-2">
                                                    <Lock className="h-3 w-3" /> System (Read-Only)
                                                </Badge>
                                            )}
                                            {!selectedWorkflow.isSystemEnforced && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => {
                                                    setEditName(selectedWorkflow.name);
                                                    setEditDesc(selectedWorkflow.description || '');
                                                    setIsEditingName(true);
                                                }}>
                                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                                </Button>
                                            )}
                                        </DialogTitle>
                                        <DialogDescription>{selectedWorkflow.description}</DialogDescription>
                                    </>
                                )}
                            </DialogHeader>

                            <div className="py-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">Approval Steps</h3>
                                    {!selectedWorkflow.isSystemEnforced && (
                                        <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" className="text-xs">
                                                    <Plus className="mr-1 h-3 w-3" /> Add Step
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add Step</DialogTitle>
                                                    <DialogDescription>Add a new approval step to this workflow.</DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-3 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Step Name</Label>
                                                        <Input value={newStepName} onChange={e => setNewStepName(e.target.value)} placeholder="e.g. Legal Review" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Description (optional)</Label>
                                                        <Input value={newStepDesc} onChange={e => setNewStepDesc(e.target.value)} placeholder="What should the reviewer check?" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Assigned Role</Label>
                                                        <Select value={newStepRole} onValueChange={setNewStepRole}>
                                                            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                                            <SelectContent>
                                                                {roles.map(r => (<SelectItem key={r.roleId} value={String(r.roleId)}>{r.roleName}</SelectItem>))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Position (optional)</Label>
                                                        <Input type="number" min={1} max={selectedWorkflow.steps.length + 1} value={newStepPosition} onChange={e => setNewStepPosition(e.target.value)} placeholder={`1-${selectedWorkflow.steps.length + 1} (default: end)`} />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setAddStepOpen(false)}>Cancel</Button>
                                                    <Button onClick={handleAddStep} disabled={isAddingStep || !newStepName || !newStepRole}>
                                                        {isAddingStep && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Step
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>

                                {/* Step Pipeline */}
                                <div className="space-y-1">
                                    {selectedWorkflow.steps.map((step, i) => (
                                        <div key={step.stepId} className="group flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-transparent hover:border-border">
                                            <div className="flex flex-col items-center gap-0.5">
                                                {!selectedWorkflow.isSystemEnforced && (
                                                    <>
                                                        <button
                                                            onClick={() => handleMoveStep(i, 'up')}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                            disabled={i === 0}
                                                        >
                                                            <ArrowUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleMoveStep(i, 'down')}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                            disabled={i === selectedWorkflow.steps.length - 1}
                                                        >
                                                            <ArrowDown className="h-3 w-3" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                                {step.stepOrder}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm">{step.stepName}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <Shield className="h-3 w-3" /> {step.roleName || "Unassigned"}
                                                    {step.isOptional && <Badge variant="outline" className="text-[9px] px-1 py-0">Optional</Badge>}
                                                </div>
                                                {step.stepDescription && (
                                                    <div className="text-xs text-muted-foreground/70 mt-0.5">{step.stepDescription}</div>
                                                )}
                                            </div>
                                            {!selectedWorkflow.isSystemEnforced && selectedWorkflow.steps.length > 1 && (
                                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600" onClick={() => handleRemoveStep(step.stepId)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {i < selectedWorkflow.steps.length - 1 && (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 absolute right-4" />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {selectedWorkflow.isSystemEnforced && (
                                    <div className="text-xs text-amber-600 bg-amber-50 rounded-md p-3 flex items-start gap-2">
                                        <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>This is the system-enforced default workflow and cannot be edited. Clone it to create a customizable version.</span>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="flex-row gap-2">
                                {!selectedWorkflow.isActive ? (
                                    <Button size="sm" onClick={() => { toggleStatus(selectedWorkflow.workflowId, false); setDetailDialogOpen(false); }}>Activate</Button>
                                ) : !selectedWorkflow.isSystemEnforced ? (
                                    <Button variant="destructive" size="sm" onClick={() => { toggleStatus(selectedWorkflow.workflowId, true); setDetailDialogOpen(false); }}>Deactivate</Button>
                                ) : null}
                                <Button variant="outline" size="sm" onClick={() => {
                                    setCloneSourceId(selectedWorkflow.workflowId);
                                    setCloneName(`${selectedWorkflow.name} (Copy)`);
                                    setDetailDialogOpen(false);
                                    setCloneDialogOpen(true);
                                }}>
                                    <Copy className="mr-1 h-3.5 w-3.5" /> Clone
                                </Button>
                            </DialogFooter>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
