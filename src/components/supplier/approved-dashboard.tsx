"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import {
    User,
    Building2,
    CreditCard,
    FileText,
    Bell,
    MapPin,
    LogOut,
    Menu,
    ShieldCheck,
    ClipboardList,
    Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api/client";

type ViewParams = 'analytics' | 'profile' | 'bank' | 'tax' | 'address' | 'contact' | 'notifications';

export function ApprovedSupplierDashboard({ supplierData }: { supplierData: any }) {
    const [stats, setStats] = useState({
        openRfis: 0,
        openRfqs: 0,
        activeOrders: 0,
        complianceScore: 0,
        pendingInvoicesValue: 0,
        expiringDocs: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [analyticsRes, rfiCountRes, rfpCountRes] = await Promise.allSettled([
                    apiClient.get('/api/analytics/supplier/summary'),
                    apiClient.get('/api/rfi/invitations/count'),
                    apiClient.get('/api/rfp/my/invitations/count'),
                ]);

                setStats(prev => {
                    const next = { ...prev };

                    if (analyticsRes.status === 'fulfilled') {
                        const a = analyticsRes.value as any;
                        // Map analytics field names → dashboard state names
                        next.activeOrders    = Number(a?.totalOrders   ?? 0);
                        next.complianceScore = Number(a?.avgCompliance  ?? 0);
                        next.pendingInvoicesValue = Number(a?.totalSpent ?? 0);
                    }
                    if (rfiCountRes.status === 'fulfilled') {
                        next.openRfis = Number((rfiCountRes.value as any)?.count ?? 0);
                    }
                    if (rfpCountRes.status === 'fulfilled') {
                        next.openRfqs = Number((rfpCountRes.value as any)?.count ?? 0);
                    }

                    return next;
                });
            } catch (e) {
                console.error("Failed to load supplier stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const formatCurrency = (val: number | null | undefined) => {
        if (val == null || isNaN(val)) return '₹0';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        return `₹${val.toLocaleString()}`;
    };

    const MetricCard = ({ title, value, subtext, trend, icon: Icon, colorClass, badgeColor }: any) => (
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${colorClass.replace('bg-', 'text-')}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                    {subtext}
                    {trend && <span className="ml-1 text-emerald-600 font-medium">{trend}</span>}
                </p>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-8">
            {/* Header Banner */}
            <div className="bg-slate-900 text-white p-8 rounded-xl relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">
                            {supplierData.legalName} — Supplier Dashboard
                        </h1>
                        <p className="text-blue-100 max-w-2xl text-sm leading-relaxed">
                            You have <span className="font-bold text-white">{stats.openRfis} open RFI{stats.openRfis !== 1 ? "s" : ""}</span> and{" "}
                            <span className="font-bold text-white">{stats.openRfqs} open RFP/RFQ{stats.openRfqs !== 1 ? "s" : ""}</span> awaiting response,{" "}
                            <span className="font-bold text-white">{stats.activeOrders} active orders</span>,
                            and your compliance score is <span className="font-bold text-white">{stats.complianceScore}%</span>.
                            Keep up the great work!
                        </p>
                    </div>

                    <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[140px]">
                        <div className="text-4xl font-bold text-emerald-400">{stats.complianceScore}</div>
                        <div className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold mt-1">Supplier Score</div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link href="/supplier/documents">
                            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm w-full">
                                <ShieldCheck className="mr-2 h-4 w-4" /> Upload Document
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Metric Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Link href="/supplier/rfi">
                    <MetricCard
                        title="Open RFIs"
                        value={stats.openRfis}
                        subtext="Pending response"
                        icon={ClipboardList}
                        colorClass="bg-indigo-100"
                    />
                </Link>
                <Link href="/supplier/rfp">
                    <MetricCard
                        title="Open RFPs"
                        value={stats.openRfqs}
                        subtext="Awaiting quote"
                        icon={FileText}
                        colorClass="bg-blue-100"
                    />
                </Link>
                <Link href="/supplier/awards">
                    <MetricCard
                        title="Awards"
                        value="View"
                        subtext="Awarded contracts"
                        icon={Trophy}
                        colorClass="bg-violet-100"
                    />
                </Link>
                <MetricCard
                    title="Active Orders"
                    value={stats.activeOrders}
                    subtext="In progress"
                    icon={Building2}
                    colorClass="bg-emerald-100"
                />
                <MetricCard
                    title="Invoices"
                    value={formatCurrency(stats.pendingInvoicesValue)}
                    subtext="Pending payment"
                    icon={CreditCard}
                    colorClass="bg-amber-100"
                />
                <MetricCard
                    title="Docs Expiring"
                    value={stats.expiringDocs}
                    subtext="within 30 days"
                    icon={Bell}
                    colorClass="bg-rose-100"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Action Items & Charts */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-none shadow-sm h-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-base">Action Required</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                    {(stats.openRfis + stats.openRfqs) > 0
                                        ? `${stats.openRfis + stats.openRfqs} event${stats.openRfis + stats.openRfqs !== 1 ? 's' : ''} awaiting your response`
                                        : 'No pending actions at the moment'}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* RFI row */}
                            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                        <ClipboardList className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Open RFIs</p>
                                        <p className="text-xs text-muted-foreground">Information requests pending response</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "text-2xl font-bold",
                                        stats.openRfis > 0 ? "text-indigo-600" : "text-slate-400"
                                    )}>
                                        {stats.openRfis}
                                    </span>
                                    <Link href="/supplier/rfi">
                                        <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                            View →
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            {/* RFP row */}
                            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Open RFPs / RFQs</p>
                                        <p className="text-xs text-muted-foreground">Sourcing events awaiting your quote</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "text-2xl font-bold",
                                        stats.openRfqs > 0 ? "text-blue-600" : "text-slate-400"
                                    )}>
                                        {stats.openRfqs}
                                    </span>
                                    <Link href="/supplier/rfp">
                                        <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                                            View →
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column: Compliance & Profile */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold">Compliance Checklist</CardTitle>
                                <Link href="/supplier/documents">
                                    <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold text-blue-600">Manage →</Button>
                                </Link>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.complianceScore}%` }}></div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 text-right">Profile completion: {stats.complianceScore}%</p>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${supplierData.taxId ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <ShieldCheck className="h-3 w-3" />
                                </div>
                                <span className={`text-sm ${supplierData.taxId ? 'text-slate-600 line-through decoration-slate-400' : 'text-slate-500'}`}>
                                    {supplierData.country === 'India' ? 'PAN Card' : 'Tax ID'}
                                </span>
                            </div>
                            {supplierData.country === 'India' && (
                                <div className="flex items-center gap-3">
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center ${supplierData.gstin ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <ShieldCheck className="h-3 w-3" />
                                    </div>
                                    <span className={`text-sm ${supplierData.gstin ? 'text-slate-600 line-through decoration-slate-400' : 'text-slate-500'}`}>GST Registration</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${supplierData.accountNumber ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        <Bell className="h-3 w-3" />
                                    </div>
                                    <span className={`text-sm font-medium ${supplierData.accountNumber ? 'text-slate-600' : 'text-slate-700'}`}>
                                        {supplierData.accountNumber ? 'Bank Details Verified' : 'Bank Details Pending'}
                                    </span>
                                </div>
                                {!supplierData.accountNumber && (
                                    <Link href="/supplier/bank">
                                        <span className="text-[10px] font-bold text-blue-600 hover:underline">Update →</span>
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Quick Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase">Type</div>
                                        <div className="text-sm font-semibold">{supplierData.businessType}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-4 w-4 text-slate-400" />
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase">Country</div>
                                        <div className="text-sm font-semibold">{supplierData.country}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

