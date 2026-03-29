"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useSupplierOnboardingStore, OnboardingSection } from "@/lib/store/supplier-onboarding-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Circle, AlertCircle, FileText, Building2, Landmark, ShieldCheck, TrendingUp, BarChart3, Loader2 } from "lucide-react";

export function DashboardStats() {
    const { completedSections, documents, companyDetails } = useSupplierOnboardingStore();

    const [performance, setPerformance] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPerformance = async () => {
            try {
                const res = await apiClient.get('/api/analytics/supplier/performance');
                setPerformance(res);
            } catch (e) {
                console.error("Failed to fetch performance stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchPerformance();
    }, []);

    // Calculate profile completion
    const sections: OnboardingSection[] = ['company', 'address', 'contact', 'tax', 'bank', 'documents'];
    const completedCount = sections.filter(s => completedSections[s]).length;
    const completionPercentage = Math.round((completedCount / sections.length) * 100);

    // Calculate document health
    const totalDocs = documents.length;
    const uploadedDocs = documents.filter(d => d.status === 'UPLOADED' || d.status === 'VERIFIED').length;
    const verifiedDocs = documents.filter(d => d.status === 'VERIFIED').length;
    const rejectedDocs = documents.filter(d => d.status === 'REJECTED').length;

    console.log("[DashboardStats] Documents State:", documents.map(d => ({ name: d.name, status: d.status })));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Profile Completion
                    </CardTitle>
                    <CardDescription>Overall progress of your supplier onboarding</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold">{completionPercentage}%</span>
                        <span className="text-sm text-muted-foreground">{completedCount} of {sections.length} tasks</span>
                    </div>
                    {/* Custom Progress Bar */}
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500 ease-in-out"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>

                    <div className="mt-6 space-y-3">
                        {sections.map(section => (
                            <div key={section} className="flex items-center justify-between text-sm">
                                <span className="capitalize text-muted-foreground">{section} Details</span>
                                {completedSections[section as OnboardingSection] ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground/30" />
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        Document Health
                    </CardTitle>
                    <CardDescription>Status of your submitted compliance documents</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-center">
                            <div className="text-2xl font-bold">{uploadedDocs}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Uploaded</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                            <div className="text-2xl font-bold text-green-700">{verifiedDocs}</div>
                            <div className="text-[10px] uppercase font-bold text-green-600 tracking-wider">Verified</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                            <div className="text-2xl font-bold text-red-700">{rejectedDocs}</div>
                            <div className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Rejected</div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-center">
                            <div className="text-2xl font-bold text-amber-700">{totalDocs - uploadedDocs}</div>
                            <div className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Pending</div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                            * Ensuring all documents are verified is critical for full approval.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-indigo-500" />
                        Quick Summary
                    </CardTitle>
                    <CardDescription>Active business details overview</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold truncate max-w-[150px]">{companyDetails.legalName || 'Not Set'}</div>
                                <div className="text-xs text-muted-foreground">Legal Entity Name</div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Landmark className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold truncate max-w-[150px]">{companyDetails.businessType || 'General'}</div>
                                <div className="text-xs text-muted-foreground">Business Structure</div>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-border/50">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Registration Country:</span>
                                <span className="font-medium text-foreground">{companyDetails.country || 'Not Set'}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Real Enterprise Performance Metrics */}
            <Card className="md:col-span-2 lg:col-span-3 bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                        <TrendingUp className="h-5 w-5" />
                        Enterprise Performance Overview
                    </CardTitle>
                    <CardDescription>Live metrics tracked from orders and compliance records.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex flex-col gap-1 p-4 bg-background rounded-lg border border-border/50">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Audit Readiness
                            </span>
                            <div className="text-2xl font-bold">{loading ? <Loader2 className="animate-spin h-5 w-5" /> : `${performance?.complianceScore || 0}%`}</div>
                            <div className="text-[10px] text-green-600 font-medium">Verified Compliance</div>
                        </div>
                        <div className="flex flex-col gap-1 p-4 bg-background rounded-lg border border-border/50">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" /> Fulfillment Rate
                            </span>
                            <div className="text-2xl font-bold">{loading ? <Loader2 className="animate-spin h-5 w-5" /> : `${performance?.fulfillmentRate || 0}%`}</div>
                            <div className="text-[10px] text-blue-600 font-medium">Completed vs Total Orders</div>
                        </div>
                        <div className="flex flex-col gap-1 p-4 bg-background rounded-lg border border-border/50">
                            <span className="text-sm text-muted-foreground">Active Orders</span>
                            <div className="text-2xl font-bold">{loading ? <Loader2 className="animate-spin h-5 w-5" /> : performance?.totalOrders || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Open Purchase Orders</div>
                        </div>
                        <div className="flex flex-col gap-1 p-4 bg-background rounded-lg border border-border/50">
                            <span className="text-sm text-muted-foreground">Compliance Docs</span>
                            <div className="text-2xl font-bold">{loading ? <Loader2 className="animate-spin h-5 w-5" /> : performance?.verifiedDocs || 0} / {performance?.totalDocs || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Documents Verified</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
