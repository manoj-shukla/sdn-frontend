"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBuyerRole } from "../context/BuyerRoleContext";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import {
    Loader2,
    Users,
    ClipboardList,
    AlertTriangle,
    UserCheck,
    TrendingUp,
    FileText,
    ArrowUpRight,
    Search,
    ChevronRight,
    Building2
} from "lucide-react";

// Mock sparkline data
const sparklineData = [
    { value: 40 }, { value: 30 }, { value: 45 }, { value: 50 }, { value: 42 }, { value: 48 }, { value: 55 }
];

const scoreSparklineData = [
    { value: 80 }, { value: 82 }, { value: 81 }, { value: 83 }, { value: 84 }, { value: 83.4 }
];

const onboardingSparklineData = [
    { value: 10 }, { value: 15 }, { value: 8 }, { value: 12 }, { value: 14 }, { value: 7 }, { value: 4 }
];

const COLORS = {
    active: '#3b82f6',
    pending: '#f59e0b',
    risk: '#ef4444',
    success: '#22c55e',
    neutral: '#94a3b8'
};

export default function BuyerDashboardPage() {
    const { canManageUsers, canManageCircles } = useBuyerRole();
    const [stats, setStats] = useState({
        activeSuppliers: 142,
        pendingOnboarding: 4,
        openRfqs: 7,
        riskAlerts: 3,
        portalUsers: 28,
        avgScore: 83.4,
        onboardingOverdue: 3
    });
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const meRes = await apiClient.get('/auth/me') as any;
                const user = meRes;

                if (user && user.role === 'BUYER') {
                    const [suppliersRes, invitationsRes, summaryRes] = await Promise.all([
                        apiClient.get('/api/suppliers'),
                        apiClient.get(`/api/invitations/buyer/${user.buyerId}`),
                        apiClient.get('/api/analytics/buyer/summary')
                    ]) as any[];

                    const suppliersData = suppliersRes.content || (Array.isArray(suppliersRes) ? suppliersRes : []);
                    setSuppliers(suppliersData.slice(0, 5)); // Just take top 5 for the dashboard directory

                    const activeCount = suppliersData.filter((s: any) => s.isActive).length;
                    const invitations = Array.isArray(invitationsRes) ? invitationsRes : [];

                    const summary = summaryRes || {};

                    setStats(prev => ({
                        ...prev,
                        activeSuppliers: summary.activeSuppliers ?? activeCount ?? prev.activeSuppliers,
                        pendingOnboarding: summary.pendingOnboarding ?? prev.pendingOnboarding,
                        openRfqs: summary.openRfqs ?? prev.openRfqs,
                        riskAlerts: summary.riskAlerts ?? prev.riskAlerts,
                        portalUsers: summary.portalUsers ?? prev.portalUsers
                    }));
                }
            } catch (error: any) {
                console.error("Error loading buyer dashboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const StatusTile = ({ title, count, icon: Icon, colorClass, badgeColor }: any) => (
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 mb-2`}>
                    <Icon className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                <div className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${badgeColor}`}>
                    {count}
                </div>
            </CardContent>
        </Card>
    );

    const MetricCard = ({ title, value, subtext, trend, data, color }: any) => (
        <Card className="border-none shadow-sm h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">{title}</CardTitle>
                <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-1 mb-4">
                    <div className="text-3xl font-bold">{value}</div>
                    <div className="flex items-center gap-1 text-[11px]">
                        <span className={`font-bold flex items-center ${trend.startsWith('↑') ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {trend}
                        </span>
                        <span className="text-muted-foreground">{subtext}</span>
                    </div>
                </div>
                <div className="h-12 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#gradient-${color})`}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <div className="flex h-[600px] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading procurement intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 p-4 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Buyer Command Center</h1>
                    <p className="text-muted-foreground">Strategic procurement insights and supplier management</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative hidden lg:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            placeholder="Quick find supplier..."
                            className="bg-white border rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 transition-all"
                        />
                    </div>
                    {canManageCircles && (
                        <Button variant="outline" className="rounded-full shadow-sm bg-white" asChild>
                            <Link href="/buyer/circles">Circles</Link>
                        </Button>
                    )}
                    <Button className="rounded-full shadow-md px-6" asChild>
                        <Link href="/buyer/suppliers">Invite Supplier</Link>
                    </Button>
                </div>
            </div>

            {/* Row 1: Quick Status Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatusTile
                    title="Active Suppliers"
                    count={stats.activeSuppliers}
                    icon={Building2}
                    colorClass="bg-blue-100"
                    badgeColor="bg-blue-600"
                />
                <StatusTile
                    title="Pending Onboarding"
                    count={stats.pendingOnboarding}
                    icon={UserCheck}
                    colorClass="bg-orange-100"
                    badgeColor="bg-orange-500"
                />
                <StatusTile
                    title="Open RFQ / RFP"
                    count={stats.openRfqs}
                    icon={ClipboardList}
                    colorClass="bg-indigo-100"
                    badgeColor="bg-indigo-600"
                />
                <StatusTile
                    title="Risk Alerts"
                    count={stats.riskAlerts}
                    icon={AlertTriangle}
                    colorClass="bg-rose-100"
                    badgeColor="bg-rose-600"
                />
                <StatusTile
                    title="Portal Users"
                    count={stats.portalUsers}
                    icon={Users}
                    colorClass="bg-emerald-100"
                    badgeColor="bg-emerald-600"
                />
            </div>

            {/* Row 2: Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Suppliers"
                    value={stats.activeSuppliers + stats.pendingOnboarding}
                    subtext="new this quarter"
                    trend="↑ 12"
                    data={sparklineData}
                    color="#3b82f6"
                />
                <MetricCard
                    title="Avg Supplier Score"
                    value={stats.avgScore.toFixed(1)}
                    subtext="vs last month"
                    trend="↑ 2.1 pts"
                    data={scoreSparklineData}
                    color="#22c55e"
                />
                <MetricCard
                    title="Active RFQs / RFPs"
                    value={stats.openRfqs}
                    subtext="closing today"
                    trend="↓ 2"
                    data={sparklineData.map(d => ({ value: d.value / 4 }))}
                    color="#6366f1"
                />
                <MetricCard
                    title="Onboarding Pipeline"
                    value={stats.pendingOnboarding}
                    subtext="review needed"
                    trend="↑ 3 overdue"
                    data={onboardingSparklineData}
                    color="#f59e0b"
                />
            </div>

            {/* Row 3: Supplier Directory & Details */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                        <div>
                            <CardTitle className="text-xl">Supplier Directory</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.activeSuppliers} active • {stats.pendingOnboarding} pending onboarding
                            </p>
                        </div>
                        <Button variant="ghost" className="text-primary font-bold text-xs flex items-center gap-1 group" asChild>
                            <Link href="/buyer/suppliers">
                                All Suppliers <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[300px] text-[11px] uppercase tracking-wider font-bold">Supplier</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">Category</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">Score</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">Risk</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-bold text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suppliers.length > 0 ? suppliers.map((s, idx) => (
                                    <TableRow key={s.supplierId || idx} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm`} style={{ backgroundColor: s.color || `hsl(${idx * 70}, 70%, 50%)` }}>
                                                    {s.legalName?.substring(0, 2).toUpperCase() || 'TS'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{s.legalName}</span>
                                                    <span className="text-[11px] text-muted-foreground">{s.internalCode || `SDN-SUP-${idx.toString().padStart(3, '0')}`}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-full text-[10px] px-3 font-medium">
                                                {s.businessType || 'IT Services'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-sm ${idx % 3 === 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{94 - (idx * 6)}</span>
                                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${idx % 3 === 0 ? 'bg-emerald-500' : idx % 3 === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${94 - (idx * 6)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`h-2 w-2 rounded-full ${idx % 3 === 2 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-tighter">
                                                    {idx % 3 === 2 ? 'Medium' : 'Low'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5 font-bold text-[11px] text-blue-600">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                                {s.approvalStatus || 'ACTIVE'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No suppliers found. Active suppliers will appear here.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
