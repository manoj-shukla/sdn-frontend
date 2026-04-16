"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminRole } from "../context/AdminRoleContext";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import {
    Loader2,
    Users,
    Building2,
    CreditCard,
    Activity,
    UserPlus
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

const COLORS = ['#0f172a', '#0ea5e9', '#3b82f6', '#94a3b8'];

export default function AdminDashboardPage() {
    const { canCreateAdmins } = useAdminRole();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalBuyers: 0,
        pendingReviews: 0,
        totalSpend: 0,
        complianceRate: "0%",
        systemHealth: "100%"
    });
    const [growthData, setGrowthData] = useState<any[]>([]);
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // Use allSettled so a single failing endpoint doesn't blank the whole dashboard
                const [growthResult, distResult, summaryResult, complianceResult] = await Promise.allSettled([
                    apiClient.get('/api/analytics/admin/growth'),
                    apiClient.get('/api/analytics/admin/distribution'),
                    apiClient.get('/api/analytics/admin/summary'),
                    apiClient.get('/api/analytics/admin/compliance')
                ]);

                const growthRes = growthResult.status === 'fulfilled' ? growthResult.value as any : [];
                const distRes = distResult.status === 'fulfilled' ? distResult.value as any : [];
                const summaryRes = summaryResult.status === 'fulfilled' ? summaryResult.value as any : {};
                const complianceRes = complianceResult.status === 'fulfilled' ? complianceResult.value as any : {};

                // Log any individual failures for diagnosis
                [growthResult, distResult, summaryResult, complianceResult].forEach((r, i) => {
                    if (r.status === 'rejected') {
                        const names = ['growth', 'distribution', 'summary', 'compliance'];
                        console.error(`[AdminDashboard] analytics/${names[i]} failed:`, r.reason);
                    }
                });

                setStats(prev => ({
                    ...prev,
                    totalUsers: summaryRes.totalUsers ?? prev.totalUsers,
                    totalBuyers: summaryRes.totalBuyers ?? prev.totalBuyers,
                    pendingReviews: summaryRes.pendingReviews ?? prev.pendingReviews,
                    totalSpend: summaryRes.totalSpend ?? prev.totalSpend,
                    systemHealth: summaryRes.systemHealth ?? prev.systemHealth,
                    complianceRate: complianceRes?.complianceRate || "0%"
                }));

                if (Array.isArray(growthRes)) setGrowthData(growthRes);
                if (Array.isArray(distRes)) setDistributionData(distRes);

            } catch (error: any) {
                console.error("Error loading admin dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const formatCurrency = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        return `₹${val.toLocaleString()}`;
    };

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

    const MetricCard = ({ title, value, subtext, trend, icon: Icon, colorClass }: any) => (
        <Card className="border-none shadow-sm h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">{title}</CardTitle>
                <div className={`h-8 w-8 rounded-md flex items-center justify-center ${colorClass}`}>
                    <Icon className={`h-4 w-4 ${colorClass.replace('bg-', 'text-').replace('100', '600')}`} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="flex items-center gap-1 text-[11px]">
                        {trend && (
                            <span className={`font-bold flex items-center ${trend.startsWith('↑') ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {trend}
                            </span>
                        )}
                        <span className="text-muted-foreground">{subtext}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <div className="flex h-[600px] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading super admin insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 min-h-screen bg-slate-50/50 p-6">
            {/* Header */}
            <div className="bg-slate-900 text-white p-8 rounded-xl relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">
                            Super Admin Command Center
                        </h1>
                        <p className="text-indigo-100 max-w-2xl text-sm leading-relaxed">
                            Overview of platform health, user growth, and compliance metrics.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {canCreateAdmins && (
                            <Button className="bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-lg" asChild>
                                <Link href="/admin/users">
                                    <UserPlus className="mr-2 h-4 w-4" /> Manage Admins
                                </Link>
                            </Button>
                        )}

                    </div>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatusTile
                    title="Total Users"
                    count={stats.totalUsers}
                    icon={Users}
                    colorClass="bg-blue-100"
                    badgeColor="bg-blue-600"
                />
                <StatusTile
                    title="Total Buyers"
                    count={stats.totalBuyers}
                    icon={Building2}
                    colorClass="bg-emerald-100"
                    badgeColor="bg-emerald-600"
                />

                <StatusTile
                    title="System Health"
                    count="OK"
                    icon={Activity}
                    colorClass="bg-indigo-100"
                    badgeColor="bg-indigo-600"
                />
            </div>



            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Platform Growth</CardTitle>
                        <CardDescription>User acquisition over the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={growthData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f1f5f9' }}
                                />
                                <Bar dataKey="buyers" name="Buyers" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="suppliers" name="Suppliers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>User Distribution</CardTitle>
                        <CardDescription>Breakdown by role</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {distributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
