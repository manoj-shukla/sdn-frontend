"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle,
    Loader2, X,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportRow {
    templateName?: string;
    category?: string;
    sectionName?: string;
    questionText?: string;
    questionType?: string;
    mandatory?: string | boolean;
    promoteToRfp?: string | boolean;
    [key: string]: unknown;
}

interface CreatedTemplate {
    templateId: string;
    name: string;
    sections: number;
    questions: number;
}

interface ImportResult {
    created: CreatedTemplate[];
    errors: { name: string; error: string }[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

// ── Normalise spreadsheet row ────────────────────────────────────────────────

function normaliseRow(raw: Record<string, unknown>): ImportRow {
    const lower: Record<string, unknown> = {};
    Object.keys(raw).forEach((k) => {
        lower[k.toLowerCase().replace(/[\s_]+/g, "")] = raw[k];
    });
    const str = (v: unknown) => (v == null ? "" : String(v).trim());
    return {
        templateName: str(lower["templatename"] ?? lower["template"]),
        category:     str(lower["category"]),
        sectionName:  str(lower["sectionname"] ?? lower["section"]),
        questionText: str(lower["questiontext"] ?? lower["question"]),
        questionType: str(lower["questiontype"] ?? lower["type"]),
        mandatory:    str(lower["mandatory"] ?? lower["required"]),
        promoteToRfp: str(lower["promotetorfp"] ?? lower["promoterfp"] ?? lower["rfp"]),
    };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RFITemplateImportDialog({ isOpen, onClose, onImported }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName,   setFileName]   = useState<string | null>(null);
    const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [result,     setResult]     = useState<ImportResult | null>(null);

    // ── Sample download ──────────────────────────────────────────────────────
    const handleDownloadSample = () => {
        const rows = [
            { templateName: "IT Security Assessment", category: "Technical", sectionName: "Company Overview",      questionText: "What is your company name?",             questionType: "SHORT_TEXT",    mandatory: "true",  promoteToRfp: "false" },
            { templateName: "IT Security Assessment", category: "Technical", sectionName: "Company Overview",      questionText: "How many employees do you have?",        questionType: "NUMERIC",       mandatory: "true",  promoteToRfp: "false" },
            { templateName: "IT Security Assessment", category: "Technical", sectionName: "Compliance & Certs",    questionText: "Are you ISO 27001 certified?",            questionType: "YES_NO",        mandatory: "true",  promoteToRfp: "true"  },
            { templateName: "IT Security Assessment", category: "Technical", sectionName: "Compliance & Certs",    questionText: "List your active certifications",         questionType: "LONG_TEXT",     mandatory: "false", promoteToRfp: "true"  },
            { templateName: "Supplier Onboarding",    category: "General",   sectionName: "Basic Information",     questionText: "What is your registered business name?", questionType: "SHORT_TEXT",    mandatory: "true",  promoteToRfp: "false" },
            { templateName: "Supplier Onboarding",    category: "General",   sectionName: "Basic Information",     questionText: "What countries do you operate in?",      questionType: "MULTI_SELECT",  mandatory: "true",  promoteToRfp: "false" },
            { templateName: "Supplier Onboarding",    category: "General",   sectionName: "Financial Information", questionText: "What is your annual revenue range?",     questionType: "SINGLE_SELECT", mandatory: "false", promoteToRfp: "false" },
        ];
        const ws = XLSX.utils.json_to_sheet(rows, {
            header: ["templateName","category","sectionName","questionText","questionType","mandatory","promoteToRfp"],
        });
        ws["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 24 }, { wch: 40 }, { wch: 16 }, { wch: 10 }, { wch: 13 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Templates");
        XLSX.writeFile(wb, "rfi_template_import_sample.xlsx");
    };

    // ── Parse uploaded file ──────────────────────────────────────────────────
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
                    setParseError("Sheet is empty — add a header row and at least one data row.");
                    return;
                }
                if (raw.length > 500) {
                    setParseError("Maximum 500 rows per import. Please split the file.");
                    return;
                }

                const firstKeys = Object.keys(raw[0]).map((k) => k.toLowerCase().replace(/[\s_]+/g, ""));
                if (!firstKeys.some(k => k === "templatename" || k === "template")) {
                    setParseError('Missing required column "templateName". Download the sample to see the correct format.');
                    return;
                }

                const rows = raw.map(normaliseRow);
                setParsedRows(rows);
            } catch (err: any) {
                setParseError(`Could not read file: ${err?.message || "unknown error"}.`);
            }
        };
        reader.readAsBinaryString(file);
    };

    // ── Preview summary ──────────────────────────────────────────────────────
    const templateGroups = parsedRows.reduce<Record<string, { sections: Set<string>; questions: number }>>((acc, row) => {
        const name = row.templateName || "(unnamed)";
        if (!acc[name]) acc[name] = { sections: new Set(), questions: 0 };
        if (row.sectionName) acc[name].sections.add(row.sectionName);
        if (row.questionText) acc[name].questions++;
        return acc;
    }, {});
    const templateNames = Object.keys(templateGroups);

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleImport = async () => {
        if (parsedRows.length === 0) return;
        setSubmitting(true);
        setResult(null);
        try {
            const res = await apiClient.post("/api/rfi/templates/import", parsedRows) as ImportResult;
            setResult(res);
            if (res.created.length > 0) {
                toast.success(`${res.created.length} template${res.created.length !== 1 ? "s" : ""} imported as drafts.`);
                onImported();
            }
            if (res.errors.length > 0 && res.created.length === 0) {
                toast.error("Import failed — all templates had errors.");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Import failed. Please try again.";
            toast.error(msg);
            setResult({ created: [], errors: [{ name: "–", error: msg }] });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Reset ────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setResult(null); setParsedRows([]); setFileName(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleClose = () => { handleReset(); onClose(); };

    const hasPreview = parsedRows.length > 0 && !parseError;
    const hasResult  = result !== null;
    const allSuccess = hasResult && result.errors.length === 0;
    const allFailed  = hasResult && result.created.length === 0;
    const partial    = hasResult && result.created.length > 0 && result.errors.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary" />
                        Import Templates
                    </DialogTitle>
                    <DialogDescription>
                        Upload an Excel or CSV file to bulk-create RFI templates as drafts.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-1">

                    {/* Format guide */}
                    <div className="flex items-start gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                        <FileSpreadsheet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium text-slate-800">One row = one question</p>
                            <p className="text-xs text-muted-foreground">
                                Rows with the same <code className="bg-white border rounded px-1">templateName</code> are merged into one template.
                                Rows with the same <code className="bg-white border rounded px-1">sectionName</code> are merged into one section.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Required: <code className="bg-white border rounded px-1">templateName</code>.
                                Optional: <code className="bg-white border rounded px-1">category</code>{" "}
                                <code className="bg-white border rounded px-1">sectionName</code>{" "}
                                <code className="bg-white border rounded px-1">questionText</code>{" "}
                                <code className="bg-white border rounded px-1">questionType</code>{" "}
                                <code className="bg-white border rounded px-1">mandatory</code>{" "}
                                <code className="bg-white border rounded px-1">promoteToRfp</code>
                            </p>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 gap-1.5 bg-white" onClick={handleDownloadSample}>
                            <Download className="h-3.5 w-3.5" /> Sample
                        </Button>
                    </div>

                    {/* Upload zone */}
                    <div className="space-y-2">
                        <label
                            htmlFor="tpl-import-file"
                            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/25 rounded-lg px-6 py-7 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                        >
                            {fileName ? (
                                <>
                                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                    <span className="text-sm font-medium text-slate-800">{fileName}</span>
                                    {hasPreview && (
                                        <span className="text-xs text-green-600 font-medium">
                                            {templateNames.length} template{templateNames.length !== 1 ? "s" : ""} · {parsedRows.filter(r => r.questionText).length} questions detected
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                                    <span className="text-sm text-muted-foreground">
                                        Click to select <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>
                                    </span>
                                    <span className="text-xs text-muted-foreground/60">Max 500 rows</span>
                                </>
                            )}
                            <input
                                ref={fileRef}
                                id="tpl-import-file"
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

                    {/* Preview */}
                    {hasPreview && !hasResult && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-800 flex items-center gap-2">
                                    Preview — {templateNames.length} template{templateNames.length !== 1 ? "s" : ""} ready
                                </span>
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground gap-1" onClick={handleReset}>
                                    <X className="h-3 w-3" /> Clear
                                </Button>
                            </div>
                            <div className="border rounded-lg overflow-hidden text-sm divide-y">
                                {templateNames.slice(0, 8).map((name) => {
                                    const g = templateGroups[name];
                                    return (
                                        <div key={name} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/20">
                                            <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                                            <span className="flex-1 font-medium truncate">{name}</span>
                                            <Badge variant="outline" className="text-[10px] shrink-0">{g.sections.size} section{g.sections.size !== 1 ? "s" : ""}</Badge>
                                            <Badge variant="outline" className="text-[10px] shrink-0">{g.questions} question{g.questions !== 1 ? "s" : ""}</Badge>
                                        </div>
                                    );
                                })}
                                {templateNames.length > 8 && (
                                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                                        …and {templateNames.length - 8} more
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Templates will be created as <strong>Drafts</strong>. You can review and publish them from the Templates list.</p>
                        </div>
                    )}

                    {/* Results */}
                    {hasResult && (
                        <div className="space-y-3">
                            {allSuccess && (
                                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                                    <span><strong>All {result.created.length} template{result.created.length !== 1 ? "s" : ""} imported</strong> — saved as drafts.</span>
                                </div>
                            )}
                            {allFailed && (
                                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
                                    <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                                    <span><strong>Import failed</strong> — {result.errors.length} template{result.errors.length !== 1 ? "s" : ""} had errors. No templates were created.</span>
                                </div>
                            )}
                            {partial && (
                                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                                    <span><strong>{result.created.length} imported</strong>, <strong>{result.errors.length} failed</strong>.</span>
                                </div>
                            )}

                            {result.created.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Created ({result.created.length})
                                    </p>
                                    <div className="border rounded-lg divide-y text-sm max-h-40 overflow-y-auto">
                                        {result.created.map((t) => (
                                            <div key={t.templateId} className="flex items-center gap-2 px-3 py-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                                <span className="font-medium truncate flex-1">{t.name}</span>
                                                <span className="text-xs text-muted-foreground shrink-0">{t.sections}s · {t.questions}q</span>
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
                                    <div className="border border-red-200 rounded-lg divide-y divide-red-100 text-sm max-h-32 overflow-y-auto">
                                        {result.errors.map((e, i) => (
                                            <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-50/50">
                                                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <span className="text-muted-foreground text-xs">"{e.name}" — </span>
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
                                : <><Upload className="h-4 w-4 mr-2" />Import {templateNames.length > 0 ? `${templateNames.length} Template${templateNames.length !== 1 ? "s" : ""}` : "Templates"}</>
                            }
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
