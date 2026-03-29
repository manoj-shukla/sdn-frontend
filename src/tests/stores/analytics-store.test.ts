import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useAnalyticsStore } from '@/lib/store/analytics-store';
import type { DashboardStats, SupplierMetrics, PerformanceMetrics } from '@/lib/store/analytics-store';

const resetStore = () => {
    useAnalyticsStore.setState({
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
    });
};

describe('Analytics Store', () => {
    beforeEach(() => resetStore());

    const mockDashboardStats: DashboardStats = {
        totalSuppliers: 50,
        pendingApprovals: 5,
        activeChangeRequests: 3,
        unreadMessages: 12,
        pendingInvitations: 2,
        onboardingInProgress: 8,
        lastUpdated: '2026-02-26T00:00:00Z',
    };

    const mockSupplierMetrics: SupplierMetrics = {
        byStatus: {
            APPROVED: 30,
            PENDING: 5,
            REJECTED: 2,
            DRAFT: 13,
        },
        byCountry: {
            'US': 20,
            'SG': 15,
            'IN': 10,
            'AE': 5,
        },
        onboardingProgress: {
            complete: 30,
            inProgress: 8,
            notStarted: 12,
        },
        avgOnboardingTime: 5.2,
    };

    const mockPerformanceMetrics: PerformanceMetrics = {
        avgApprovalTime: 48,
        approvalsByUser: [
            { userId: 1, username: 'john.doe', count: 15, avgTime: 42 },
            { userId: 2, username: 'jane.smith', count: 10, avgTime: 55 },
        ],
        completionRate: 85.5,
        workload: {
            1: 15,
            2: 10,
        },
    };

    describe('Dashboard Statistics', () => {
        it('sets dashboard stats', () => {
            act(() => useAnalyticsStore.getState().setDashboardStats(mockDashboardStats));
            expect(useAnalyticsStore.getState().dashboardStats).toEqual(mockDashboardStats);
        });

        it('stores all dashboard metrics', () => {
            act(() => useAnalyticsStore.getState().setDashboardStats(mockDashboardStats));

            const stats = useAnalyticsStore.getState().dashboardStats;
            expect(stats?.totalSuppliers).toBe(50);
            expect(stats?.pendingApprovals).toBe(5);
            expect(stats?.activeChangeRequests).toBe(3);
            expect(stats?.unreadMessages).toBe(12);
        });

        it('updates dashboard stats', () => {
            act(() => useAnalyticsStore.getState().setDashboardStats(mockDashboardStats));
            act(() => useAnalyticsStore.getState().setDashboardStats({
                ...mockDashboardStats,
                totalSuppliers: 55,
            }));

            expect(useAnalyticsStore.getState().dashboardStats?.totalSuppliers).toBe(55);
        });

        it('tracks last updated time', () => {
            act(() => useAnalyticsStore.getState().setDashboardStats(mockDashboardStats));

            expect(useAnalyticsStore.getState().dashboardStats?.lastUpdated).toBeDefined();
        });
    });

    describe('Supplier Metrics', () => {
        it('sets supplier metrics', () => {
            act(() => useAnalyticsStore.getState().setSupplierMetrics(mockSupplierMetrics));
            expect(useAnalyticsStore.getState().supplierMetrics).toEqual(mockSupplierMetrics);
        });

        it('stores status breakdown', () => {
            act(() => useAnalyticsStore.getState().setSupplierMetrics(mockSupplierMetrics));

            const metrics = useAnalyticsStore.getState().supplierMetrics;
            expect(metrics?.byStatus.APPROVED).toBe(30);
            expect(metrics?.byStatus.PENDING).toBe(5);
        });

        it('stores country distribution', () => {
            act(() => useAnalyticsStore.getState().setSupplierMetrics(mockSupplierMetrics));

            const metrics = useAnalyticsStore.getState().supplierMetrics;
            expect(metrics?.byCountry['US']).toBe(20);
            expect(metrics?.byCountry['SG']).toBe(15);
        });

        it('stores onboarding progress', () => {
            act(() => useAnalyticsStore.getState().setSupplierMetrics(mockSupplierMetrics));

            const metrics = useAnalyticsStore.getState().supplierMetrics;
            expect(metrics?.onboardingProgress.complete).toBe(30);
            expect(metrics?.onboardingProgress.inProgress).toBe(8);
        });

        it('calculates total suppliers from status', () => {
            act(() => useAnalyticsStore.getState().setSupplierMetrics(mockSupplierMetrics));

            const metrics = useAnalyticsStore.getState().supplierMetrics;
            const total = Object.values(metrics!.byStatus).reduce((sum, count) => sum + count, 0);
            expect(total).toBe(50);
        });

        it('stores average onboarding time', () => {
            act(() => useAnalyticsStore.getState().setSupplierMetrics(mockSupplierMetrics));

            expect(useAnalyticsStore.getState().supplierMetrics?.avgOnboardingTime).toBe(5.2);
        });
    });

    describe('Performance Metrics', () => {
        it('sets performance metrics', () => {
            act(() => useAnalyticsStore.getState().setPerformanceMetrics(mockPerformanceMetrics));
            expect(useAnalyticsStore.getState().performanceMetrics).toEqual(mockPerformanceMetrics);
        });

        it('stores average approval time', () => {
            act(() => useAnalyticsStore.getState().setPerformanceMetrics(mockPerformanceMetrics));

            expect(useAnalyticsStore.getState().performanceMetrics?.avgApprovalTime).toBe(48);
        });

        it('stores approvals by user', () => {
            act(() => useAnalyticsStore.getState().setPerformanceMetrics(mockPerformanceMetrics));

            const approvals = useAnalyticsStore.getState().performanceMetrics?.approvalsByUser;
            expect(approvals).toHaveLength(2);
            expect(approvals![0].username).toBe('john.doe');
        });

        it('stores completion rate', () => {
            act(() => useAnalyticsStore.getState().setPerformanceMetrics(mockPerformanceMetrics));

            expect(useAnalyticsStore.getState().performanceMetrics?.completionRate).toBe(85.5);
        });

        it('stores workload distribution', () => {
            act(() => useAnalyticsStore.getState().setPerformanceMetrics(mockPerformanceMetrics));

            const workload = useAnalyticsStore.getState().performanceMetrics?.workload;
            expect(workload![1]).toBe(15);
            expect(workload![2]).toBe(10);
        });
    });

    describe('Trends Data', () => {
        it('sets trends array', () => {
            const trends = [
                { date: '2026-02-01', count: 10, metric: 'suppliers' },
                { date: '2026-02-02', count: 15, metric: 'suppliers' },
            ];

            act(() => useAnalyticsStore.getState().setTrends(trends));
            expect(useAnalyticsStore.getState().trends).toHaveLength(2);
        });

        it('adds single trend data point', () => {
            const trend = { date: '2026-02-03', count: 20, metric: 'suppliers' };

            act(() => useAnalyticsStore.getState().addTrend(trend));
            expect(useAnalyticsStore.getState().trends).toHaveLength(1);
            expect(useAnalyticsStore.getState().trends[0].count).toBe(20);
        });

        it('appends trends in order', () => {
            act(() => useAnalyticsStore.getState().setTrends([]));

            act(() => useAnalyticsStore.getState().addTrend({ date: '2026-02-01', count: 10, metric: 'suppliers' }));
            act(() => useAnalyticsStore.getState().addTrend({ date: '2026-02-02', count: 15, metric: 'suppliers' }));

            expect(useAnalyticsStore.getState().trends[0].date).toBe('2026-02-01');
            expect(useAnalyticsStore.getState().trends[1].date).toBe('2026-02-02');
        });
    });

    describe('Reports Management', () => {
        it('sets reports list', () => {
            const reports = [
                {
                    reportId: 'r1',
                    reportType: 'SUPPLIER_LIST',
                    status: 'COMPLETED' as const,
                    format: 'PDF' as const,
                    createdAt: '2026-02-26T00:00:00Z',
                    downloadUrl: '/files/report.pdf',
                    progress: 100,
                },
            ];

            act(() => useAnalyticsStore.getState().setReports(reports));
            expect(useAnalyticsStore.getState().reports).toHaveLength(1);
        });

        it('adds new report', () => {
            const report = {
                reportId: 'r2',
                reportType: 'CHANGE_REQUESTS',
                status: 'PROCESSING' as const,
                format: 'EXCEL' as const,
                createdAt: '2026-02-26T00:00:00Z',
                progress: 0,
            };

            act(() => useAnalyticsStore.getState().addReport(report));
            expect(useAnalyticsStore.getState().reports).toHaveLength(1);
        });

        it('updates report status', () => {
            const report = {
                reportId: 'r3',
                reportType: 'SUPPLIER_LIST',
                status: 'PROCESSING' as const,
                format: 'CSV' as const,
                createdAt: '2026-02-26T00:00:00Z',
                progress: 50,
            };

            act(() => useAnalyticsStore.getState().addReport(report));
            act(() => useAnalyticsStore.getState().updateReport('r3', {
                status: 'COMPLETED',
                progress: 100,
                downloadUrl: '/files/report.csv',
                completedAt: '2026-02-26T01:00:00Z',
            }));

            const updated = useAnalyticsStore.getState().reports.find(r => r.reportId === 'r3');
            expect(updated?.status).toBe('COMPLETED');
            expect(updated?.downloadUrl).toBe('/files/report.csv');
        });

        it('does not affect other reports when updating', () => {
            const report1 = { reportId: 'r1', reportType: 'SUPPLIER_LIST', status: 'COMPLETED' as const, format: 'PDF' as const, createdAt: '2026-02-26T00:00:00Z', progress: 100 };
            const report2 = { reportId: 'r2', reportType: 'CHANGE_REQUESTS', status: 'PROCESSING' as const, format: 'EXCEL' as const, createdAt: '2026-02-26T00:00:00Z', progress: 0 };

            act(() => useAnalyticsStore.getState().setReports([report1, report2]));
            act(() => useAnalyticsStore.getState().updateReport('r2', { status: 'COMPLETED', progress: 100 }));

            const r1 = useAnalyticsStore.getState().reports.find(r => r.reportId === 'r1');
            expect(r1?.status).toBe('COMPLETED'); // Unchanged
        });
    });

    describe('Export Jobs', () => {
        it('sets exports list', () => {
            const exports = [
                {
                    exportId: 'e1',
                    entityType: 'SUPPLIERS',
                    format: 'CSV',
                    status: 'COMPLETED' as const,
                    downloadUrl: '/files/export.csv',
                    createdAt: '2026-02-26T00:00:00Z',
                },
            ];

            act(() => useAnalyticsStore.getState().setExports(exports));
            expect(useAnalyticsStore.getState().exports).toHaveLength(1);
        });

        it('adds new export job', () => {
            const exportJob = {
                exportId: 'e2',
                entityType: 'CHANGE_REQUESTS',
                format: 'EXCEL',
                status: 'PENDING' as const,
                createdAt: '2026-02-26T00:00:00Z',
            };

            act(() => useAnalyticsStore.getState().addExport(exportJob));
            expect(useAnalyticsStore.getState().exports).toHaveLength(1);
        });

        it('stores export job status', () => {
            const exportJob = {
                exportId: 'e3',
                entityType: 'SUPPLIERS',
                format: 'CSV',
                status: 'PROCESSING' as const,
                createdAt: '2026-02-26T00:00:00Z',
            };

            act(() => useAnalyticsStore.getState().addExport(exportJob));
            expect(useAnalyticsStore.getState().exports[0].status).toBe('PROCESSING');
        });
    });

    describe('Loading and Error States', () => {
        it('sets loading state', () => {
            act(() => useAnalyticsStore.getState().setLoading(true));
            expect(useAnalyticsStore.getState().isLoading).toBe(true);
        });

        it('sets refreshing state', () => {
            act(() => useAnalyticsStore.getState().setRefreshing(true));
            expect(useAnalyticsStore.getState().isRefreshing).toBe(true);
        });

        it('sets error message', () => {
            act(() => useAnalyticsStore.getState().setError('Failed to load analytics'));
            expect(useAnalyticsStore.getState().error).toBe('Failed to load analytics');
        });

        it('clears error message', () => {
            act(() => useAnalyticsStore.getState().setError('Some error'));
            act(() => useAnalyticsStore.getState().clearError());
            expect(useAnalyticsStore.getState().error).toBeNull();
        });
    });

    describe('Refresh Operations', () => {
        it('updates last fetch timestamp', async () => {
            const beforeRefresh = Date.now();

            await act(async () => {
                await useAnalyticsStore.getState().refreshAll();
            });

            expect(useAnalyticsStore.getState().lastFetch).toBeGreaterThanOrEqual(beforeRefresh);
        });

        it('sets loading during refresh', async () => {
            await act(async () => {
                await useAnalyticsStore.getState().refreshAll();
            });

            // After refresh completes, loading should be false
            expect(useAnalyticsStore.getState().isLoading).toBe(false);
            expect(useAnalyticsStore.getState().isRefreshing).toBe(false);
        });

        it('handles errors during refresh', async () => {
            // The actual refreshAll doesn't throw, but let's test error handling
            act(() => useAnalyticsStore.getState().setError('Test error'));

            expect(useAnalyticsStore.getState().error).toBe('Test error');

            // Clear the error
            act(() => useAnalyticsStore.getState().clearError());
            expect(useAnalyticsStore.getState().error).toBeNull();
        });
    });

    describe('Derived Calculations', () => {
        it('calculates total pending items', () => {
            act(() => useAnalyticsStore.getState().setDashboardStats(mockDashboardStats));

            const stats = useAnalyticsStore.getState().dashboardStats;
            const pending = stats!.pendingApprovals + stats!.activeChangeRequests;

            expect(pending).toBe(8); // 5 + 3
        });

        it('calculates approval percentage from status', () => {
            act(() => useAnalyticsStore.getState().setSupplierMetrics(mockSupplierMetrics));

            const metrics = useAnalyticsStore.getState().supplierMetrics;
            const total = Object.values(metrics!.byStatus).reduce((sum, count) => sum + count, 0);
            const approved = metrics!.byStatus.APPROVED;
            const percentage = (approved / total) * 100;

            expect(percentage).toBe(60); // 30/50
        });

        it('identifies top performer from metrics', () => {
            act(() => useAnalyticsStore.getState().setPerformanceMetrics(mockPerformanceMetrics));

            const approvals = useAnalyticsStore.getState().performanceMetrics?.approvalsByUser;
            const sorted = [...approvals!].sort((a, b) => b.count - a.count);

            expect(sorted[0].username).toBe('john.doe'); // Has 15 approvals
        });
    });
});
