// ============================================================
// RFI MODULE — TypeScript Interfaces
// ============================================================

// ---- Enums / Literal Union Types ----

export type RFITemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type RFIEventStatus = "DRAFT" | "OPEN" | "CLOSED" | "CONVERTED";
export type InvitationStatus = "SENT" | "VIEWED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
export type SupplierEvaluationStatus = "PENDING" | "SHORTLISTED" | "REJECTED" | "UNDER_REVIEW";
export type QuestionType =
    | "SHORT_TEXT"
    | "LONG_TEXT"
    | "YES_NO"
    | "SINGLE_SELECT"
    | "MULTI_SELECT"
    | "NUMERIC"
    | "ATTACHMENT"
    | "TABLE";

// ---- Questions ----

export interface RFIQuestionOption {
    value: string;
    label: string;
}

export interface RFIQuestionTableColumn {
    key: string;
    label: string;
    type: "text" | "number" | "select";
    options?: string[];
}

export interface RFIQuestion {
    questionId: string | number;
    text: string;
    questionType: QuestionType;
    isMandatory: boolean;
    promoteToRfp: boolean;
    options?: RFIQuestionOption[];
    tableColumns?: RFIQuestionTableColumn[];
    category?: string;
    capabilityTags?: string[];
    complianceTags?: string[];
    helpText?: string;
    createdAt: string;
    updatedAt?: string;
    isDeleted?: boolean;
}

// ---- Conditional Rules ----

export interface RFIConditionalRule {
    ruleId?: number;
    questionId: string | number;
    conditionQuestionId: string | number;
    conditionOperator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "IS_ANSWERED";
    conditionValue: string;
}

// ---- Template Sections & Questions ----

export interface RFITemplateQuestion {
    templateQuestionId?: number;
    questionId: string | number;
    question?: RFIQuestion;
    isMandatory: boolean;
    promoteToRfp: boolean;
    orderIndex: number;
    conditionalRules?: RFIConditionalRule[];
}

export interface RFITemplateSection {
    sectionId?: number;
    title: string;
    description?: string;
    orderIndex: number;
    questions: RFITemplateQuestion[];
}

// ---- Templates ----

export interface RFITemplate {
    templateId: number;
    name: string;
    category?: string;
    subcategory?: string;
    regions?: string[];
    regulatoryOverlays?: string[];
    status: RFITemplateStatus;
    version: number;
    sections: RFITemplateSection[];
    createdAt: string;
    updatedAt?: string;
    publishedAt?: string;
}

// ---- Events ----

export interface RFIEvent {
    rfiId: number;
    title: string;
    description?: string;
    status: RFIEventStatus;
    deadline: string;
    templateId: number;
    template?: RFITemplate;
    buyerId: number;
    supplierCount?: number;
    submittedCount?: number;
    completionPercent?: number;
    createdAt: string;
    updatedAt?: string;
    closedAt?: string;
    convertedAt?: string;
}

// ---- Invitations ----

export interface RFIInvitation {
    invitationId: number;
    rfiId: number;
    supplierId: number;
    supplierName?: string;
    supplierEmail?: string;
    status: InvitationStatus;
    sentAt: string;
    viewedAt?: string;
    submittedAt?: string;
    expiresAt?: string;
}

// ---- Responses ----

export interface RFIAnswerValue {
    text?: string;
    selected?: string | string[];
    numeric?: number;
    bool?: boolean;
    tableRows?: Record<string, string | number>[];
    attachments?: RFIAttachment[];
}

export interface RFIAnswer {
    questionId: string;
    value: RFIAnswerValue;
    answeredAt?: string;
}

export interface RFIAttachment {
    attachmentId?: number;
    questionId: string | number;
    fileName: string;
    fileSize: number;
    mimeType: string;
    url?: string;
    uploadedAt?: string;
}

export interface RFIResponse {
    responseId: number;
    rfiId: number;
    supplierId: number;
    status: "DRAFT" | "SUBMITTED";
    answers: RFIAnswer[];
    submittedAt?: string;
    updatedAt?: string;
}

export interface RFIResponseProgress {
    rfiId: number;
    totalRequired: number;
    answered: number;
    percentComplete: number;
    missingSectionIds?: number[];
}

// ---- Evaluation ----

export interface RFIEvaluationSupplierNote {
    noteId?: number;
    text: string;
    createdAt?: string;
    createdBy?: string;
}

export interface RFIEvaluationSupplier {
    supplierId: string;
    supplierName: string;
    invitationStatus: InvitationStatus;
    evaluationStatus: SupplierEvaluationStatus;
    answers: RFIAnswer[];
    notes: RFIEvaluationSupplierNote[];
    completionPercent: number;
    submittedAt?: string;
}

export interface RFIEvaluation {
    rfiId: string;
    rfiTitle: string;
    sections: RFITemplateSection[];
    suppliers: RFIEvaluationSupplier[];
}

// ---- Clarification ----

export interface RFIClarification {
    clarificationId?: number;
    rfiId: number;
    supplierId: number;
    questionId?: string | number;
    message: string;
    sentAt?: string;
}

// ---- Analytics ----

export interface RFIEventAnalytics {
    rfiId: number;
    totalInvited: number;
    viewed: number;
    inProgress: number;
    submitted: number;
    expired: number;
    avgCompletionPercent: number;
    submissionsByDay: { date: string; count: number }[];
}

export interface RFIBuyerAnalytics {
    totalEvents: number;
    openEvents: number;
    closedEvents: number;
    convertedEvents: number;
    totalSupplierResponses: number;
    avgResponseRate: number;
    recentEvents: RFIEvent[];
}

// ---- Rule Evaluation ----

export interface RFIRuleEvaluation {
    visibleQuestionIds: (string | number)[];
    hiddenQuestionIds: (string | number)[];
}

// ---- API Payloads ----

export interface CreateRFIEventPayload {
    templateId: number;
    title: string;
    description?: string;
    deadline: string;
}

export interface CreateRFITemplatePayload {
    name: string;
    category?: string;
    subcategory?: string;
    regions?: string[];
    regulatoryOverlays?: string[];
    sections: Omit<RFITemplateSection, "sectionId">[];
}

export interface CreateRFIQuestionPayload {
    text: string;
    questionType: QuestionType;
    isMandatory: boolean;
    promoteToRfp: boolean;
    options?: RFIQuestionOption[];
    tableColumns?: RFIQuestionTableColumn[];
    category?: string;
    capabilityTags?: string[];
    complianceTags?: string[];
    helpText?: string;
}

export interface AddRFIInvitationPayload {
    supplierIds?: number[];
    emails?: string[];
}
