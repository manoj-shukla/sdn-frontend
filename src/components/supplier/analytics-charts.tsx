"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { useState, useEffect } from 'react';
import apiClient from "@/lib/api/client";
import { Loader2 } from "lucide-react";

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#6366f1'];

export function AnalyticsCharts() {
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [performanceStats, setPerformanceStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const [ordersRes, statusRes, performanceRes] = await Promise.all([
                    apiClient.get('/api/analytics/supplier/orders'),
                    apiClient.get('/api/analytics/supplier/status'),
                    apiClient.get('/api/analytics/supplier/performance')
                ]) as any[];

                setPerformanceData((ordersRes || []).map((o: any) => ({
                    month: o.month,
                    orders: o.orders,
                    spend: o.spend,
                    compliance: performanceRes?.complianceScore || 100,
                    fulfillment: performanceRes?.fulfillmentRate || 100
                })));
                setCategoryData((statusRes || []).map((s: any) => ({
                    name: s.name,
                    value: s.value
                })));
                setPerformanceStats(performanceRes);
            } catch (e) {
                console.error("Failed to fetch supplier analytics", e);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center border rounded-lg bg-muted/5 border-dashed">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading enterprise analytics...</p>
                </div>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle>Order Trends</CardTitle>
                    <CardDescription>Monthly order volume and successful fulfillments.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                            <Bar dataKey="orders" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Orders" />
                            <Bar dataKey="spend" fill="#22c55e" radius={[4, 4, 0, 0]} name="Spend ($)" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Compliance Status</CardTitle>
                    <CardDescription>Overall compliance health across categories.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="name"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Enterprise Performance</CardTitle>
                    <CardDescription>Monthly fulfillment and compliance trends.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="compliance"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                dot={{ fill: '#f59e0b', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Compliance (%)"
                            />
                            <Line
                                type="monotone"
                                dataKey="orders"
                                stroke="#0ea5e9"
                                strokeWidth={2}
                                name="Order Volume"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
