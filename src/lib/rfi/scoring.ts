/**
 * Enterprise Weighted Scoring Matrix (WSM) for RFI evaluation.
 *
 * How it works:
 *  1. Each RFI question carries a `weight` (1–100) and a `scoringConfig`.
 *  2. For every supplier answer we derive a `rawScore` (0–100) based on `scoringConfig`.
 *  3. The supplier's final score is:
 *
 *       Σ(weight_i × rawScore_i / 100)
 *       ──────────────────────────────  × 100
 *            Σ(weight_i)
 *
 *     i.e. a weighted average of all per-question scores, expressed as a percentage.
 *
 *  4. Questions without a `scoringConfig` are excluded from the weighted total.
 *  5. Text / Attachment / Table questions require manual scoring by an evaluator;
 *     their score is passed in via `manualScores` (keyed by questionId string).
 */

import type {
    RFIAnswer,
    RFIQuestion,
    RFIEvaluationSupplier,
    RFITemplateSection,
    QuestionScoringConfig,
    QuestionType,
} from "@/types/rfi";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuestionScoreBreakdown {
    questionId: string;
    questionText: string;
    weight: number;
    rawScore: number | null; // null → unanswered or manual-pending
    weightedContribution: number; // weight × rawScore/100
    isManual: boolean;
    isUnanswered: boolean;
}

export interface SupplierScoreResult {
    supplierId: string;
    supplierName: string;
    /** Final weighted score 0–100, or null if no scored questions were answered */
    totalScore: number | null;
    /** Maximum achievable score given the weights (always 100 if ≥1 scored question) */
    maxScore: number;
    /** Score expressed as a letter grade */
    grade: "A+" | "A" | "B" | "B-" | "C" | "D" | "F" | "—";
    /** Breakdown per scored question */
    breakdown: QuestionScoreBreakdown[];
    /** How many questions still need manual scoring */
    pendingManualCount: number;
    /** Rank (1 = best) — filled in after sorting all suppliers */
    rank?: number;
}

// ── Manual-scoring question types ────────────────────────────────────────────

export const MANUAL_SCORE_TYPES: QuestionType[] = [
    "SHORT_TEXT",
    "LONG_TEXT",
    "ATTACHMENT",
    "TABLE",
];

export function isManualScoreType(type: QuestionType): boolean {
    return MANUAL_SCORE_TYPES.includes(type);
}

// ── Per-question raw score computation ───────────────────────────────────────

/**
 * Returns a 0–100 raw score for a single question answer.
 * Returns `null` when the question is unanswered or requires manual scoring.
 */
export function computeRawScore(
    answer: RFIAnswer | undefined,
    question: RFIQuestion,
    manualScore?: number
): number | null {
    const config: QuestionScoringConfig | undefined = question.scoringConfig;

    // No scoring config → unscored
    if (!config) return null;

    const type = question.questionType;

    // ── Manual types ───────────────────────────────────────────────────────
    if (isManualScoreType(type)) {
        if (manualScore !== undefined && manualScore >= 0) {
            const max = config.maxManualScore ?? 100;
            return Math.min(100, Math.round((manualScore / max) * 100));
        }
        return null; // awaiting manual score
    }

    // ── Auto-scored types ─────────────────────────────────────────────────
    if (!answer) return null;

    // YES_NO
    if (type === "YES_NO") {
        const val = answer.value?.bool;
        if (val === true) return config.yesScore ?? 100;
        if (val === false) return config.noScore ?? 0;
        return null;
    }

    // SINGLE_SELECT
    if (type === "SINGLE_SELECT") {
        const selected = answer.value?.selected;
        if (typeof selected !== "string" || !selected) return null;
        const rule = (config.optionRules ?? []).find((r) => r.value === selected);
        return rule ? rule.score : null;
    }

    // MULTI_SELECT — average score of all selected options
    if (type === "MULTI_SELECT") {
        const selected = answer.value?.selected;
        const arr: string[] = Array.isArray(selected)
            ? selected
            : typeof selected === "string" && selected
            ? [selected]
            : [];
        if (!arr.length) return null;
        const rules = config.optionRules ?? [];
        const scored = arr
            .map((v) => rules.find((r) => r.value === v)?.score)
            .filter((s): s is number => s !== undefined);
        if (!scored.length) return null;
        return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
    }

    // NUMERIC — first matching range wins (top-to-bottom)
    if (type === "NUMERIC") {
        const val = answer.value?.numeric;
        if (val === undefined || val === null) return null;
        const ranges = config.numericRanges ?? [];
        for (const range of ranges) {
            const aboveMin = range.min === undefined || val >= range.min;
            const belowMax = range.max === undefined || val <= range.max;
            if (aboveMin && belowMax) return range.score;
        }
        return null;
    }

    return null;
}

