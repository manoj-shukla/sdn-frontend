/**
 * RFI Export Utilities — Excel (XLSX) and PDF
 */

import * as XLSX from "xlsx";
import type {
    RFIEvent,
    RFIEvaluationSupplier,
    RFITemplateSection,
} from "@/types/rfi";
import type { SupplierScoreResult } from "./scoring";

// ── helpers ──────────────────────────────────────────────────────────────────

function answerText(answer: any): string {
    if (!answer?.value) return "";
    const v = answer.value;
    if (typeof v.text === "string" && v.text) return v.text;
    if (typeof v.bool === "boolean") return v.bool ? "Yes" : "No";
    if (typeof v.number === "number") return String(v.number);
    if (Array.isArray(v.selected)) return v.selected.join(", ");
    if (typeof v.selected === "string") return v.selected;
    return "";
}

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Excel: all supplier responses ────────────────────────────────────────────

export function exportResponsesExcel(
    eventTitle: string,
    suppliers: RFIEvaluationSupplier[],
    sections: RFITemplateSection[],
    scoreMap: Map<string, SupplierScoreResult>
) {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Summary
    const summaryRows = [
        ["RFI Event", eventTitle],
        ["Exported At", new Date().toLocaleString()],
        ["Total Suppliers", suppliers.length],
        ["Submitted", suppliers.filter((s) => s.invitationStatus === "SUBMITTED").length],
        ["Shortlisted", suppliers.filter((s) => s.evaluationStatus === "SHORTLISTED").length],
        [],
        ["Supplier", "Status", "Completion %", "Submitted At", "Score", "Grade", "Shortlisted"],
        ...suppliers.map((s) => {
            const sr = scoreMap.get(s.supplierId);
            return [
                s.supplierName,
                s.invitationStatus,
                s.completionPercent ?? 0,
                s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : "",
                sr?.totalScore ?? "",
                sr?.grade ?? "",
                s.evaluationStatus === "SHORTLISTED" ? "Yes" : "No",
            ];
        }),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Sheet 2 — Detailed Responses (one row per supplier per question)
    const allQuestions = sections.flatMap((sec) =>
        (sec.questions ?? []).map((tq) => ({
            section: sec.title ?? "",
            questionId: String(tq.question?.questionId ?? tq.questionId ?? ""),
            questionText: tq.question?.text || "",
            weight: tq.question?.weight ?? "",
        }))
    );

    if (allQuestions.length > 0) {
        const header = ["Supplier", "Status", "Completion %", ...allQuestions.map((q) => q.questionText)];
        const dataRows = suppliers.map((s) => {
            const answers = allQuestions.map((q) => {
                const ans = s.answers?.find((a) => String(a.questionId) === q.questionId);
                return answerText(ans);
            });
            return [s.supplierName, s.invitationStatus, s.completionPercent ?? 0, ...answers];
        });
        const wsDetail = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
        wsDetail["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 13 }, ...allQuestions.map(() => ({ wch: 24 }))];
        XLSX.utils.book_append_sheet(wb, wsDetail, "Responses");

        // Sheet 3 — Question Weights (if any questions have weights)
        const weightedQs = allQuestions.filter((q) => q.weight);
        if (weightedQs.length > 0) {
            const wsWeights = XLSX.utils.aoa_to_sheet([
                ["Section", "Question", "Weight"],
                ...weightedQs.map((q) => [q.section, q.questionText, q.weight]),
            ]);
            wsWeights["!cols"] = [{ wch: 22 }, { wch: 50 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, wsWeights, "Scoring Weights");
        }
    }

    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    triggerDownload(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `RFI_Responses_${eventTitle.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
}

// ── Excel: comparison table ───────────────────────────────────────────────────

export function exportCompareExcel(
    eventTitle: string,
    suppliers: RFIEvaluationSupplier[],
    sections: RFITemplateSection[],
    scoreMap: Map<string, SupplierScoreResult>
) {
    const wb = XLSX.utils.book_new();
    const allQuestions = sections.flatMap((sec) =>
        (sec.questions ?? []).map((tq) => ({
            questionId: String(tq.question?.questionId ?? tq.questionId ?? ""),
            questionText: tq.question?.text || "",
        }))
    );

    const header = ["Criterion", ...suppliers.map((s) => s.supplierName)];
    const scoreRow = ["Weighted Score", ...suppliers.map((s) => scoreMap.get(s.supplierId)?.totalScore ?? "—")];
    const gradeRow = ["Grade", ...suppliers.map((s) => scoreMap.get(s.supplierId)?.grade ?? "—")];
    const completionRow = ["Completion %", ...suppliers.map((s) => s.completionPercent ?? 0)];
    const shortlistRow = ["Shortlisted", ...suppliers.map((s) => s.evaluationStatus === "SHORTLISTED" ? "Yes" : "No")];

    const questionRows = allQuestions.map((q) => [
        q.questionText,
        ...suppliers.map((s) => {
            const ans = s.answers?.find((a) => String(a.questionId) === q.questionId);
            return answerText(ans);
        }),
    ]);

    const wsData = [header, scoreRow, gradeRow, completionRow, shortlistRow, [], ...questionRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 40 }, ...suppliers.map(() => ({ wch: 24 }))];
    XLSX.utils.book_append_sheet(wb, ws, "Comparison");

    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    triggerDownload(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `RFI_Comparison_${eventTitle.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
}

// ── PDF: single supplier response ─────────────────────────────────────────────

export async function exportSupplierPDF(
    supplier: RFIEvaluationSupplier,
    sections: RFITemplateSection[],
    scoreResult?: SupplierScoreResult | null,
    eventTitle?: string
) {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageW, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RFI Supplier Response", 14, 9);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString(), pageW - 14, 9, { align: "right" });

    doc.setTextColor(0, 0, 0);
    y = 22;

    if (eventTitle) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Event: ${eventTitle}`, 14, y);
        y += 6;
    }

    // Supplier name
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(supplier.supplierName, 14, y);
    y += 6;

    // Meta row
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const meta = [
        `Status: ${supplier.invitationStatus}`,
        `Completion: ${supplier.completionPercent ?? 0}%`,
        supplier.submittedAt ? `Submitted: ${new Date(supplier.submittedAt).toLocaleDateString()}` : "",
        scoreResult?.totalScore != null ? `Score: ${scoreResult.totalScore}/100 (${scoreResult.grade})` : "",
        supplier.evaluationStatus === "SHORTLISTED" ? "⭐ Shortlisted" : "",
    ].filter(Boolean).join("   |   ");
    doc.text(meta, 14, y);
    y += 8;

    // Score bar (if scored)
    if (scoreResult?.totalScore != null) {
        const barW = pageW - 28;
        doc.setFillColor(226, 232, 240);
        doc.rect(14, y, barW, 3, "F");
        const score = scoreResult.totalScore;
        const color = score >= 80 ? [34, 197, 94] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(14, y, (barW * score) / 100, 3, "F");
        y += 8;
    }

    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, pageW - 14, y);
    y += 6;

    // Answers table — grouped by section
    const allQuestions = sections.flatMap((sec) =>
        (sec.questions ?? []).map((tq) => ({
            section: sec.title ?? "General",
            questionText: tq.question?.text || `Q-${tq.questionId}`,
            questionId: String(tq.question?.questionId ?? tq.questionId ?? ""),
            weight: tq.question?.weight,
        }))
    );

    const tableBody = allQuestions.map((q) => {
        const ans = supplier.answers?.find((a) => String(a.questionId) === q.questionId);
        const val = answerText(ans) || "—";
        return [
            q.section,
            q.questionText,
            q.weight ? `W:${q.weight}` : "",
            val.length > 120 ? val.slice(0, 120) + "…" : val,
        ];
    });

    autoTable(doc, {
        startY: y,
        head: [["Section", "Question", "Weight", "Answer"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
        columnStyles: {
            0: { cellWidth: 28, fontStyle: "bold" },
            1: { cellWidth: 70 },
            2: { cellWidth: 14, halign: "center" },
            3: { cellWidth: 60 },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
    });

    // Notes (if any)
    if ((supplier.notes?.length ?? 0) > 0) {
        const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Internal Notes", 14, finalY + 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        supplier.notes.forEach((n, i) => {
            doc.setTextColor(80, 80, 80);
            doc.text(`${i + 1}. ${n.text}`, 14, finalY + 14 + i * 6);
        });
    }

    doc.save(`${supplier.supplierName.replace(/\s+/g, "_")}_RFI_Response_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Excel: RFI events list (dashboard export) ─────────────────────────────────

export function exportEventsExcel(events: RFIEvent[]) {
    const wb = XLSX.utils.book_new();

    const rows: any[][] = [
        ["Title", "Status", "Category", "Suppliers Invited", "Submissions", "Completion %", "Deadline", "Region", "Created"],
        ...events.map((e) => [
            e.title,
            e.status,
            (e as any).category || "",
            e.supplierCount ?? 0,
            e.submittedCount ?? 0,
            e.supplierCount
                ? Math.round(((e.submittedCount ?? 0) / e.supplierCount) * 100)
                : 0,
            e.deadline ? new Date(e.deadline).toLocaleDateString() : "",
            (e as any).region || "",
            (e as any).createdAt ? new Date((e as any).createdAt).toLocaleDateString() : "",
        ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
        { wch: 42 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "RFI Events");

    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    triggerDownload(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `RFI_Events_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
}

// ── Excel: analytics report ───────────────────────────────────────────────────

export function exportAnalyticsExcel(opts: {
    period: string;
    events: RFIEvent[];
    stats: { label: string; value: string; sub: string }[];
    completionByMonth: { month: string; pct: number }[];
    eventsByCategory: { cat: string; count: number }[];
    eventStatusRows: { label: string; pct: number }[];
    responseRows: { label: string; pct: number }[];
}) {
    const { period, events, stats, completionByMonth, eventsByCategory, eventStatusRows, responseRows } = opts;
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Summary KPIs
    const wsSummary = XLSX.utils.aoa_to_sheet([
        ["RFI Analytics Report"],
        ["Period", period === "3m" ? "Last 3 Months" : period === "6m" ? "Last 6 Months" : "This Year"],
        ["Generated", new Date().toLocaleString()],
        ["Total Events Included", events.length],
        [],
        ["Metric", "Value", "Detail"],
        ...stats.map((s) => [s.label, s.value, s.sub]),
    ]);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Sheet 2 — Monthly Completion Trend
    if (completionByMonth.length > 0) {
        const wsMonthly = XLSX.utils.aoa_to_sheet([
            ["Month", "Avg Completion %"],
            ...completionByMonth.map((d) => [d.month, d.pct]),
        ]);
        wsMonthly["!cols"] = [{ wch: 12 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsMonthly, "Monthly Trend");
    }

    // Sheet 3 — Events by Category
    if (eventsByCategory.length > 0) {
        const wsCat = XLSX.utils.aoa_to_sheet([
            ["Category", "Event Count"],
            ...eventsByCategory.map((d) => [d.cat, d.count]),
        ]);
        wsCat["!cols"] = [{ wch: 22 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, wsCat, "By Category");
    }

    // Sheet 4 — Event Status Breakdown
    const statusRows = [
        ...(eventStatusRows.length > 0 ? eventStatusRows : []),
        ...(responseRows.length > 0 ? responseRows : []),
    ];
    if (statusRows.length > 0) {
        const wsStatus = XLSX.utils.aoa_to_sheet([
            ["Dimension", "% Share"],
            ...statusRows.map((d) => [d.label, d.pct]),
        ]);
        wsStatus["!cols"] = [{ wch: 28 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsStatus, "Status Breakdown");
    }

    // Sheet 5 — All Events Detail
    if (events.length > 0) {
        const wsEvents = XLSX.utils.aoa_to_sheet([
            ["Title", "Status", "Category", "Suppliers", "Submissions", "Deadline"],
            ...events.map((e) => [
                e.title,
                e.status,
                (e as any).category || "",
                e.supplierCount ?? 0,
                e.submittedCount ?? 0,
                e.deadline ? new Date(e.deadline).toLocaleDateString() : "",
            ]),
        ]);
        wsEvents["!cols"] = [{ wch: 40 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, wsEvents, "Events");
    }

    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    triggerDownload(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `RFI_Analytics_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
}
