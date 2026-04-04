"use client";

import { useRef, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle,
    Loader2, X, Copy, FileText,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

const REQUIRED_COLS = ["title", "templatename", "deadline"] as const;

interface ImportRow {
    title?: string;
    description?: string;
    templateName?: string;
    templateId?: string | number;
    deadline?: string;
    startDate?: string;
    [key: string]: unknown;
}

interface ImportResult {
    created: { row: number; title: string; rfiId: string }[];
    errors:  { row: number; title: string | null; error: string }[];
}

interface PublishedTemplate {
    templateId: number;
    name: string;
    category?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

// ── Normalise raw spreadsheet row → ImportRow ─────────────────────────────────
function normaliseRow(raw: Record<string, unknown>): ImportRow {
    const lower: Record<string, unknown> = {};
    Object.keys(raw).forEach((k) => {
        lower[k.toLowerCase().replace(/\s+/g, "")] = raw[k];
    });
    const str = (v: unknown) => (v == null ? "" : String(v).trim());
    const dateStr = (v: unknown): string => {
        if (v == null || str(v) === "") return "";
        if (typeof v === "number") {
            const d = XLSX.SSF.parse_date_code(v);
            if (d) {
                const pad = (n: number) => String(n).padStart(2, "0");
                return `${d.y}-${pad(d.m)}-${pad(d.d)}T${pad(d.H)}:${pad(d.M)}:00`;
            }
        }
        const s = str(v).replace(" ", "T");
        return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s;
    };
    return {
        title:        str(lower["title"]),
        description:  str(lower["description"]),
        templateName: str(lower["templatename"] ?? lower["template_name"] ?? lower["template"]),
        deadline:     dateStr(lower["deadline"]),
        startDate:    dateStr(lower["startdate"] ?? lower["start_date"]),
    };
}

export function RFIImportDialog({ isOpen, onClose, onImported }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName,    setFileName]    = useState<string | null>(null);
    const [parsedRows,  setParsedRows]  = useState<ImportRow[]>([]);
    const [parseError,  setParseError]  = useState<string | null>(null);
    const [submitting,  setSubmitting]  = useState(false);
    const [result,      setResult]      = useState<ImportResult | null>(null);
    const [templates,   setTemplates]   = useState<PublishedTemplate[]>([]);
    const [tplLoading,  setTplLoading]  = useState(false);
    const [copied,      setCopied]      = useState<string | null>(null);

    // ── Fetch published templates when dialog opens ───────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setTplLoading(true);
        apiClient.get("/api/rfi/templates")
            .then((res: any) => {
                const raw: any[] = res.content || (Array.isArray(res) ? res : []);
                setTemplates(
                    raw
                        .filter((t: any) => t.status === "PUBLISHED")
                        .map((t: any) => ({
                            templateId: t.templateId,
                            name: t.name || t.templateName,
                            category: t.category,
                        }))
                );
            })
            .catch(() => {})
            .finally(() => setTplLoading(false));
    }, [isOpen]);

    // ── Download sample using real template names ─────────────────────────────
    const handleDownloadSample = () => {
        const firstName = templates[0]?.name ?? "YOUR_TEMPLATE_NAME_HERE";
        const secondName = templates[1]?.name ?? firstName;

        const rows = [
            {
                title: "IT Hardware Procurement Q3 2026",
                description: "Sourcing laptops, monitors and peripherals for the engineering team.",
                templateName: firstName,
                deadline: "2026-09-30 17:00",
                startDate: "",
            },
            {
                title: "Office Supplies Annual Tender 2026",
                description: "Annual procurement of stationery and office consumables.",
                templateName: secondName,
                deadline: "2026-10-15 12:00",
                startDate: "",
            },
            {
                title: "Logistics & Freight Partners Review",
                description: "Evaluating freight forwarders for global shipping contracts.",
                templateName: firstName,
                deadline: "2026-11-01 09:00",
                startDate: "2026-10-01 09:00",
            },
        ];

        const ws = XLSX.utils.json_to_sheet(rows, {
            header: ["title", "description", "templateName", "deadline", "startDate"],
        });
        ws["!cols"] = [{ wch: 40 }, { wch: 55 }, { wch: 30 }, { wch: 22 }, { wch: 22 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "RFI Events");
        XLSX.writeFile(wb, "rfi_import_sample.xlsx");
    };

    // ── Copy template name to clipboard ──────────────────────────────────────
    const handleCopy = (name: string) => {
        navigator.clipboard.writeText(name).then(() => {
            setCopied(name);
            setTimeout(() => setCopied(null), 1500);
        });
    };

    // ── Parse uploaded file ───────────────────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setParsedRows([]);
        setParseError(null);
        setResult(null);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target?.result, { type: "binary", cellDates: false });
                const ws = wb.Sheets[wb.SheetNames[0]];
                if (!ws) { setParseError("The file has no sheets."); return; }

                const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
                if (raw.length === 0) {
                    setParseError("The sheet is empty — add a header row and at least one data row.");
                    return;
                }
                if (raw.length > 100) {
                    setParseError("Maximum 100 rows per import. Please split the file.");
                    return;
                }

                const firstKeys = Object.keys(raw[0]).map((k) => k.toLowerCase().replace(/\s+/g, ""));
                const missing = REQUIRED_COLS.filter(
                    (col) => !firstKeys.includes(col) && !firstKeys.includes(col.replace("name", "_name"))
                );
                if (missing.length > 0) {
                    setParseError(
                        `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. ` +
                        `Download the sample file to see the correct format.`
                    );
                    return;
                }

                setParsedRows(raw.map(normaliseRow));
            } catch (err: any) {
                setParseError(`Could not read file: ${err?.message || "unknown error"}.`);
            }
        };
        reader.readAsBinaryString(file);
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleImport = async () => {
        if (parsedRows.length === 0) return;
        setSubmitting(true);
        setResult(null);
        try {
            const res = await apiClient.post("/api/rfi/events/import", parsedRows) as ImportResult;
            setResult(res);
            if (res.created.length > 0) {
                toast.success(`${res.created.length} RFI event${res.created.length !== 1 ? "s" : ""} imported successfully.`);
                onImported();
            }
            if (res.errors.length > 0 && res.created.length === 0) {
                toast.error("Import failed — all rows had errors. See details below.");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Import failed. Please try again.";
            toast.error(msg);
            setResult({ created: [], errors: [{ row: 0, title: null, error: msg }] });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setResult(null); setParsedRows([]); setFileName(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleClose = () => {
        handleReset(); setResult(null); onClose();
    };

    const hasPreview = parsedRows.length > 0 && !parseError;
    const hasResult  = result !== null;
    const allSuccess = hasResult && result.errors.length === 0;
    const allFailed  = hasResult && result.created.length === 0;
    const partial    = hasResult && result.created.length > 0 && result.errors.length > 0;
    const fileExt    = fileName ? fileName.split(".").pop()?.toUpperCase() : null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary" />
                        Import RFI Events
                    </DialogTitle>
                    <DialogDescription>
                        Upload an Excel or CSV file to bulk-create RFI events as drafts.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-1">

                    {/* ── Available templates ── */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                        <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Available Published Templates
                            <span className="font-normal text-blue-600">(use these exact names in your file)</span>
                        </p>
                        {tplLoading ? (
                            <div className="flex items-center gap-1.5 text-xs text-blue-600">
                                <Loader2 className="h-3 w-3 animate-spin" /> Loading templates…
                            </div>
                        ) : templates.length === 0 ? (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                                No published templates found. Publish a template first before importing events.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {templates.map((t) => (
                                    <button
                                        key={t.templateId}
                                        onClick={() => handleCopy(t.name)}
                                        title="Click to copy"
                                        className="group flex items-center gap-1.5 bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors"
                                    >
                                        <span className="truncate max-w-[200px]">{t.name}</span>
                                        {t.category && (
                                            <span className="text-[10px] text-muted-foreground">({t.category})</span>
                                        )}
                                        {copied === t.name ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                        ) : (
                                            <Copy className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Step 1: Download sample ── */}
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                        <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">Download sample file</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Required: <code className="bg-white border rounded px-1">title</code>{" "}
                                <code className="bg-white border rounded px-1">templateName</code>{" "}
                                <code className="bg-white border rounded px-1">deadline</code>.
                                {" "}Optional: <code className="bg-white border rounded px-1">description</code>{" "}
                                <code className="bg-white border rounded px-1">startDate</code>.
                            </p>
                        </div>
                        <Button
                            size="sm" variant="outline"
                            className="shrink-0 gap-1.5 bg-white"
                            onClick={handleDownloadSample}
                            disabled={tplLoading}
                        >
                            <Download className="h-3.5 w-3.5" />
                            Sample .xlsx
                        </Button>
                    </div>

                    {/* ── Step 2: Upload ── */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-800">Upload your file</p>
                        <label
                            htmlFor="rfi-import-file"
                            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/25 rounded-lg px-6 py-7 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                        >
                            {fileName ? (
                                <>
                                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                    <span className="text-sm font-medium text-slate-800">{fileName}</span>
                                    {hasPreview && (
                                        <span className="text-xs text-green-600 font-medium">
                                            {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} detected
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                                    <span className="text-sm text-muted-foreground">
                                        Click to select <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>
                                    </span>
                                    <span className="text-xs text-muted-foreground/60">Max 100 rows</span>
                                </>
                            )}
                            <input
                                ref={fileRef}
                                id="rfi-import-file"
                                type="file"
                                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                className="sr-only"
                                onChange={handleFileChange}
                            />
                        </label>

                        {parseError && (
                            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{parseError}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Preview table ── */}
                    {hasPreview && !hasResult && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-800 flex items-center gap-1">
                                    Preview — {parsedRows.length} event{parsedRows.length !== 1 ? "s" : ""} ready
                                    {fileExt && <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">{fileExt}</Badge>}
                                </span>
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground gap-1" onClick={handleReset}>
                                    <X className="h-3 w-3" /> Clear
                                </Button>
                            </div>
                            <div className="border rounded-lg overflow-hidden text-sm">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-muted/50 border-b text-xs text-muted-foreground">
                                            <th className="text-left px-3 py-2 font-medium w-6">#</th>
                                            <th className="text-left px-3 py-2 font-medium">Title</th>
                                            <th className="text-left px-3 py-2 font-medium">Template</th>
                                            <th className="text-left px-3 py-2 font-medium">Deadline</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedRows.slice(0, 8).map((row, i) => {
                                            const tplMatch = templates.some(
                                                (t) => t.name.toLowerCase() === (row.templateName || "").toLowerCase()
                                            );
                                            return (
                                                <tr key={i} className="hover:bg-muted/20">
                                                    <td className="px-3 py-2 text-muted-foreground text-xs">{i + 1}</td>
                                                    <td className="px-3 py-2 font-medium max-w-[160px] truncate">
                                                        {row.title || <span className="text-red-500 italic text-xs">missing</span>}
                                                    </td>
                                                    <td className="px-3 py-2 max-w-[140px]">
                                                        <span className={`text-xs truncate block ${tplMatch ? "text-green-700" : "text-red-500"}`}>
                                                            {row.templateName || <span className="italic">missing</span>}
                                                        </span>
                                                        {row.templateName && !tplMatch && (
                                                            <span className="text-[10px] text-red-400">not found</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-muted-foreground text-xs">
                                                        {row.deadline
                                                            ? (() => { try { return new Date(row.deadline).toLocaleDateString(); } catch { return row.deadline; } })()
                                                            : <span className="text-red-500 italic">missing</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {parsedRows.length > 8 && (
                                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
                                        …and {parsedRows.length - 8} more
                                    </div>
                                )}
                            </div>

                            {/* Warn upfront if any template names won't match */}
                            {(() => {
                                const unmatched = parsedRows.filter(
                                    (r) => r.templateName && !templates.some(
                                        (t) => t.name.toLowerCase() === r.templateName!.toLowerCase()
                                    )
                                );
                                if (unmatched.length === 0 || templates.length === 0) return null;
                                return (
                                    <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>
                                            <strong>{unmatched.length} row{unmatched.length !== 1 ? "s" : ""}</strong> reference a template that doesn&apos;t exist or isn&apos;t published.
                                            Click a template name above to copy the exact spelling.
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ── Results ── */}
                    {hasResult && (
                        <div className="space-y-3">
                            {allSuccess && (
                                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                                    <span><strong>All {result.created.length} event{result.created.length !== 1 ? "s" : ""} imported successfully</strong> — saved as drafts.</span>
                                </div>
                            )}
                            {allFailed && (
                                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
                                    <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                                    <span><strong>Import failed</strong> — all {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} had errors. No events were created.</span>
                                </div>
                            )}
                            {partial && (
                                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                                    <span><strong>{result.created.length} imported</strong>, <strong>{result.errors.length} failed</strong>. Fix the errors and re-import the failed rows.</span>
                                </div>
                            )}

                            {result.created.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Created ({result.created.length})
                                    </p>
                                    <div className="border rounded-lg divide-y text-sm max-h-40 overflow-y-auto">
                                        {result.created.map((r) => (
                                            <div key={r.rfiId} className="flex items-center gap-2 px-3 py-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                                <span className="font-medium truncate flex-1">{r.title}</span>
                                                <Badge variant="secondary" className="text-[10px] shrink-0">DRAFT</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.errors.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1.5">
                                        <XCircle className="h-3.5 w-3.5" /> Errors ({result.errors.length})
                                    </p>
                                    <div className="border border-red-200 rounded-lg divide-y divide-red-100 text-sm max-h-48 overflow-y-auto">
                                        {result.errors.map((e, i) => (
                                            <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-50/50">
                                                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <span className="text-muted-foreground text-xs">Row {e.row}{e.title ? `: "${e.title}"` : ""} — </span>
                                                    <span className="text-red-700">{e.error}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" onClick={handleClose}>
                        {hasResult && result.created.length > 0 ? "Done" : "Cancel"}
                    </Button>
                    {hasResult && result.errors.length > 0 && (
                        <Button variant="outline" onClick={handleReset}>Import More</Button>
                    )}
                    {!hasResult && (
                        <Button onClick={handleImport} disabled={!hasPreview || submitting}>
                            {submitting
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
                                : <><Upload className="h-4 w-4 mr-2" />Import {parsedRows.length > 0 ? `${parsedRows.length} Event${parsedRows.length !== 1 ? "s" : ""}` : "Events"}</>
                            }
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
