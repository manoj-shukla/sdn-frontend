"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    UploadCloud,
    FileText,
    Trash2,
    Eye,
    Loader2,
    ShieldCheck,
    ShieldAlert,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    FileCheck2,
    Landmark,
    Building2,
    FileBadge,
    Award,
    MapPin,
    Gavel,
    File as FileIcon,
    History,
    X,
    Replace,
    Calendar,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Document {
    documentId: number;
    documentName: string;
    documentType: string;
    filePath: string;
    createdAt?: string;
    expiryDate?: string | null;
    complianceStatus?: string;
    verificationStatus: string;
    notes?: string;
    fileSize?: number;
    uploadedByUsername?: string;
}

interface SupplierDocumentManagementProps {
    title?: string;
    description?: string;
}

interface DocCategory {
    key: string;
    label: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
    accent: string; // tailwind color classes for icon tile
}

/* -------------------------------------------------------------------------- */
/* Category definitions                                                       */
/* -------------------------------------------------------------------------- */

const CATEGORIES: DocCategory[] = [
    {
        key: "Certificate of Incorporation",
        label: "Certificate of Incorporation",
        description: "Proof your business is legally registered.",
        Icon: Building2,
        accent: "bg-blue-50 text-blue-600",
    },
    {
        key: "Tax Certificate (VAT/GST/PAN)",
        label: "Tax Certificate",
        description: "VAT / GST / PAN or equivalent tax registration.",
        Icon: FileBadge,
        accent: "bg-violet-50 text-violet-600",
    },
    {
        key: "Bank Account Confirmation",
        label: "Bank Confirmation",
        description: "Cancelled cheque or bank letter for payouts.",
        Icon: Landmark,
        accent: "bg-emerald-50 text-emerald-600",
    },
    {
        key: "Insurance Certificate",
        label: "Insurance Certificate",
        description: "Current liability / workers comp insurance.",
        Icon: ShieldCheck,
        accent: "bg-amber-50 text-amber-600",
    },
    {
        key: "Quality Certification (ISO, etc.)",
        label: "Quality Certification",
        description: "ISO, GMP, or industry quality standards.",
        Icon: Award,
        accent: "bg-indigo-50 text-indigo-600",
    },
    {
        key: "Proof of Address",
        label: "Proof of Address",
        description: "Utility bill or lease showing business address.",
        Icon: MapPin,
        accent: "bg-rose-50 text-rose-600",
    },
    {
        key: "Compliance Declaration",
        label: "Compliance Declaration",
        description: "Code of conduct / anti-bribery attestations.",
        Icon: Gavel,
        accent: "bg-slate-50 text-slate-600",
    },
    {
        key: "Other",
        label: "Other",
        description: "Any additional supporting documents.",
        Icon: FileIcon,
        accent: "bg-gray-50 text-gray-600",
    },
];

const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatBytes(bytes?: number): string {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string | null): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "";
    }
}

function daysUntil(iso?: string | null): number | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

type CardState = "missing" | "pending" | "rework" | "expired" | "expiring" | "verified" | "rejected";

function computeCardState(doc: Document | undefined): CardState {
    if (!doc) return "missing";
    const v = (doc.verificationStatus || "").toUpperCase();
    const c = (doc.complianceStatus || "").toUpperCase();
    if (v === "REJECTED") return "rejected";
    if (v === "REWORK_REQUIRED") return "rework";
    if (c === "EXPIRED") return "expired";
    if (c === "EXPIRING") return "expiring";
    if (v === "VERIFIED" || v === "APPROVED") return "verified";
    return "pending";
}

