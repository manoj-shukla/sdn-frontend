import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────

export interface DashboardStats {
    totalSuppliers: number;
    pendingApprovals: number;
    activeChangeRequests: number;
    unreadMessages: number;
    pendingInvitations: number;
    onboardingInProgress: number;
    lastUpdated: string;
}

export interface SupplierMetrics {
    byStatus: {
        APPROVED: number;
        PENDING: number;
        REJECTED: number;
        DRAFT: number;
    };
    byCountry: Record<string, number>;
    onboardingProgress: {
        complete: number;
        inProgress: number;
        notStarted: number;
    };
    avgOnboardingTime: number;
}

export interface PerformanceMetrics {
    avgApprovalTime: number;
    approvalsByUser: Array<{
        userId: number;
        username: string;
        count: number;
        avgTime: number;
    }>;
    completionRate: number;
    workload: Record<number, number>;
}

export interface TrendData {
    date: string;
    count: number;
    metric: string;
}

export interface Report {
    reportId: string;
    reportType: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    format: 'PDF' | 'EXCEL' | 'CSV';
    createdAt: string;
    completedAt?: string;
    downloadUrl?: string;
    progress: number;
}

export interface ExportJob {
    exportId: string;
    entityType: string;
    format: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    downloadUrl?: string;
    createdAt: string;
}

// ─── State ────────────────────────────────────────────────────────────────

interface AnalyticsState {
    dashboardStats: DashboardStats | null;
    supplierMetrics: SupplierMetrics | null;
    performanceMetrics: PerformanceMetrics | null;
    trends: TrendData[];
    reports: Report[];
    exports: ExportJob[];
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    lastFetch: number | null;

    // Actions
    setDashboardStats: (stats: DashboardStats) => void;
    setSupplierMetrics: (metrics: SupplierMetrics) => void;
    setPerformanceMetrics: (metrics: PerformanceMetrics) => void;
    setTrends: (trends: TrendData[]) => void;
    addTrend: (trend: TrendData) => void;
    setReports: (reports: Report[]) => void;
    addReport: (report: Report) => void;
    updateReport: (reportId: string, updates: Partial<Report>) => void;
    setExports: (exports: ExportJob[]) => void;
    addExport: (exportJob: ExportJob) => void;
    setLoading: (loading: boolean) => void;
    setRefreshing: (refreshing: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    refreshAll: () => Promise<void>;
}

// ─── Store ───────────────────────────────────────────────────────────────

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
    dashboardStats: null,
    supplierMetrics: null,
    performanceMetrics: null,
    trends: [],
    reports: [],
    exports: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastFetch: null,

    setDashboardStats: (stats) => set({ dashboardStats: stats }),

    setSupplierMetrics: (metrics) => set({ supplierMetrics: metrics }),

    setPerformanceMetrics: (metrics) => set({ performanceMetrics: metrics }),

    setTrends: (trends) => set({ trends }),

    addTrend: (trend) => set((state) => ({
        trends: [...state.trends, trend]
    })),

    setReports: (reports) => set({ reports }),

    addReport: (report) => set((state) => ({
        reports: [...state.reports, report]
    })),

    updateReport: (reportId, updates) => set((state) => ({
        reports: state.reports.map(r =>
            r.reportId === reportId ? { ...r, ...updates } : r
        )
    })),

    setExports: (exports) => set({ exports }),

    addExport: (exportJob) => set((state) => ({
        exports: [...state.exports, exportJob]
    })),

    setLoading: (loading) => set({ isLoading: loading }),

    setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),

    refreshAll: async () => {
        set({ isLoading: true, isRefreshing: true });

        try {
            // This would make actual API calls in a real app
            // For now, just update timestamps
            const now = Date.now();

            set({
                lastFetch: now,
                isLoading: false,
                isRefreshing: false
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to refresh analytics',
                isLoading: false,
                isRefreshing: false
            });
        }
    }
}));
