import apiClient from "./client";

export interface Certification {
    certid: number; supplierid: number; name: string; category?: string;
    issuingbody?: string; certnumber?: string; issuedate?: string; expirydate?: string;
    status: string; documenturl?: string; notes?: string; createdat: string;
}

export interface Scorecard {
    perfid: number; period?: string; deliveryscore?: number; qualityscore?: number;
    costscore?: number; responsivenessscore?: number; overallscore?: number;
    ontimedeliverypct?: number; createdat: string;
}

export interface PerformanceSummary {
    kpis: {
        totalOrders: number; completedOrders: number; openOrders: number; completionRate: number;
        ordersValue: number; invoicesPaid: number; invoicesTotal: number; outstandingAmount: number;
        reviewCount: number; certifications: { total: number; active: number; expiring: number; expired: number };
        latestOverallScore: number | null;
    };
    scorecards: Scorecard[];
}

export const listCerts = () => apiClient.get("/api/certifications") as Promise<Certification[]>;
export const createCert = (body: Partial<Certification>) => apiClient.post("/api/certifications", body) as Promise<Certification>;
export const updateCert = (id: number, body: Partial<Certification>) => apiClient.put(`/api/certifications/${id}`, body) as Promise<Certification>;
export const deleteCert = (id: number) => apiClient.delete(`/api/certifications/${id}`);

export const getMyPerformance = () => apiClient.get("/api/performance/me") as Promise<PerformanceSummary>;

// ── Buyer side ──
export const getSupplierPerformance = (supplierId: number) =>
    apiClient.get(`/api/performance/${supplierId}`) as Promise<PerformanceSummary>;
export const addScorecard = (supplierId: number, body: any) =>
    apiClient.post(`/api/performance/${supplierId}/scorecard`, body);

export interface ComplianceRow {
    supplierId: number; name: string; country: string; riskLevel: string;
    approvalStatus?: string; documentStatus?: string;
    documents: { total: number; pending: number; expired: number };
    certifications: { total: number; expired: number; expiring: number };
    issues: string[]; compliance: "COMPLIANT" | "REVIEW" | "AT_RISK";
}
export interface ComplianceOverview {
    kpis: { totalSuppliers: number; highRisk: number; mediumRisk: number; atRisk: number; needsReview: number; compliant: number; pendingVerifications: number };
    suppliers: ComplianceRow[];
}
export const getComplianceOverview = () => apiClient.get("/api/compliance/overview") as Promise<ComplianceOverview>;
