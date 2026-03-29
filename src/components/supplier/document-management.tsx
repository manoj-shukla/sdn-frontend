"use client";

import { useEffect, useState, useRef } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, Trash2, Eye, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Document {
    documentId: number;
    documentName: string;
    documentType: string;
    filePath: string;
    createdAt?: string;
    verificationStatus: string;
    notes?: string;
}

interface SupplierDocumentManagementProps {
    title?: string;
    description?: string;
}

const DOCUMENT_TYPES = [
    "Certificate of Incorporation",
    "Tax Certificate (VAT/GST/PAN)",
    "Bank Account Confirmation",
    "Insurance Certificate",
    "Quality Certification (ISO, etc.)",
    "Proof of Address",
    "Compliance Declaration",
    "Other"
];

export function SupplierDocumentManagement({
    title = "Uploaded Documents",
    description = "Manage your compliance documents."
}: SupplierDocumentManagementProps) {
    const { user } = useAuthStore();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedType, setSelectedType] = useState<string>("");
    const [uploadNotes, setUploadNotes] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = async () => {
        if (!user?.supplierId) return;
        try {
            setLoading(true);
            const res = await apiClient.get(`/api/suppliers/${user.supplierId}/documents`) as any;
            const rawDocs = res || [];
            // Map lowercase keys from Postgres
            const mappedDocs = rawDocs.map((d: any) => ({
                ...d,
                documentId: d.documentId || d.documentid,
                documentName: d.documentName || d.documentname,
                documentType: d.documentType || d.documenttype,
                filePath: d.filePath || d.filepath,
                createdAt: d.createdAt || d.createdat,
                verificationStatus: d.verificationStatus || d.verificationstatus,
                notes: d.notes || ""
            }));
            // Sort by createdAt descending to get latest first
            const sortedDocs = mappedDocs.sort((a: any, b: any) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );

            setDocuments(sortedDocs);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [user?.supplierId]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.supplierId) return;

        if (!selectedType) {
            toast("Please select a document type first.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", selectedType);
        formData.append("notes", uploadNotes);

        try {
            setUploading(true);
            await apiClient.post(`/api/suppliers/${user.supplierId}/documents`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            await fetchDocuments();
            toast.success(`${file.name} uploaded successfully as ${selectedType}!`);
            setSelectedType(""); // Reset after upload
            setUploadNotes("");
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("File upload failed. Please try again.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const triggerUpload = () => {
        if (!selectedType) {
            toast("Please select a document type before selecting a file.");
            return;
        }
        fileInputRef.current?.click();
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this document?")) {
            try {
                await apiClient.delete(`/api/documents/${id}`);
                await fetchDocuments();
            } catch (error) {
                console.error("Failed to delete document", error);
                toast.error("Failed to delete document.");
            }
        }
    };

    const viewFile = (filePath: string) => {
        if (!filePath) return;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";
        // filePath in DB is 'uploads/timestamp-name'
        // We serve static files from /uploads
        window.open(`${baseUrl}/${filePath}`, "_blank");
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
            />

            <Card className="bg-muted/10 border-2">
                <CardContent className="pt-6 pb-8 space-y-6">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="space-y-2">
                            <Label>Step 1: Select Document Type</Label>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_TYPES.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Step 2: Add Notes (Optional)</Label>
                            <Textarea
                                placeholder="Add any comments or context for this document..."
                                value={uploadNotes}
                                onChange={(e) => setUploadNotes(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Step 3: Upload File</Label>
                            <div
                                className={`border-dashed border-2 rounded-lg bg-background p-8 flex flex-col items-center justify-center space-y-3 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:bg-muted/5'}`}
                                onClick={uploading ? undefined : triggerUpload}
                            >
                                <div className="p-3 rounded-full bg-muted">
                                    {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <UploadCloud className="h-6 w-6 text-muted-foreground" />}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold">{uploading ? "Uploading..." : "Click to select and upload"}</p>
                                    <p className="text-xs text-muted-foreground">PDF, PNG, JPG (Max 10MB)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.documentId}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        {doc.documentName}
                                    </TableCell>
                                    <TableCell>{doc.documentType}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            (doc.verificationStatus === "VERIFIED" || doc.verificationStatus === "APPROVED") ? "success" :
                                                (doc.verificationStatus === "PENDING" || doc.verificationStatus === "PENDING_APPROVAL") ? "warning" :
                                                    (doc.verificationStatus === "ARCHIVED") ? "secondary" : "destructive"
                                        }>
                                            {doc.verificationStatus === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' :
                                                doc.verificationStatus === 'REWORK_REQUIRED' ? 'REWORK REQUESTED' :
                                                    doc.verificationStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-muted-foreground italic text-sm">
                                        {doc.notes || "-"}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => viewFile(doc.filePath)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(doc.documentId)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {documents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                        No documents found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
