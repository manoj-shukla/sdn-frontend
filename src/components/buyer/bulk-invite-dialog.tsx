"use client";

import { useState, useRef } from "react";
import apiClient from "@/lib/api/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, Download, Loader2, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BulkInviteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

interface InviteResult {
    created: Array<{
        row: number;
        invitationId: number;
        legalName: string;
        email: string;
    }>;
    failed: Array<{
        row: number;
        legalName?: string;
        error: string;
    }>;
}

export function BulkInviteDialog({ isOpen, onClose, onComplete }: BulkInviteDialogProps) {
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<InviteResult | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = async () => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'}/api/invitations/bulk-invite/template`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'supplier_bulk_invitation_template.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download template', err);
        }
    };

    const handleFileSelect = (file: File) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
        ];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!validTypes.includes(file.type) && ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
            toast.error('Please upload an Excel file (.xlsx, .xls) or CSV');
            return;
        }
        setSelectedFile(file);
        setResults(null);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'}/api/invitations/bulk-invite`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data: InviteResult = await response.json();
            setResults(data);

            if (data.created.length > 0) {
                if (data.failed.length === 0) {
                    toast.success(`Successfully sent ${data.created.length} invitations!`);
                } else {
                    toast.warning(`Sent ${data.created.length} invitations, but ${data.failed.length} rows failed.`);
                }
                onComplete();
            } else if (data.failed.length > 0) {
                toast.error(`Invite failed: All ${data.failed.length} rows were invalid.`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setResults(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Bulk Invite Suppliers
                    </DialogTitle>
                    <DialogDescription>
                        Upload an Excel file to invite multiple suppliers at once. Each supplier will receive an email with an onboarding link.
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Download Template */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                        <div>
                            <p className="text-sm font-medium">Step 1: Download Template</p>
                            <p className="text-xs text-muted-foreground">Get the Excel template with required columns</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                            <Download className="mr-2 h-4 w-4" /> Template
                        </Button>
                    </div>

                    {/* Step 2: Upload File */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Step 2: Upload Filled File</p>
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver
                                ? 'border-primary bg-primary/5'
                                : selectedFile
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-muted-foreground/25 hover:border-primary'
                                }`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragOver(false);
                                if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
                            }}
                        >
                            {selectedFile ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                    <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(selectedFile.size / 1024).toFixed(1)} KB — Click to change
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Send className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Drop your file here or <span className="text-primary font-medium">browse</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">.xlsx, .xls, or .csv</p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                            }}
                        />
                    </div>

                    {/* Results */}
                    {results && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold">Invitation Summary</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Total Rows Processed: {results.created.length + results.failed.length}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {results.created.length > 0 && (
                                        <Badge variant="success" className="bg-green-100 text-green-700 border-green-200">
                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                            {results.created.length} Success
                                        </Badge>
                                    )}
                                    {results.failed.length > 0 && (
                                        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                                            <XCircle className="mr-1 h-3 w-3" />
                                            {results.failed.length} Failed
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Successful Invitations */}
                            {results.created.length > 0 && (
                                <div className="rounded-lg border">
                                    <div className="p-3 bg-green-50 border-b font-medium text-sm text-green-800">
                                        Invitations Sent
                                    </div>
                                    <div className="divide-y max-h-48 overflow-y-auto">
                                        {results.created.map((item) => (
                                            <div key={item.invitationId} className="p-3 text-sm flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{item.legalName}</p>
                                                    <p className="text-xs text-muted-foreground">Email: {item.email}</p>
                                                </div>
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    Sent
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Failed Rows */}
                            {results.failed.length > 0 && (
                                <div className="rounded-lg border border-destructive/30">
                                    <div className="p-3 bg-red-50 border-b font-medium text-sm text-red-800">
                                        Failed Rows
                                    </div>
                                    <div className="divide-y max-h-36 overflow-y-auto">
                                        {results.failed.map((item, idx) => (
                                            <div key={idx} className="p-3 text-sm">
                                                <span className="font-medium">Row {item.row}</span>
                                                {item.legalName && <span className="text-muted-foreground ml-1">({item.legalName})</span>}
                                                <span className="text-destructive ml-2">— {item.error}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        {results ? 'Close' : 'Cancel'}
                    </Button>
                    {!results && (
                        <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" /> Send Invitations
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
