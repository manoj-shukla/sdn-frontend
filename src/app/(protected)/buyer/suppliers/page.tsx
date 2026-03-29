"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, GitBranch, Mail, Upload, Send, Copy, Check, Info, ShieldCheck, AlertCircle, MoreHorizontal, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionMenu } from "@/components/ui/action-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { toast } from "sonner";

import { ComposeMessageDialog } from "@/components/buyer/compose-message-dialog";
import { BulkUploadDialog } from "@/components/buyer/bulk-upload-dialog";
import { BulkInviteDialog } from "@/components/buyer/bulk-invite-dialog";
import { useBuyerRole } from "@/app/(protected)/buyer/context/BuyerRoleContext";
import { useAuthStore } from "@/lib/store/auth-store";

const COUNTRIES = ["United States", "United Kingdom", "Canada", "Germany", "India", "Singapore", "Australia"];
const SUPPLIER_TYPES = ["Individual", "Enterprise"];
const PAGE_SIZE = 10;

interface WorkflowOption {
    workflowId: number;
    name: string;
}

export default function BuyerSuppliersPage() {
    const { user } = useAuthStore();
    const { role } = useBuyerRole();
    const isBuyerAdmin = role === 'Admin' || user?.role === 'ADMIN';

    // Shared Tab State
    const [activeTab, setActiveTab] = useState("directory"); // directory | invitations | new_invite
    const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
    const [loading, setLoading] = useState(true);

    // Suppliers (Directory) State
    const [searchTerm, setSearchTerm] = useState("");
    const [supplierPage, setSupplierPage] = useState(1);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>(undefined);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [assigningId, setAssigningId] = useState<number | null>(null);

    // Invitations State
    const [invitations, setInvitations] = useState<any[]>([]);
    const [sending, setSending] = useState(false);
    const [isBulkInviteOpen, setIsBulkInviteOpen] = useState(false);

    // Form State for New Invite
    const [formData, setFormData] = useState({
        legalName: "", email: "", supplierType: "Enterprise", country: "",
        category: "", riskLevel: "Medium", paymentMethod: "Bank Transfer", currency: "USD",
        workflowId: "", isPreApproved: false, internalCode: "", buyerComments: ""
    });

    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [newInvitationLink, setNewInvitationLink] = useState("");
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [dialogCopied, setDialogCopied] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchData = async () => {
        try {
            setLoading(true);
            const isGlobalAdmin = user?.role === 'ADMIN' && !user?.buyerId;

            // 1. Fetch Suppliers
            try {
                const resSupps = await apiClient.get('/api/suppliers') as any;
                const rawSuppliers = resSupps.content || (Array.isArray(resSupps) ? resSupps : []);
                setSuppliers(rawSuppliers.map((s: any) => ({
                    ...s,
                    supplierId: s.supplierId || s.supplierid,
                    legalName: s.legalName || s.legalname,
                    country: s.country,
                    approvalStatus: s.approvalStatus || s.approvalstatus,
                    assignedWorkflowId: s.assignedWorkflowId || s.assignedworkflowid || null
                })));
            } catch (e) {
                console.error("Failed to fetch expected suppliers", e);
            }

            // 2. Fetch Invitations 
            if (isGlobalAdmin || user?.buyerId) {
                try {
                    const invUrl = isGlobalAdmin ? '/api/invitations' : `/api/invitations/buyer/${user?.buyerId}`;
                    const invRes = await apiClient.get(invUrl);
                    const rawInvitations = (invRes as unknown as any[]) || [];
                    setInvitations(rawInvitations.map((inv: any) => ({
                        ...inv,
                        invitationId: inv.invitationId || inv.invitationid,
                        email: inv.email,
                        legalName: inv.legalName || inv.legalname,
                        internalCode: inv.internalCode || inv.internalcode,
                        status: inv.status,
                        createdAt: inv.createdAt || inv.createdat,
                        invitationLink: inv.invitationLink || inv.invitationlink
                    })));
                } catch (e) {
                    console.error("Failed to fetch invitations", e);
                }
            }

            // 3. Fetch Workflows
            if (isGlobalAdmin || user?.buyerId) {
                try {
                    const wfUrl = user?.buyerId ? `/api/workflows/buyer/${user?.buyerId}` : '/api/workflows';
                    const wfRes = await apiClient.get(wfUrl) as any;
                    const workflowsData = wfRes.data || wfRes || [];
                    setWorkflows((workflowsData as any[]).filter(w => w.isActive !== false).map((w: any) => ({
                        workflowId: w.workflowId || w.workflowid,
                        name: w.name
                    })));
                } catch (e) {
                    console.error("Failed to fetch workflows", e);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.buyerId]);

    // ==== SUPPLIER DIRECTORY METHODS ====
    const handleAssignWorkflow = async (supplierId: number, workflowId: string) => {
        setAssigningId(supplierId);
        try {
            await apiClient.post(`/api/suppliers/${supplierId}/workflow`, {
                workflowId: parseInt(workflowId)
            });
            setSuppliers(prev => prev.map(s =>
                s.supplierId === supplierId ? { ...s, assignedWorkflowId: parseInt(workflowId) } : s
            ));
        } catch (e) {
            console.error("Failed to assign workflow:", e);
        } finally {
            setAssigningId(null);
        }
    };

    const handleSendMessage = (supplierId: string) => {
        setSelectedSupplierId(supplierId);
        setIsComposeOpen(true);
    };

    const filteredSuppliers = suppliers.filter(s =>
        (s.legalName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.supplierId?.toString() || "").includes(searchTerm)
    );

    const supplierTotalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE));
    const paginatedSuppliers = filteredSuppliers.slice((supplierPage - 1) * PAGE_SIZE, supplierPage * PAGE_SIZE);

    const handleSupplierSearch = (value: string) => {
        setSearchTerm(value);
        setSupplierPage(1);
    };

    // ==== INVITATION METHODS ====
    const handleCopyLink = async (link: string, invitationId?: number) => {
        const doCopy = async () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = link;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
            }
        };

        try {
            await doCopy();
            toast.success("Link copied to clipboard");
            if (invitationId) {
                setCopiedId(invitationId);
                setTimeout(() => setCopiedId(null), 2000);
            }
            return true;
        } catch (err) {
            console.error("Copy failed", err);
            toast.error("Failed to copy link");
            return false;
        }
    };

    const handleRevoke = async (invitationId: number) => {
        if (!confirm("Are you sure you want to revoke this invitation? This action cannot be undone.")) return;
        try {
            await apiClient.post(`/api/invitations/${invitationId}/revoke`);
            toast.success("Invitation revoked successfully.");
            fetchData();
        } catch (error) {
            console.error("Failed to revoke invitation:", error);
            toast.error("Failed to revoke invitation.");
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.legalName.trim()) newErrors.legalName = "Legal Name is required.";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format.";
        }
        if (!formData.supplierType) newErrors.supplierType = "Business Type is required.";
        if (!formData.country) newErrors.country = "Country is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSendInviteClick = () => {
        if (validateForm()) {
            setShowConfirmDialog(true);
        }
    };

    const confirmSend = async () => {
        setSending(true);
        setShowConfirmDialog(false);
        try {
            const payload = {
                buyerId: user?.buyerId,
                email: formData.email,
                legalName: formData.legalName,
                supplierType: formData.supplierType,
                country: formData.country,
                categories: ["General"],
                riskLevel: "Medium",
                paymentMethods: ["Bank Transfer"],
                currency: "USD",
                workflowId: formData.workflowId ? parseInt(formData.workflowId) : null,
                isPreApproved: formData.isPreApproved,
                internalCode: formData.internalCode,
                buyerComments: formData.buyerComments
            };

            const res = await apiClient.post('/api/invitations', payload) as any;
            toast.success("Invitation sent successfully.");
            if (res.invitationLink || res.invitationlink || res.token) {
                setNewInvitationLink(res.invitationLink || res.invitationlink || res.invitationToken || res.token);
                setShowLinkDialog(true);
            }

            setFormData({
                legalName: "", email: "", supplierType: "Enterprise", country: "",
                category: "", riskLevel: "Medium", paymentMethod: "Bank Transfer", currency: "USD",
                workflowId: "", isPreApproved: false, internalCode: "", buyerComments: ""
            });
            setErrors({});
            fetchData();
        } catch (error: any) {
            console.error("Invite failed", error);
            const apiError = error?.response?.data?.error;
            if (apiError === "Supplier already exists") {
                toast.error("Supplier already exists in the system.");
            } else if (apiError === "Invalid email format") {
                toast.error("Invalid email format.");
            } else {
                toast.error("Failed to send invitation. Please try again.");
            }
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const stats = {
        sent: invitations.length,
        accepted: invitations.filter(i => i.status === "ACCEPTED").length,
        pending: invitations.filter(i => i.status === "PENDING").length
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
                    <p className="text-muted-foreground">Manage your directory and onboard new suppliers.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-muted/50 border">
                    <TabsTrigger data-testid="tab-directory" value="directory" className="data-[state=active]:bg-background">Directory</TabsTrigger>
                    <TabsTrigger data-testid="tab-invitations" value="invitations" className="data-[state=active]:bg-background">Sent Invitations</TabsTrigger>
                    <TabsTrigger data-testid="tab-new-invite" value="new_invite" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <Send className="h-3 w-3 mr-2" /> New Invite
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: DIRECTORY */}
                <TabsContent value="directory" className="space-y-4 m-0">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Supplier Directory</CardTitle>
                                <div className="flex w-full max-w-sm items-center space-x-2">
                                    <Input
                                        type="search"
                                        placeholder="Search suppliers..."
                                        value={searchTerm}
                                        onChange={(e) => handleSupplierSearch(e.target.value)}
                                    />
                                    <Button size="icon" variant="ghost"><Search className="h-4 w-4" /></Button>
                                </div>
                                {isBuyerAdmin && (
                                    <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}>
                                        <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company Name</TableHead>
                                        <TableHead>Country</TableHead>
                                        <TableHead>Status</TableHead>
                                        {isBuyerAdmin && <TableHead>Workflow</TableHead>}
                                        <TableHead className="text-right">Manage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedSuppliers.map((supplier) => (
                                        <TableRow key={supplier.supplierId}>
                                            <TableCell className="font-medium">{supplier.legalName}</TableCell>
                                            <TableCell>{supplier.country}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    supplier.approvalStatus === "APPROVED" || supplier.approvalStatus === "PRE_APPROVED"
                                                        ? "success"
                                                        : "warning"
                                                }>
                                                    {supplier.approvalStatus?.replace("_", " ") || "DRAFT"}
                                                </Badge>
                                            </TableCell>
                                            {isBuyerAdmin && (
                                                <TableCell>
                                                    <Select
                                                        value={supplier.assignedWorkflowId ? String(supplier.assignedWorkflowId) : ""}
                                                        onValueChange={(v) => handleAssignWorkflow(supplier.supplierId, v)}
                                                        disabled={assigningId === supplier.supplierId}
                                                    >
                                                        <SelectTrigger className="w-44 h-8 text-xs">
                                                            {assigningId === supplier.supplierId ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <SelectValue placeholder="Auto (Default)">
                                                                    {supplier.assignedWorkflowId
                                                                        ? workflows.find(w => w.workflowId === supplier.assignedWorkflowId)?.name || `WF #${supplier.assignedWorkflowId}`
                                                                        : "Auto (Default)"
                                                                    }
                                                                </SelectValue>
                                                            )}
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {workflows.map(w => (
                                                                <SelectItem key={w.workflowId} value={String(w.workflowId)}>
                                                                    <span className="flex items-center gap-1.5">
                                                                        <GitBranch className="h-3 w-3" /> {w.name}
                                                                    </span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            )}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-600 hover:text-blue-800"
                                                        onClick={() => handleSendMessage(String(supplier.supplierId))}
                                                    >
                                                        <Mail className="h-4 w-4 mr-1" /> Message
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/buyer/suppliers/${supplier.supplierId}`}>Details</Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {paginatedSuppliers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={isBuyerAdmin ? 5 : 4} className="text-center py-4 text-muted-foreground">
                                                No suppliers found matching "{searchTerm}"
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            {supplierTotalPages > 1 && (
                                <div className="flex items-center justify-between border-t pt-4 mt-2">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {((supplierPage - 1) * PAGE_SIZE) + 1}–{Math.min(supplierPage * PAGE_SIZE, filteredSuppliers.length)} of {filteredSuppliers.length} suppliers
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSupplierPage(p => Math.max(1, p - 1))}
                                            disabled={supplierPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Page {supplierPage} of {supplierTotalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSupplierPage(p => Math.min(supplierTotalPages, p + 1))}
                                            disabled={supplierPage === supplierTotalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: INVITATIONS */}
                <TabsContent value="invitations" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <Card>
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
                                <div className="text-2xl font-bold">{stats.sent}</div>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Active / Accepted</CardTitle>
                                <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Action</CardTitle>
                                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                            </CardHeader>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Sent Invitations</CardTitle>
                                    <CardDescription>Track status of sent invitations.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    {isBuyerAdmin && (
                                        <Button variant="outline" size="sm" onClick={() => setIsBulkInviteOpen(true)}>
                                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Bulk Invite
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Legal Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Sent Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.map((inv) => (
                                        <TableRow key={inv.invitationId}>
                                            <TableCell className="font-medium">
                                                {inv.legalName || "Unknown"}
                                                <div className="text-xs text-muted-foreground">{inv.internalCode}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {inv.email}</div>
                                            </TableCell>
                                            <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    inv.status === "ACCEPTED" ? "outline" :
                                                        inv.status === "EXPIRED" ? "destructive" : "secondary"
                                                } className={inv.status === "ACCEPTED" ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" : ""}>
                                                    {inv.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(() => {
                                                    const actionItems = [
                                                        ...(inv.status !== "ACCEPTED" && inv.status !== "REVOKED" ? [{
                                                            label: "Copy Invite Link",
                                                            onClick: () => { if (inv.invitationLink) handleCopyLink(inv.invitationLink, inv.invitationId); }
                                                        }] : []),
                                                        ...(inv.status === "PENDING" ? [{
                                                            label: "Revoke",
                                                            onClick: () => handleRevoke(inv.invitationId),
                                                            className: "text-destructive"
                                                        }] : [])
                                                    ];
                                                    if (actionItems.length === 0) return null;
                                                    return (
                                                        <ActionMenu items={actionItems}>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </ActionMenu>
                                                    );
                                                })()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {invitations.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No invitations found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: NEW INVITE */}
                <TabsContent value="new_invite" className="space-y-4 m-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card className="border-t-4 border-t-primary">
                        <CardHeader>
                            <CardTitle>Send New Invitation</CardTitle>
                            <CardDescription>
                                Complete the form below to initiate supplier onboarding.
                                <span className="font-semibold text-foreground"> Mandatory fields are determined by your compliance policy.</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">Invitation Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Supplier Legal Name</Label>
                                        <Input
                                            placeholder="e.g. Acme Corp Ltd"
                                            value={formData.legalName}
                                            onChange={e => {
                                                setFormData({ ...formData, legalName: e.target.value });
                                                if (errors.legalName) setErrors({ ...errors, legalName: "" });
                                            }}
                                            className={errors.legalName ? "border-red-500" : ""}
                                        />
                                        {errors.legalName ? (
                                            <p className="text-sm text-red-500">{errors.legalName}</p>
                                        ) : (
                                            <p className="text-[0.8rem] text-muted-foreground">Official registered name.</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Primary Contact Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="finance@supplier.com"
                                            value={formData.email}
                                            onChange={e => {
                                                setFormData({ ...formData, email: e.target.value });
                                                if (errors.email) setErrors({ ...errors, email: "" });
                                            }}
                                            className={errors.email ? "border-red-500" : ""}
                                        />
                                        {errors.email ? (
                                            <p className="text-sm text-red-500">{errors.email}</p>
                                        ) : (
                                            <p className="text-[0.8rem] text-muted-foreground">Used for login and notifications.</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Business Type</Label>
                                        <Select value={formData.supplierType} onValueChange={val => setFormData({ ...formData, supplierType: val })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{SUPPLIER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Country of Registration</Label>
                                        <Select value={formData.country} onValueChange={val => setFormData({ ...formData, country: val })}>
                                            <SelectTrigger data-testid="country-select" className={errors.country ? "border-red-500" : ""}><SelectValue placeholder="Select Country" /></SelectTrigger>
                                            <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                        </Select>
                                        {errors.country && <p className="text-sm text-red-500">{errors.country}</p>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between bg-muted/20 py-6">
                            <Button variant="ghost" onClick={() => setFormData({
                                legalName: "", email: "", supplierType: "Enterprise", country: "",
                                category: "", riskLevel: "Medium", paymentMethod: "Bank Transfer", currency: "USD",
                                workflowId: "", isPreApproved: false, internalCode: "", buyerComments: ""
                            })}>
                                Reset Form
                            </Button>
                            <Button size="lg" onClick={handleSendInviteClick} disabled={sending}>
                                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Invitation
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* DIALOGS */}
            <ComposeMessageDialog isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} defaultSupplierId={selectedSupplierId} />
            <BulkUploadDialog isOpen={isBulkUploadOpen} onClose={() => setIsBulkUploadOpen(false)} onComplete={() => fetchData()} />
            <BulkInviteDialog isOpen={isBulkInviteOpen} onClose={() => setIsBulkInviteOpen(false)} onComplete={() => fetchData()} />

            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review & Confirm Invite</DialogTitle>
                        <DialogDescription>Please verify the details below. Critical fields will be locked after sending.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-muted-foreground block">Legal Name (Locked)</span><span className="font-semibold">{formData.legalName}</span></div>
                            <div><span className="text-muted-foreground block">Country (Locked)</span><span className="font-semibold">{formData.country}</span></div>
                            <div><span className="text-muted-foreground block">Business Type (Locked)</span><span className="font-semibold">{formData.supplierType}</span></div>
                            <div><span className="text-muted-foreground block">Email</span><span className="font-semibold">{formData.email}</span></div>
                        </div>
                        <div className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm flex gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>Once sent, the supplier will receive an automated email with portal access. You cannot edit locked fields afterwards.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
                        <Button onClick={confirmSend} disabled={sending}>{sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm & Send</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-600" />Invitation Sent Successfully</DialogTitle>
                        <DialogDescription>The supplier has been invited. You can copy the manual link below if needed.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted rounded-md flex items-center justify-between">
                            <code className="text-sm font-mono truncate max-w-[300px]">{newInvitationLink}</code>
                            <Button size="icon" variant="ghost" onClick={async () => {
                                const success = await handleCopyLink(newInvitationLink);
                                if (success) {
                                    setDialogCopied(true);
                                    setTimeout(() => setDialogCopied(false), 2000);
                                }
                            }}>
                                {dialogCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <div className="flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded text-sm">
                            <Info className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>The supplier's legal name and country are now locked. The workflow has been assigned.</p>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={() => setShowLinkDialog(false)}>Done</Button></DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