// ── Supplier-level score computation ─────────────────────────────────────────

/**
 * Computes a full weighted score for one supplier across all scored questions.
 *
 * @param supplier     The supplier evaluation object (answers + metadata)
 * @param sections     Template sections containing the question definitions
 * @param manualScores Map of questionId → manual score (0 to maxManualScore)
 */
export function computeSupplierScore(
    supplier: RFIEvaluationSupplier,
    sections: RFITemplateSection[],
    manualScores: Record<string, number> = {}
): SupplierScoreResult {
    const breakdown: QuestionScoreBreakdown[] = [];
    let weightSum = 0;
    let weightedSum = 0;
    let pendingManual = 0;

    // Flatten all template questions
    const allTQ = sections.flatMap((s) => s.questions);

    for (const tq of allTQ) {
        const question = tq.question;
        if (!question) continue;

        const config = question.scoringConfig;
        if (!config) continue; // skip unscored questions

        const weight = question.weight ?? 10;
        const qId = String(question.questionId);
        const answer = supplier.answers?.find(
            (a) => String(a.questionId) === qId
        );

        const manual = manualScores[qId];
        const rawScore = computeRawScore(answer, question, manual);
        const isManual = isManualScoreType(question.questionType);
        const isUnanswered = !answer && !isManual;

        if (rawScore !== null) {
            weightSum += weight;
            weightedSum += weight * (rawScore / 100);
        } else if (isManual && manual === undefined) {
            pendingManual++;
        }

        breakdown.push({
            questionId: qId,
            questionText: question.text,
            weight,
            rawScore,
            weightedContribution: rawScore !== null ? weight * (rawScore / 100) : 0,
            isManual,
            isUnanswered,
        });
    }

    const totalScore =
        weightSum > 0 ? Math.round((weightedSum / weightSum) * 100) : null;

    return {
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        totalScore,
        maxScore: 100,
        grade: scoreToGrade(totalScore),
        breakdown,
        pendingManualCount: pendingManual,
    };
}

// ── Batch ranking ─────────────────────────────────────────────────────────────

/**
 * Score and rank all suppliers for an RFI event.
 * Returns the array sorted by totalScore descending (null scores go last).
 */
export function rankSuppliers(
    suppliers: RFIEvaluationSupplier[],
    sections: RFITemplateSection[],
    allManualScores: Record<string, Record<string, number>> = {}
): SupplierScoreResult[] {
    const results = suppliers.map((s) =>
        computeSupplierScore(s, sections, allManualScores[s.supplierId] ?? {})
    );

    results.sort((a, b) => {
        if (a.totalScore === null && b.totalScore === null) return 0;
        if (a.totalScore === null) return 1;
        if (b.totalScore === null) return -1;
        return b.totalScore - a.totalScore;
    });

    results.forEach((r, i) => {
        r.rank = i + 1;
    });

    return results;
}

// ── Grade helper ──────────────────────────────────────────────────────────────

export function scoreToGrade(score: number | null): SupplierScoreResult["grade"] {
    if (score === null) return "—";
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "B-";
    if (score >= 50) return "C";
    if (score >= 40) return "D";
    return "F";
}

export function gradeColor(grade: SupplierScoreResult["grade"]): string {
    switch (grade) {
        case "A+": return "text-emerald-700 bg-emerald-50 border-emerald-200";
        case "A":  return "text-green-700 bg-green-50 border-green-200";
        case "B":  return "text-blue-700 bg-blue-50 border-blue-200";
        case "B-": return "text-cyan-700 bg-cyan-50 border-cyan-200";
        case "C":  return "text-amber-700 bg-amber-50 border-amber-200";
        case "D":  return "text-orange-700 bg-orange-50 border-orange-200";
        case "F":  return "text-rose-700 bg-rose-50 border-rose-200";
        default:   return "text-muted-foreground bg-muted";
    }
}

export function rankMedal(rank: number): string {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
}
