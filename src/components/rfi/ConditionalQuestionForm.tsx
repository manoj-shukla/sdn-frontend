"use client";

import { useMemo } from "react";
import { QuestionRenderer } from "./QuestionRenderer";
import { RFIProgressBar } from "./RFIProgressBar";
import type { RFITemplateSection, RFIAnswer, RFIAnswerValue, RFIQuestion } from "@/types/rfi";

interface Props {
    sections: RFITemplateSection[];
    answers: Record<string | number, RFIAnswerValue>;
    visibleQuestionIds: (string | number)[];
    onAnswerChange: (questionId: string | number, value: RFIAnswerValue) => void;
    onAttachFile?: (questionId: string | number, file: File) => Promise<void>;
    errors?: Record<string | number, string>;
    disabled?: boolean;
    activeSectionIndex: number;
}

export function ConditionalQuestionForm({
    sections,
    answers,
    visibleQuestionIds,
    onAnswerChange,
    onAttachFile,
    errors = {},
    disabled,
    activeSectionIndex,
}: Props) {
    const section = sections[activeSectionIndex];
    if (!section) return null;

    const visibleSet = new Set(visibleQuestionIds);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-slate-800">{section.title}</h2>
                {section.description && (
                    <p className="text-muted-foreground mt-1 text-sm">{section.description}</p>
                )}
            </div>

            <div className="space-y-6">
                {section.questions.map((tq) => {
                    const q = tq.question;
                    if (!q) return null;
                    if (!visibleSet.has(q.questionId)) return null;

                    const value = answers[q.questionId] ?? {};
                    const error = errors[q.questionId];

                    return (
                        <div key={q.questionId} data-testid={`question-${q.questionId}`} className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-start gap-0.5">
                                {q.text}
                                {tq.isMandatory && (
                                    <span className="text-red-500 ml-0.5 leading-none">*</span>
                                )}
                            </label>
                            {q.helpText && (
                                <p className="text-xs text-muted-foreground">{q.helpText}</p>
                            )}
                            <QuestionRenderer
                                question={q}
                                value={value}
                                onChange={(v) => onAnswerChange(q.questionId, v)}
                                onAttachFile={onAttachFile}
                                disabled={disabled}
                                error={error}
                            />
                            {error && (
                                <p className="text-xs text-red-500">{error}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
