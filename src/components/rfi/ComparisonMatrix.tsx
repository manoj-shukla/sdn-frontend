"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RFIStatusBadge } from "./RFIStatusBadge";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { RFIEvaluation, RFIAnswer, RFIAnswerValue, RFITemplateSection } from "@/types/rfi";
import { cn } from "@/lib/utils";

interface Props {
    evaluation: RFIEvaluation;
    onSelectSupplier: (supplierId: string) => void;
    selectedSupplierId: string | null;
}

function formatAnswerPreview(answer: RFIAnswer | undefined): string {
    if (!answer) return "—";
    const v: RFIAnswerValue = answer.value;
    if (v.text) return v.text.length > 80 ? v.text.slice(0, 80) + "…" : v.text;
    if (v.bool !== undefined) return v.bool ? "Yes" : "No";
    if (v.selected) {
        if (Array.isArray(v.selected)) return v.selected.join(", ");
        return String(v.selected);
    }
    if (v.numeric !== undefined) return String(v.numeric);
    if (v.attachments?.length) return `${v.attachments.length} file(s)`;
    if (v.tableRows?.length) return `${v.tableRows.length} row(s)`;
    return "—";
}

export function ComparisonMatrix({ evaluation, onSelectSupplier, selectedSupplierId }: Props) {
    const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

    const { sections, suppliers } = evaluation;

    const toggleSection = (idx: number) => {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    return (
        <div data-testid="comparison-matrix" className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                        <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700 border-b border-r min-w-[260px]">
                            Question
                        </th>
                        {suppliers.map((s) => (
                            <th
                                key={s.supplierId}
                                className={cn(
                                    "px-3 py-3 text-left font-semibold border-b border-r min-w-[200px] cursor-pointer hover:bg-slate-100 transition-colors",
                                    selectedSupplierId === s.supplierId
                                        ? "bg-indigo-50 text-indigo-700"
                                        : "text-slate-700"
                                )}
                                data-testid={`supplier-column-${s.supplierId}`}
                                onClick={() => onSelectSupplier(s.supplierId)}
                            >
                                <div className="space-y-1">
                                    <div className="truncate">{s.supplierName}</div>
                                    <RFIStatusBadge status={s.evaluationStatus} />
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sections.map((section: RFITemplateSection, sIdx: number) => {
                        const collapsed = collapsedSections.has(sIdx);
                        return (
                            <Fragment key={`section-${sIdx}`}>
                                {/* Section header row */}
                                <tr
                                    className="bg-slate-100 cursor-pointer hover:bg-slate-200"
                                    onClick={() => toggleSection(sIdx)}
                                >
                                    <td
                                        colSpan={suppliers.length + 1}
                                        className="px-4 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wide border-b"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {collapsed ? (
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            )}
                                            {section.title}
                                        </span>
                                    </td>
                                </tr>
                                {/* Question rows */}
                                {!collapsed &&
                                    section.questions.map((tq, qIdx) => {
                                        const q = tq.question;
                                        if (!q) return null;
                                        return (
                                            <tr
                                                key={`q-${sIdx}-${qIdx}`}
                                                data-testid={`question-row-${q.questionId}`}
                                                className="hover:bg-slate-50 border-b"
                                            >
                                                <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r align-top">
                                                    <div className="font-medium text-slate-800 leading-snug">
                                                        {q.text}
                                                        {tq.isMandatory && (
                                                            <span className="text-red-500 ml-0.5">*</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {q.questionType.replace("_", " ")}
                                                    </div>
                                                </td>
                                                {suppliers.map((s) => {
                                                    const answer = s.answers.find(
                                                        (a) => String(a.questionId) === String(q.questionId)
                                                    );
                                                    const preview = formatAnswerPreview(answer);
                                                    return (
                                                        <td
                                                            key={s.supplierId}
                                                            className={cn(
                                                                "px-3 py-3 border-r align-top text-slate-700",
                                                                selectedSupplierId === s.supplierId &&
                                                                    "bg-indigo-50/40"
                                                            )}
                                                        >
                                                            {preview === "—" ? (
                                                                <span className="text-muted-foreground italic">
                                                                    Not answered
                                                                </span>
                                                            ) : (
                                                                <span className="leading-snug">{preview}</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
