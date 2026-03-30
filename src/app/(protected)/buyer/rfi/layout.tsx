"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    ClipboardList,
    FileText,
    HelpCircle,
    Plus,
    Upload,
    MessageSquare,
    BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";

interface RFITab {
    title: string;
    href: string;
    icon: React.ElementType;
    count?: number;
}

export default function RFILayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuthStore();
    const isAdmin = user?.role === "ADMIN";

    const [counts, setCounts] = useState({
        events: 0,
        templates: 0,
        questions: 0,
    });

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                // Admin only needs question count
                if (isAdmin) {
                    const questionsRes = await apiClient.get("/api/rfi/questions") as any;
                    const qList = questionsRes.content || (Array.isArray(questionsRes) ? questionsRes : []);
                    setCounts({ events: 0, templates: 0, questions: qList.length });
                    return;
                }

                const [eventsRes, templatesRes, questionsRes] = await Promise.all([
                    apiClient.get("/api/rfi/events"),
                    apiClient.get("/api/rfi/templates"),
                    apiClient.get("/api/rfi/questions")
                ]);

                const extractList = (res: any) => res.content || (Array.isArray(res) ? res : []);
                setCounts({
                    events: extractList(eventsRes).length,
                    templates: extractList(templatesRes).length,
                    questions: extractList(questionsRes).length,
                });
            } catch (err) {
                console.error("Failed to fetch RFI module counts", err);
            }
        };
        fetchCounts();
    }, [isAdmin]);

    // Super admin: only sees Question Library
    const adminTabs: RFITab[] = [
        { title: "Question Library", href: "/buyer/rfi/questions", icon: HelpCircle, count: counts.questions },
    ];

    // Buyer: sees all tabs
    const buyerTabs: RFITab[] = [
        { title: "RFI Events", href: "/buyer/rfi", icon: ClipboardList, count: counts.events },
        { title: "Templates", href: "/buyer/rfi/templates", icon: FileText, count: counts.templates },
        { title: "Question Library", href: "/buyer/rfi/questions", icon: HelpCircle, count: counts.questions },
        { title: "Responses", href: "/buyer/rfi/responses", icon: MessageSquare },
        { title: "Analytics", href: "/buyer/rfi/analytics", icon: BarChart3 },
    ];

    const tabs = isAdmin ? adminTabs : buyerTabs;

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc]">
            {/* Top Header Section */}
            <div className="border-b border-gray-200 bg-white px-8 pt-6">
                <div className="max-w-[1600px] mx-auto">
                    {/* Title & Global Actions */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                {isAdmin ? "RFI Question Library" : "RFI Module"}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {isAdmin
                                    ? "Create, edit, and manage questions for RFI templates."
                                    : "Manage your RFI events, templates, and question library."}
                            </p>
                        </div>

                        {/* Only show global actions for buyer */}
                        {!isAdmin && (
                            <div className="flex items-center gap-3">
                                <Button variant="outline" className="gap-2 h-9">
                                    <Upload className="h-4 w-4" />
                                    <span>Import</span>
                                </Button>
                                <Button
                                    className="gap-2 h-9"
                                    onClick={() => router.push('/buyer/rfi/create')}
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>New RFI Event</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-end gap-1 overflow-x-auto scrollbar-hide -mb-px">
                        {tabs.map((tab) => {
                            const isExact = pathname === tab.href;
                            const isActive = isExact || (tab.href !== "/buyer/rfi" && pathname.startsWith(tab.href));

                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all text-sm font-medium rounded-t-md",
                                        isActive
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <tab.icon className={cn(
                                        "h-4 w-4",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )} />
                                    <span>{tab.title}</span>
                                    {tab.count !== undefined && (
                                        <span className={cn(
                                            "inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "bg-muted text-muted-foreground"
                                        )}>
                                            {tab.count}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
