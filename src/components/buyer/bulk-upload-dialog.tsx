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
import { Upload, Download, Loader2, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BulkUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

interface UploadResult {
    created: Array<{
        row: number;
        supplierId: number;
        legalName: string;
        username: string;
        tempPassword: string;
    }>;
    failed: Array<{
        row: number;
        legalName?: string;
        error: string;
    }>;
}

export function BulkUploadDialog({ isOpen, onClose, onComplete }: BulkUploadDialogProps) {
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<UploadResult | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = async () => {
        try {
            const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083').replace(/\/$/, '');
            const response = await fetch(
                `${baseUrl}/api/suppliers/bulk-upload/template`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to download: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'supplier_bulk_upload_template.xlsx';
            document.body.appendChild(a); // Required for Firefox/some browsers
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success("Template downloaded successfully");
        } catch (err) {
            console.error('Failed to download template', err);
            toast.error("Failed to download template");
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

            const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083').replace(/\/$/, '');
            const response = await fetch(
                `${baseUrl}/api/suppliers/bulk-upload`,
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

            const data: UploadResult = await response.json();
            setResults(data);

            if (data.created.length > 0) {
                if (data.failed.length === 0) {
                    toast.success(`Successfully uploaded ${data.created.length} suppliers!`);
                } else {
                    toast.warning(`Uploaded ${data.created.length} suppliers, but ${data.failed.length} rows failed.`);
                }
                onComplete();
            } else if (data.failed.length > 0) {
                toast.error(`Upload failed: All ${data.failed.length} rows were invalid.`);
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
                        Bulk Upload Suppliers
                    </DialogTitle>
                    <DialogDescription>
                        Upload an Excel file to create multiple pre-approved suppliers at once. Each supplier will also get a user account with a temporary password.
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
                                    <Upload className="h-8 w-8 text-muted-foreground" />
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
                                    <h4 className="text-sm font-semibold">Upload Summary</h4>
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

                            {/* Created Suppliers with Credentials */}
                            {results.created.length > 0 && (
                                <div className="rounded-lg border">
                                    <div className="p-3 bg-green-50 border-b font-medium text-sm text-green-800">
                                        Created Suppliers — Temporary Credentials
                                    </div>
                                    <div className="divide-y max-h-48 overflow-y-auto">
                                        {results.created.map((item) => (
                                            <div key={item.supplierId} className="p-3 text-sm flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{item.legalName}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {item.supplierId}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs">Login: <code className="bg-muted px-1 rounded">{item.username}</code></p>
                                                    <p className="text-xs">Password: <code className="bg-muted px-1 rounded">{item.tempPassword}</code></p>
                                                </div>
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
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" /> Upload & Create Suppliers
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
