"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import type { RFIQuestion, RFIAnswerValue } from "@/types/rfi";
import { cn } from "@/lib/utils";

interface Props {
    question: RFIQuestion;
    value: RFIAnswerValue;
    onChange: (value: RFIAnswerValue) => void;
    disabled?: boolean;
    error?: string;
    onAttachFile?: (questionId: string | number, file: File) => Promise<void>;
}

export function QuestionRenderer({ question, value, onChange, disabled, error, onAttachFile }: Props) {
    const { questionType, options = [], tableColumns = [] } = question;

    const inputClass = cn(
        "transition-colors",
        error ? "border-red-500 focus-visible:ring-red-500" : ""
    );

    if (questionType === "SHORT_TEXT") {
        return (
            <Input
                data-testid={`question-answer-${question.questionId}`}
                value={value.text ?? ""}
                onChange={(e) => onChange({ ...value, text: e.target.value })}
                disabled={disabled}
                className={inputClass}
                placeholder="Type your answer…"
            />
        );
    }

    if (questionType === "LONG_TEXT") {
        return (
            <Textarea
                data-testid={`question-answer-${question.questionId}`}
                value={value.text ?? ""}
                onChange={(e) => onChange({ ...value, text: e.target.value })}
                disabled={disabled}
                rows={4}
                className={cn("resize-none", inputClass)}
                placeholder="Type your answer…"
            />
        );
    }

    if (questionType === "YES_NO") {
        return (
            <div className="flex gap-4">
                {["YES", "NO"].map((opt) => (
                    <label
                        key={opt}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer select-none transition-colors",
                            value.selected === opt
                                ? "border-primary bg-primary/5 text-primary font-semibold"
                                : "border-slate-200 hover:border-slate-300",
                            disabled && "cursor-not-allowed opacity-60"
                        )}
                        data-testid={`yes-no-${question.questionId}-${opt.toLowerCase()}`}
                    >
                        <input
                            type="radio"
                            className="sr-only"
                            disabled={disabled}
                            checked={value.selected === opt}
                            onChange={() => onChange({ ...value, selected: opt })}
                        />
                        {opt}
                    </label>
                ))}
            </div>
        );
    }

    if (questionType === "SINGLE_SELECT") {
        return (
            <Select
                value={(value.selected as string) ?? ""}
                onValueChange={(v) => onChange({ ...value, selected: v })}
                disabled={disabled}
            >
                <SelectTrigger data-testid={`question-answer-${question.questionId}`} className={inputClass}>
                    <SelectValue placeholder="Select an option…" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (questionType === "MULTI_SELECT") {
        const selected = Array.isArray(value.selected) ? (value.selected as string[]) : [];
        return (
            <div className="space-y-2">
                {options.map((opt) => {
                    const checked = selected.includes(opt.value);
                    return (
                        <label
                            key={opt.value}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Checkbox
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={(c) => {
                                    const next = c
                                        ? [...selected, opt.value]
                                        : selected.filter((v) => v !== opt.value);
                                    onChange({ ...value, selected: next });
                                }}
                            />
                            <span className="text-sm">{opt.label}</span>
                        </label>
                    );
                })}
            </div>
        );
    }

    if (questionType === "NUMERIC") {
        return (
            <Input
                data-testid={`question-answer-${question.questionId}`}
                type="number"
                value={value.numeric ?? ""}
                onChange={(e) => onChange({ ...value, numeric: parseFloat(e.target.value) || 0 })}
                disabled={disabled}
                className={cn("max-w-xs", inputClass)}
                placeholder="0"
            />
        );
    }

    if (questionType === "ATTACHMENT") {
        const attachments = value.attachments ?? [];
        return (
            <div className="space-y-2">
                {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded border bg-slate-50">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{att.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                            {(att.fileSize / 1024).toFixed(0)} KB
                        </span>
                    </div>
                ))}
                {!disabled && (
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <Button variant="outline" size="sm" asChild>
                            <span>
                                <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                                Attach file
                            </span>
                        </Button>
                        <input
                            type="file"
                            className="sr-only"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && onAttachFile) {
                                    onAttachFile(question.questionId, file);
                                }
                            }}
                        />
                    </label>
                )}
            </div>
        );
    }

    if (questionType === "TABLE") {
        const rows: Record<string, string | number>[] = value.tableRows ?? [{}];
        return (
            <div className="space-y-2">
                <div className="overflow-x-auto rounded border">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                {tableColumns.map((col) => (
                                    <th key={col.key} className="px-3 py-2 text-left font-medium text-muted-foreground">
                                        {col.label}
                                    </th>
                                ))}
                                {!disabled && <th className="w-8" />}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, ri) => (
                                <tr key={ri} className="border-b last:border-0">
                                    {tableColumns.map((col) => (
                                        <td key={col.key} className="px-2 py-1">
                                            {col.type === "select" ? (
                                                <Select
                                                    value={(row[col.key] as string) ?? ""}
                                                    onValueChange={(v) => {
                                                        const next = rows.map((r, i) =>
                                                            i === ri ? { ...r, [col.key]: v } : r
                                                        );
                                                        onChange({ ...value, tableRows: next });
                                                    }}
                                                    disabled={disabled}
                                                >
                                                    <SelectTrigger className="h-7 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {col.options?.map((o) => (
                                                            <SelectItem key={o} value={o}>{o}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    type={col.type === "number" ? "number" : "text"}
                                                    value={row[col.key] ?? ""}
                                                    onChange={(e) => {
                                                        const next = rows.map((r, i) =>
                                                            i === ri
                                                                ? {
                                                                      ...r,
                                                                      [col.key]:
                                                                          col.type === "number"
                                                                              ? parseFloat(e.target.value)
                                                                              : e.target.value,
                                                                  }
                                                                : r
                                                        );
                                                        onChange({ ...value, tableRows: next });
                                                    }}
                                                    disabled={disabled}
                                                    className="h-7 text-xs"
                                                />
                                            )}
                                        </td>
                                    ))}
                                    {!disabled && (
                                        <td className="px-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    onChange({
                                                        ...value,
                                                        tableRows: rows.filter((_, i) => i !== ri),
                                                    })
                                                }
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!disabled && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            onChange({ ...value, tableRows: [...rows, {}] })
                        }
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Row
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="text-sm text-muted-foreground italic">
            Unsupported question type: {questionType}
        </div>
    );
}

// Re-export Label for convenience in consuming pages
export { Label };
