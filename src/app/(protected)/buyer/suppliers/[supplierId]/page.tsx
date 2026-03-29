"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, CheckCircle, XCircle, AlertCircle, Download, Send, MapPin, Eye } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ApprovalWorkflowProgress } from "@/components/shared/ApprovalWorkflowProgress";

import { useBuyerRole } from "@/app/(protected)/buyer/context/BuyerRoleContext";
import { toast } from "sonner";

export default function SupplierDetailsPage() {
    const params = useParams();
    const supplierId = params.supplierId;
    const { role } = useBuyerRole();

    const [supplier, setSupplier] = useState<any>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingTask, setPendingTask] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // docId being acted on
    const [activeTab, setActiveTab] = useState("documents");

    // Reject Dialog State
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);
            const [supRes, docRes, tasksRes] = await Promise.all([
                apiClient.get(`/api/suppliers/${supplierId}`),
                apiClient.get(`/api/suppliers/${supplierId}/documents`),
                apiClient.get('/api/approvals/pending')
            ]);
            setSupplier(supRes);

            const resData = docRes as any;
            const rawDocs = (Array.isArray(resData) ? resData : (resData?.data || []));
            const mappedDocs = rawDocs.map((d: any) => ({
                ...d,
                documentId: d.documentId || d.documentid,
                documentName: d.documentName || d.documentname,
                documentType: d.documentType || d.documenttype,
                filePath: d.filePath || d.filepath,
                fileSize: d.fileSize || d.filesize || 0,
                createdAt: d.createdAt || d.createdat,
                verificationStatus: d.verificationStatus || d.verificationstatus,
                notes: d.notes || ""
            }));
            setDocuments(mappedDocs);

            const tasks = tasksRes as unknown as any[];
            const task = tasks.find((t: any) => (t.supplierId || t.supplierid) === Number(supplierId));
            setPendingTask(task);
        } catch (error) {
            console.error("Failed to fetch supplier details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (supplierId) {
            fetchData();
        }
    }, [supplierId]);

    // Action Handlers
    const handleWorkflowAction = async (action: 'APPROVE' | 'REJECT', comments?: string) => {
        if (!pendingTask) return;
        setActionLoading('workflow');
        try {
            if (action === 'APPROVE') {
                await apiClient.post(`/api/approvals/${pendingTask.instanceId}/approve`, {
                    stepOrder: pendingTask.stepOrder,
                    comments: "Approved via Supplier Detail Page"
                });
            } else {
                await apiClient.post(`/api/approvals/${pendingTask.instanceId}/reject`, {
                    stepOrder: pendingTask.stepOrder,
                    comments: comments || "Rejected via Supplier Detail Page"
                });
            }
            // Refresh
            const tasksRes = await apiClient.get('/api/approvals/pending');
            const task = (tasksRes as unknown as any[]).find((t: any) => (t.supplierId || t.supplierid) === Number(supplierId));
            setPendingTask(task);
            setActionLoading(null);
            toast.success(`Successfully ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`);
        } catch (error) {
            console.error("Action failed", error);
            setActionLoading(null);
            toast.error("Action failed. Please try again.");
        }
    };

    const handleStatusUpdate = async (docId: number, status: 'VERIFIED' | 'REJECTED', notes?: string) => {
        try {
            setActionLoading(docId.toString());
            await apiClient.put(`/api/documents/${docId}/verify`, { status, notes });
            // Optimistic update
            setDocuments(prev => prev.map(d =>
                d.documentId === docId ? { ...d, verificationStatus: status, notes: notes || d.notes } : d
            ));
            if (status === 'REJECTED') {
                setRejectDialogOpen(false);
                setRejectReason("");
                setSelectedDocId(null);
            }
        } catch (error) {
            console.error("Failed to update status", error);
        } finally {
            setActionLoading(null);
        }
    };

    const openRejectDialog = (docId: number) => {
        setSelectedDocId(docId);
        setRejectDialogOpen(true);
    };

    // Group documents by type
    const groupedDocs = documents.reduce((acc, doc) => {
        const type = doc.documentType || "Uncategorized";
        if (!acc[type]) acc[type] = [];
        acc[type].push(doc);
        return acc;
    }, {} as Record<string, any[]>);

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!supplier) return <div className="p-8 text-center">Supplier not found</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{supplier.legalName}</h1>
                    <div className="flex items-center space-x-2 mt-2 text-muted-foreground">
                        <span>ID: {supplier.supplierId}</span>
                        <span>•</span>
                        <span>{supplier.country}</span>
                        <span>•</span>
                        <Badge variant={supplier.approvalStatus === "APPROVED" ? "success" : "secondary"}>
                            {supplier.approvalStatus}
                        </Badge>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="documents" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="finance">Finance</TabsTrigger>
                    <TabsTrigger value="tax">Tax</TabsTrigger>
                    <TabsTrigger value="documents">
                        Documents
                        {documents.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 rounded-full">{documents.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="contacts">Contacts</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div>
                                <h4 className="font-semibold mb-1">Business Type</h4>
                                <p className="text-sm text-muted-foreground">{supplier.businessType || "N/A"}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Country</h4>
                                <p className="text-sm text-muted-foreground">{supplier.country || "N/A"}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Tax ID</h4>
                                <p className="text-sm text-muted-foreground">{supplier.taxId || "N/A"}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Website</h4>
                                <p className="text-sm text-muted-foreground">{supplier.website || "N/A"}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Description</h4>
                                <p className="text-sm text-muted-foreground">{supplier.description || "N/A"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-6">
                        <ApprovalWorkflowProgress supplierId={Number(supplierId)} isSupplierView={false} />
                    </div>
                </TabsContent>

                <TabsContent value="address" className="space-y-4">
                    {supplier.addresses && supplier.addresses.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {supplier.addresses.map((addr: any, index: number) => (
                                <Card key={index} className="relative">
                                    {addr.isPrimary && (
                                        <div className="absolute top-2 right-2">
                                            <Badge variant="default" className="text-xs">Primary</Badge>
                                        </div>
                                    )}
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center">
                                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                            {addr.addressType || "Address"}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm">
                                        <p>{addr.addressLine1}</p>
                                        {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                                        <p className="mt-1">
                                            {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postalCode}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center border rounded-lg border-dashed text-muted-foreground">
                            No addresses found.
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="finance" className="space-y-4">
                    {/* Approval Actions Removed - Now centralized in "My Reviews" page */}

                    <Card>
                        <CardHeader>
                            <CardTitle>Bank & Financial Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold mb-1">Bank Name</h4>
                                <p className="text-sm text-muted-foreground">{supplier.bankName || "N/A"}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Account Number</h4>
                                <p className="text-sm text-muted-foreground">
                                    {supplier.accountNumber ? `****${supplier.accountNumber.slice(-4)}` : "N/A"}
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Routing Number</h4>
                                <p className="text-sm text-muted-foreground">{supplier.routingNumber || "N/A"}</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tax" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tax Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold mb-1">Tax ID / PAN</h4>
                                <p className="text-sm text-muted-foreground">{supplier.taxId || "N/A"}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">GST Registered</h4>
                                <Badge variant={supplier.isGstRegistered ? "default" : "secondary"}>
                                    {supplier.isGstRegistered ? "Yes" : "No"}
                                </Badge>
                            </div>
                            {supplier.isGstRegistered && (
                                <div>
                                    <h4 className="font-semibold mb-1">GSTIN</h4>
                                    <p className="text-sm text-muted-foreground">{supplier.gstin || "N/A"}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents" className="space-y-6">
                    {Object.keys(groupedDocs).length === 0 ? (
                        <div className="text-center py-12 border rounded-lg border-dashed bg-muted/20">
                            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No documents uploaded yet.</p>
                        </div>
                    ) : (
                        Object.entries(groupedDocs).map(([type, docs]: [string, any]) => (
                            <Card key={type}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-medium flex items-center">
                                            <FileText className="mr-2 h-4 w-4" />
                                            {type}
                                        </CardTitle>
                                        <Badge variant="outline">{docs.length} files</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Document Name</TableHead>
                                                <TableHead>Uploaded</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Notes</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {docs.map((doc: any) => (
                                                <TableRow key={doc.documentId}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{doc.documentName}</span>
                                                            <span className="text-xs text-muted-foreground">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {doc.createdAt ? format(new Date(doc.createdAt), 'MMM d, yyyy') : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge status={doc.verificationStatus} />
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                                                        {doc.notes}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end items-center gap-2">
                                                            {doc.verificationStatus === 'PENDING' && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleStatusUpdate(doc.documentId, 'VERIFIED')}
                                                                        disabled={actionLoading === doc.documentId.toString()}
                                                                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                                        title="Verify Document"
                                                                    >
                                                                        {actionLoading === doc.documentId.toString() ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                                                        Verify
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => openRejectDialog(doc.documentId)}
                                                                        disabled={actionLoading === doc.documentId.toString()}
                                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        title="Reject Document"
                                                                    >
                                                                        <XCircle className="h-4 w-4 mr-1" />
                                                                        Reject
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-primary hover:text-primary/80 hover:bg-primary/10"
                                                                onClick={() => {
                                                                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';
                                                                    const filePath = doc.filePath?.startsWith('/') ? doc.filePath : `/${doc.filePath}`;
                                                                    window.open(`${baseUrl}${filePath}`, '_blank');
                                                                }}
                                                                title="View Document"
                                                            >
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="contacts">
                    {supplier.contacts && supplier.contacts.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {supplier.contacts.map((contact: any) => (
                                <Card key={contact.userId}>
                                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {contact.email ? contact.email.charAt(0).toUpperCase() : "U"}
                                        </div>
                                        <div className="flex flex-col">
                                            <CardTitle className="text-base">{contact.subRole || contact.role}</CardTitle>
                                            <p className="text-xs text-muted-foreground">User ID: {contact.userId}</p>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Send className="h-3 w-3 mr-2" />
                                            {contact.email}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center border rounded-lg border-dashed text-muted-foreground">
                            No contacts found.
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Reject Reason Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Document</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this document. This will be visible to the supplier.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Reason for rejection (e.g., blurred image, expired)..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedDocId && handleStatusUpdate(selectedDocId, 'REJECTED', rejectReason)}
                            disabled={!rejectReason}
                        >
                            Reject Document
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
        PENDING: "warning",
        VERIFIED: "success",
        APPROVED: "success",
        REJECTED: "destructive",
        EXPIRED: "destructive"
    };

    // Fallback for custom badge variant types vs shadcn types
    const variant = (variants[status] || "secondary") as any;

    return (
        <Badge variant={variant} className="capitalize">
            {status.toLowerCase()}
        </Badge>
    );
}