function stateMeta(s: CardState) {
    switch (s) {
        case "verified":
            return { label: "Verified", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: CheckCircle2 };
        case "expiring":
            return { label: "Expiring soon", cls: "bg-amber-100 text-amber-700 border-amber-200", Icon: Clock };
        case "expired":
            return { label: "Expired", cls: "bg-red-100 text-red-700 border-red-200", Icon: ShieldAlert };
        case "rejected":
            return { label: "Rejected", cls: "bg-red-100 text-red-700 border-red-200", Icon: XCircle };
        case "rework":
            return { label: "Rework requested", cls: "bg-orange-100 text-orange-700 border-orange-200", Icon: AlertTriangle };
        case "pending":
            return { label: "Pending review", cls: "bg-blue-100 text-blue-700 border-blue-200", Icon: Clock };
        case "missing":
        default:
            return { label: "Missing", cls: "bg-gray-100 text-gray-600 border-gray-200", Icon: FileText };
    }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function SupplierDocumentManagement({
    title = "Documents",
    description = "Manage your compliance documents, track expirations, and keep them current.",
}: SupplierDocumentManagementProps) {
    const { user } = useAuthStore();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Upload modal state
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadCategory, setUploadCategory] = useState<string>("");
    const [uploadNotes, setUploadNotes] = useState("");
    const [uploadExpiry, setUploadExpiry] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preview modal state
    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

    // Version-history modal state
    const [historyCategory, setHistoryCategory] = useState<string | null>(null);

    /* --------------------------- Fetch ----------------------------------- */

    const fetchDocuments = useCallback(async () => {
        if (!user?.supplierId) return;
        try {
            setLoading(true);
            const res = (await apiClient.get(
                `/api/suppliers/${user.supplierId}/documents`
            )) as any;
            const rawDocs = res || [];
            const mapped: Document[] = rawDocs.map((d: any) => ({
                ...d,
                documentId: d.documentId || d.documentid,
                documentName: d.documentName || d.documentname,
                documentType: d.documentType || d.documenttype,
                filePath: d.filePath || d.filepath,
                createdAt: d.createdAt || d.createdat,
                expiryDate: d.expiryDate || d.expirydate || null,
                complianceStatus: d.complianceStatus || d.compliancestatus,
                verificationStatus: d.verificationStatus || d.verificationstatus,
                notes: d.notes || "",
                fileSize: d.fileSize || d.filesize,
                uploadedByUsername: d.uploadedByUsername || d.uploadedbyusername,
            }));
            const sorted = mapped.sort(
                (a, b) =>
                    new Date(b.createdAt || 0).getTime() -
                    new Date(a.createdAt || 0).getTime()
            );
            setDocuments(sorted);
        } catch (e) {
            console.error("Failed to fetch documents", e);
        } finally {
            setLoading(false);
        }
    }, [user?.supplierId]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    /* --------------------------- Grouping & Summary ---------------------- */

    const byCategory = useMemo(() => {
        const map: Record<string, Document[]> = {};
        for (const key of CATEGORY_KEYS) map[key] = [];
        for (const d of documents) {
            const key = CATEGORY_KEYS.includes(d.documentType) ? d.documentType : "Other";
            map[key].push(d);
        }
        return map;
    }, [documents]);

    const latestByCategory = useMemo(() => {
        const map: Record<string, Document | undefined> = {};
        for (const key of CATEGORY_KEYS) map[key] = byCategory[key]?.[0];
        return map;
    }, [byCategory]);

    const summary = useMemo(() => {
        let verified = 0,
            pending = 0,
            expiring = 0,
            expired = 0,
            missing = 0;
        for (const cat of CATEGORIES) {
            if (cat.key === "Other") continue; // don't count "Other" for completeness
            const state = computeCardState(latestByCategory[cat.key]);
            if (state === "verified") verified++;
            else if (state === "expiring") expiring++;
            else if (state === "expired") expired++;
            else if (state === "missing") missing++;
            else pending++;
        }
        const requiredTotal = CATEGORIES.length - 1; // exclude Other
        return { verified, pending, expiring, expired, missing, requiredTotal };
    }, [latestByCategory]);

    const completionPct = Math.round(
        ((summary.requiredTotal - summary.missing) / summary.requiredTotal) * 100
    );

    /* --------------------------- Upload flow ----------------------------- */

    const openUpload = (category?: string) => {
        setUploadCategory(category || "");
        setUploadNotes("");
        setUploadExpiry("");
        setUploadOpen(true);
    };

    const closeUpload = () => {
        if (uploading) return;
        setUploadOpen(false);
        setUploadCategory("");
        setUploadNotes("");
        setUploadExpiry("");
    };

    const doUpload = async (file: File) => {
        if (!user?.supplierId) return;
        if (!uploadCategory) {
            toast.error("Please select a document category.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File must be 10 MB or smaller.");
            return;
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", uploadCategory);
        formData.append("notes", uploadNotes);
        if (uploadExpiry) formData.append("expiryDate", uploadExpiry);

        try {
            setUploading(true);
            await apiClient.post(
                `/api/suppliers/${user.supplierId}/documents`,
                formData
            );
            toast.success(`${file.name} uploaded as ${uploadCategory}.`);
            setUploadOpen(false);
            setUploadCategory("");
            setUploadNotes("");
            setUploadExpiry("");
            await fetchDocuments();
        } catch (e) {
            console.error("Upload failed", e);
            toast.error("Upload failed. Please try again.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) void doUpload(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void doUpload(file);
    };

    /* --------------------------- Actions --------------------------------- */

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this document? This cannot be undone.")) return;
        try {
            await apiClient.delete(`/api/documents/${id}`);
            toast.success("Document deleted.");
            await fetchDocuments();
        } catch (e) {
            console.error("Delete failed", e);
            toast.error("Could not delete document.");
        }
    };

    const buildViewUrl = (doc: Document): string | null => {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";
        if (doc.documentId !== undefined && doc.documentId !== null) {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const qs = token ? `?token=${encodeURIComponent(token)}` : "";
            return `${baseUrl}/api/documents/${doc.documentId}/view${qs}`;
        }
        if (doc.filePath) return `${baseUrl}/${doc.filePath}`;
        return null;
    };

    const openPreview = (doc: Document) => {
        setPreviewDoc(doc);
    };

    const openInNewTab = (doc: Document) => {
        const url = buildViewUrl(doc);
        if (url) window.open(url, "_blank");
    };

    /* --------------------------- Render ---------------------------------- */

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const expiringDocs = documents.filter(
        (d) => (d.complianceStatus || "").toUpperCase() === "EXPIRING"
    );
    const expiredDocs = documents.filter(
        (d) => (d.complianceStatus || "").toUpperCase() === "EXPIRED"
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Button onClick={() => openUpload()} className="gap-2 self-start md:self-auto">
                    <UploadCloud className="h-4 w-4" />
                    Upload document
                </Button>
            </div>

            {/* Summary strip */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                        <SummaryStat
                            label="Completeness"
                            value={`${completionPct}%`}
                            sub={`${summary.requiredTotal - summary.missing} of ${summary.requiredTotal} required`}
                            Icon={FileCheck2}
                            tone="primary"
                        />
                        <SummaryStat
                            label="Verified"
                            value={String(summary.verified)}
                            Icon={CheckCircle2}
                            tone="emerald"
                        />
                        <SummaryStat
                            label="Pending"
                            value={String(summary.pending)}
                            Icon={Clock}
                            tone="blue"
                        />
                        <SummaryStat
                            label="Expiring"
                            value={String(summary.expiring)}
                            Icon={AlertTriangle}
                            tone="amber"
                        />
                        <SummaryStat
                            label="Expired"
                            value={String(summary.expired)}
                            Icon={ShieldAlert}
                            tone="red"
                        />
                    </div>
                    {/* progress bar */}
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, completionPct))}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Expiry alerts */}
            {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
                <Card className="border-amber-200 bg-amber-50/40">
                    <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">
                                    {expiredDocs.length > 0 && `${expiredDocs.length} document${expiredDocs.length === 1 ? "" : "s"} expired`}
                                    {expiredDocs.length > 0 && expiringDocs.length > 0 && " · "}
                                    {expiringDocs.length > 0 && `${expiringDocs.length} expiring within 30 days`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Re-upload current versions to stay compliant.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[...expiredDocs, ...expiringDocs].slice(0, 3).map((d) => (
                                <Badge
                                    key={d.documentId}
                                    variant="outline"
                                    className="border-amber-200 bg-white text-xs"
                                >
                                    {d.documentType}
                                    {d.expiryDate ? ` · ${formatDate(d.expiryDate)}` : ""}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Category grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {CATEGORIES.map((cat) => {
                    const latest = latestByCategory[cat.key];
                    const history = byCategory[cat.key] || [];
                    const state = computeCardState(latest);
                    const meta = stateMeta(state);
                    const days = daysUntil(latest?.expiryDate);
                    const Icon = cat.Icon;

                    return (
                        <Card
                            key={cat.key}
                            className="group relative overflow-hidden transition-shadow hover:shadow-md"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`rounded-lg p-2 ${cat.accent}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base leading-tight">
                                                {cat.label}
                                            </CardTitle>
                                            <CardDescription className="mt-0.5 text-xs">
                                                {cat.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={`gap-1 border text-xs font-medium ${meta.cls}`}
                                    >
                                        <meta.Icon className="h-3 w-3" />
                                        {meta.label}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                {latest ? (
                                    <div className="rounded-md border bg-muted/20 p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    <p className="truncate text-sm font-medium">
                                                        {latest.documentName}
                                                    </p>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-6 text-xs text-muted-foreground">
                                                    {latest.createdAt && (
                                                        <span>Uploaded {formatDate(latest.createdAt)}</span>
                                                    )}
                                                    {latest.fileSize ? <span>· {formatBytes(latest.fileSize)}</span> : null}
                                                </div>
                                                {latest.expiryDate && (
                                                    <div className="mt-1 flex items-center gap-1.5 pl-6 text-xs">
                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        <span
                                                            className={
                                                                state === "expired"
                                                                    ? "text-red-600"
                                                                    : state === "expiring"
                                                                        ? "text-amber-700"
                                                                        : "text-muted-foreground"
                                                            }
                                                        >
                                                            Expires {formatDate(latest.expiryDate)}
                                                            {days !== null &&
                                                                (days < 0
                                                                    ? ` · ${Math.abs(days)}d overdue`
                                                                    : days <= 30
                                                                        ? ` · in ${days}d`
                                                                        : "")}
                                                        </span>
                                                    </div>
                                                )}
                                                {latest.notes && (
                                                    <p className="mt-1 line-clamp-2 pl-6 text-xs italic text-muted-foreground">
                                                        “{latest.notes}”
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-md border border-dashed bg-muted/10 p-4 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            No file uploaded yet
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                    {latest && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5"
                                                onClick={() => openPreview(latest)}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Preview
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5"
                                                onClick={() => openUpload(cat.key)}
                                            >
                                                <Replace className="h-3.5 w-3.5" />
                                                Replace
                                            </Button>
                                        </>
                                    )}
                                    {!latest && (
                                        <Button
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={() => openUpload(cat.key)}
                                        >
                                            <UploadCloud className="h-3.5 w-3.5" />
                                            Upload
                                        </Button>
                                    )}
                                    {history.length > 1 && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="gap-1.5 text-muted-foreground"
                                            onClick={() => setHistoryCategory(cat.key)}
                                        >
                                            <History className="h-3.5 w-3.5" />
                                            History ({history.length})
                                        </Button>
                                    )}
                                    {latest && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="ml-auto text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(latest.documentId)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Upload dialog */}
            <Dialog open={uploadOpen} onOpenChange={(o) => (!o ? closeUpload() : null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Upload document</DialogTitle>
                        <DialogDescription>
                            Select a category and drop your file, or click to browse.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Document category</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                value={uploadCategory}
                                onChange={(e) => setUploadCategory(e.target.value)}
                                disabled={uploading}
                            >
                                <option value="">Select a category…</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c.key} value={c.key}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Expiry date (optional)</Label>
                                <Input
                                    type="date"
                                    value={uploadExpiry}
                                    onChange={(e) => setUploadExpiry(e.target.value)}
                                    disabled={uploading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Notes (optional)</Label>
                                <Input
                                    placeholder="Short description…"
                                    value={uploadNotes}
                                    onChange={(e) => setUploadNotes(e.target.value)}
                                    disabled={uploading}
                                />
                            </div>
                        </div>

                        {/* Drop zone */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg"
                        />
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                            }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => {
                                if (!uploadCategory) {
                                    toast.error("Please pick a category first.");
                                    return;
                                }
                                if (!uploading) fileInputRef.current?.click();
                            }}
                            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${dragActive
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/25 bg-muted/10 hover:border-primary/40 hover:bg-muted/20"
                                } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                        >
                            <div className="rounded-full bg-background p-3 shadow-sm">
                                {uploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                ) : (
                                    <UploadCloud className="h-6 w-6 text-muted-foreground" />
                                )}
                            </div>
                            <p className="text-sm font-medium">
                                {uploading
                                    ? "Uploading…"
                                    : dragActive
                                        ? "Drop to upload"
                                        : "Drag & drop or click to browse"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                PDF, PNG, or JPG · up to 10 MB
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeUpload} disabled={uploading}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview dialog */}
            <Dialog open={!!previewDoc} onOpenChange={(o) => (!o ? setPreviewDoc(null) : null)}>
                <DialogContent className="flex h-[85vh] max-w-5xl flex-col p-0 sm:max-w-5xl">
                    <DialogHeader className="shrink-0 border-b px-6 py-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <DialogTitle className="truncate">
                                    {previewDoc?.documentName || "Document preview"}
                                </DialogTitle>
                                <DialogDescription className="truncate">
                                    {previewDoc?.documentType}
                                    {previewDoc?.expiryDate
                                        ? ` · Expires ${formatDate(previewDoc.expiryDate)}`
                                        : ""}
                                </DialogDescription>
                            </div>
                            {previewDoc && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openInNewTab(previewDoc)}
                                    >
                                        Open in new tab
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 bg-muted/20">
                        {previewDoc &&
                            (() => {
                                const url = buildViewUrl(previewDoc);
                                if (!url) {
                                    return (
                                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                            No preview available.
                                        </div>
                                    );
                                }
                                const name = previewDoc.documentName?.toLowerCase() || "";
                                const isImage = /\.(png|jpe?g|gif|webp)$/.test(name);
                                if (isImage) {
                                    return (
                                        <div className="flex h-full items-center justify-center overflow-auto p-4">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt={previewDoc.documentName}
                                                className="max-h-full max-w-full rounded shadow"
                                            />
                                        </div>
                                    );
                                }
                                return (
                                    <iframe
                                        key={previewDoc.documentId}
                                        src={url}
                                        title={previewDoc.documentName}
                                        className="h-full w-full"
                                    />
                                );
                            })()}
                    </div>
                </DialogContent>
            </Dialog>

            {/* History dialog */}
            <Dialog
                open={!!historyCategory}
                onOpenChange={(o) => (!o ? setHistoryCategory(null) : null)}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Version history
                            {historyCategory ? ` · ${historyCategory}` : ""}
                        </DialogTitle>
                        <DialogDescription>
                            The most recent upload is active. Previous versions are kept for reference.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                        {historyCategory &&
                            (byCategory[historyCategory] || []).map((d, idx) => (
                                <div
                                    key={d.documentId}
                                    className={`flex items-start justify-between gap-3 rounded-md border p-3 ${idx === 0 ? "border-primary/30 bg-primary/5" : "bg-background"
                                        }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <p className="truncate text-sm font-medium">
                                                {d.documentName}
                                            </p>
                                            {idx === 0 && (
                                                <Badge
                                                    variant="outline"
                                                    className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                                                >
                                                    Current
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
                                            {d.createdAt ? `Uploaded ${formatDate(d.createdAt)}` : ""}
                                            {d.fileSize ? ` · ${formatBytes(d.fileSize)}` : ""}
                                            {d.uploadedByUsername ? ` · by ${d.uploadedByUsername}` : ""}
                                        </p>
                                        {d.notes && (
                                            <p className="mt-1 pl-6 text-xs italic text-muted-foreground">
                                                “{d.notes}”
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => openPreview(d)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(d.documentId)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHistoryCategory(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Small subcomponents                                                        */
/* -------------------------------------------------------------------------- */

function SummaryStat({
    label,
    value,
    sub,
    Icon,
    tone,
}: {
    label: string;
    value: string;
    sub?: string;
    Icon: React.ComponentType<{ className?: string }>;
    tone: "primary" | "emerald" | "blue" | "amber" | "red";
}) {
    const toneCls = {
        primary: "bg-primary/10 text-primary",
        emerald: "bg-emerald-50 text-emerald-600",
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-amber-50 text-amber-600",
        red: "bg-red-50 text-red-600",
    }[tone];

    return (
        <div className="flex items-center gap-3">
            <div className={`rounded-md p-2 ${toneCls}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold leading-tight">{value}</p>
                {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
            </div>
        </div>
    );
}
