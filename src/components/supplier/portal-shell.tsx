"use client";

import { Button } from "@/components/ui/button";
import {
    CheckCircle2, Circle, MessageSquare, LayoutDashboard,
    ClipboardList, FileText, Trophy, Package, CreditCard,
    FileBox, ChevronDown, ChevronRight, Loader2,
    Building2, MapPin, User, Landmark, ShieldCheck, GraduationCap
} from "lucide-react";
import { useSupplierOnboardingStore, OnboardingSection } from "@/lib/store/supplier-onboarding-store";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";

// ── Onboarding sub-items ──────────────────────────────────────────────────────

const ONBOARDING_STEPS: { id: OnboardingSection; label: string; icon: React.ReactNode }[] = [
    { id: 'company',   label: 'Company Details',    icon: <Building2     className="h-3.5 w-3.5" /> },
    { id: 'address',   label: 'Registered Address', icon: <MapPin        className="h-3.5 w-3.5" /> },
    { id: 'contact',   label: 'Contact Person',     icon: <User          className="h-3.5 w-3.5" /> },
    { id: 'tax',       label: 'Tax Information',    icon: <ShieldCheck   className="h-3.5 w-3.5" /> },
    { id: 'bank',      label: 'Bank Details',       icon: <Landmark      className="h-3.5 w-3.5" /> },
    { id: 'documents', label: 'Documents',          icon: <FileBox       className="h-3.5 w-3.5" /> },
    { id: 'messages',  label: 'Messages',           icon: <MessageSquare className="h-3.5 w-3.5" /> },
];

// ── Submit button (shown in sidebar bottom for non-approved suppliers) ─────────

function SubmitButton() {
    const { completedSections, supplierId, status } = useSupplierOnboardingStore();
    const [submitting, setSubmitting] = useState(false);

    const requiredSections: OnboardingSection[] = ['company', 'address', 'contact', 'tax', 'bank', 'documents'];
    const allComplete = requiredSections.every(id => completedSections[id]);
    const canSubmit   = allComplete || status === 'REWORK_REQUIRED';

    const handleSubmit = async () => {
        if (!supplierId) { toast.error("Supplier ID missing. Please refresh."); return; }
        setSubmitting(true);
        try {
            await apiClient.post(`/api/suppliers/${supplierId}/reviews/submit`);
            toast.success("Profile submitted for review!");
        } catch {
            toast.error("Failed to submit profile.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-1.5">
            <Button className="w-full" size="sm" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {status === 'REWORK_REQUIRED' ? 'Resubmit for Review' : 'Submit for Review'}
            </Button>
            {!canSubmit && (
                <p className="text-[10px] text-muted-foreground text-center">Complete all sections to submit.</p>
            )}
        </div>
    );
}

// ── SupplierSideNav ───────────────────────────────────────────────────────────
//
// Single flat sidebar for the supplier portal.
// Nav items: Dashboard · RFI · RFP · Onboarding (expandable) · Awards · Orders · Invoices
// "Onboarding" is a first-class nav item that expands inline to show profile steps.
// No section headers — all items live at the same hierarchy level.

export function SupplierSideNav() {
    const { user } = useAuthStore();
    const { activeSection, setActiveSection, completedSections, status } = useSupplierOnboardingStore();
    const pathname  = usePathname();
    const router    = useRouter();
    const [onboardingOpen, setOnboardingOpen] = useState(true);

    const isApproved    = user?.approvalStatus === 'APPROVED' || status === 'APPROVED';
    const isOnDashboard = pathname.startsWith('/supplier/dashboard');

    // Determine whether "Onboarding" parent item is visually active
    const isOnboardingActive = isOnDashboard && activeSection !== 'dashboard';

    const showSubmitButton =
        !isApproved && status !== 'SUBMITTED' && status !== 'IN_REVIEW' && status !== 'APPROVED';

    const completedCount = ONBOARDING_STEPS.filter(
        s => s.id !== 'messages' && completedSections[s.id]
    ).length;
    const totalRequired = ONBOARDING_STEPS.filter(s => s.id !== 'messages').length;

    const handleOnboardingNav = (sectionId: OnboardingSection) => {
        setActiveSection(sectionId);
        if (!isOnDashboard) router.push(`/supplier/dashboard?section=${sectionId}`);
    };

    const isLinkActive = (href: string) => {
        if (href === '/supplier/dashboard') return pathname === '/supplier/dashboard' && (!isOnDashboard || activeSection === 'dashboard');
        return pathname.startsWith(href);
    };

    const buyerName = (user as any)?.buyerName || (user as any)?.organizationName || 'Buyer';

    // Full flat nav definition — Onboarding slot is handled inline below
    const NAV_ITEMS = [
        { href: '/supplier/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, approvedOnly: false },
        { href: '/supplier/rfi',       label: 'RFI Inbox', icon: <ClipboardList   className="h-4 w-4" />, approvedOnly: false },
        { href: '/supplier/rfp',       label: 'RFP / RFQ', icon: <FileText        className="h-4 w-4" />, approvedOnly: false },
        // ← Onboarding is injected here as a special expandable item
        { href: '/supplier/awards',    label: 'Awards',    icon: <Trophy          className="h-4 w-4" />, approvedOnly: true  },
        { href: '/supplier/orders',    label: 'Orders',    icon: <Package         className="h-4 w-4" />, approvedOnly: true  },
        { href: '/supplier/invoices',  label: 'Invoices',  icon: <CreditCard      className="h-4 w-4" />, approvedOnly: true  },
    ];

    const itemClass = (active: boolean) => cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
        active
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

    return (
        <aside className="w-64 border-r bg-background flex flex-col min-h-screen sticky top-0 hidden md:flex shrink-0">

            {/* Identity header */}
            <div className="px-4 py-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                        {buyerName?.charAt(0)?.toUpperCase() || 'B'}
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-sm leading-tight truncate">{buyerName}</div>
                        <div className="text-xs text-muted-foreground">Supplier Portal</div>
                    </div>
                </div>
            </div>

            {/* Flat nav */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">

                {/* Dashboard */}
                <Link href="/supplier/dashboard" onClick={() => setActiveSection('dashboard')}>
                    <div className={itemClass(isLinkActive('/supplier/dashboard'))}>
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        <span>Dashboard</span>
                    </div>
                </Link>

                {/* RFI */}
                <Link href="/supplier/rfi">
                    <div className={itemClass(pathname.startsWith('/supplier/rfi'))}>
                        <ClipboardList className="h-4 w-4 shrink-0" />
                        <span>RFI Inbox</span>
                        {!isApproved && (
                            <span className="ml-auto text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">New</span>
                        )}
                    </div>
                </Link>

                {/* RFP */}
                <Link href="/supplier/rfp">
                    <div className={itemClass(pathname.startsWith('/supplier/rfp'))}>
                        <FileText className="h-4 w-4 shrink-0" />
                        <span>RFP / RFQ</span>
                        {!isApproved && (
                            <span className="ml-auto text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">New</span>
                        )}
                    </div>
                </Link>

                {/* ── Onboarding — expandable nav item ── */}
                <div>
                    <button
                        onClick={() => setOnboardingOpen(o => !o)}
                        className={itemClass(isOnboardingActive)}
                    >
                        <GraduationCap className="h-4 w-4 shrink-0" />
                        <span className="flex-1">Onboarding</span>
                        {/* Progress pill */}
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium mr-1",
                            completedCount === totalRequired
                                ? "bg-green-100 text-green-700"
                                : "bg-muted text-muted-foreground"
                        )}>
                            {completedCount}/{totalRequired}
                        </span>
                        {onboardingOpen
                            ? <ChevronDown  className="h-3.5 w-3.5 shrink-0" />
                            : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        }
                    </button>

                    {onboardingOpen && (
                        <div className="mt-0.5 ml-3 pl-3 border-l space-y-0.5">
                            {ONBOARDING_STEPS.map(step => {
                                const isComplete = completedSections[step.id];
                                const isActive   = isOnDashboard && activeSection === step.id;
                                const isMessages = step.id === 'messages';

                                return (
                                    <button
                                        key={step.id}
                                        onClick={() => handleOnboardingNav(step.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                                            isActive
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {isMessages ? (
                                            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                                        ) : isComplete ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                        ) : (
                                            <Circle className="h-3.5 w-3.5 shrink-0" />
                                        )}
                                        <span className="text-xs">{step.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Approved-only items */}
                {isApproved && (
                    <>
                        <Link href="/supplier/awards">
                            <div className={itemClass(pathname.startsWith('/supplier/awards'))}>
                                <Trophy className="h-4 w-4 shrink-0" />
                                <span>Awards</span>
                            </div>
                        </Link>
                        <Link href="/supplier/orders">
                            <div className={itemClass(pathname.startsWith('/supplier/orders'))}>
                                <Package className="h-4 w-4 shrink-0" />
                                <span>Orders</span>
                            </div>
                        </Link>
                        <Link href="/supplier/invoices">
                            <div className={itemClass(pathname.startsWith('/supplier/invoices'))}>
                                <CreditCard className="h-4 w-4 shrink-0" />
                                <span>Invoices</span>
                            </div>
                        </Link>
                    </>
                )}
            </nav>

            {/* Submit button (non-approved, not yet submitted) */}
            {showSubmitButton && (
                <div className="p-3 border-t">
                    <SubmitButton />
                </div>
            )}

            {/* Status pill (submitted / in-review) */}
            {(status === 'SUBMITTED' || status === 'IN_REVIEW') && (
                <div className="p-3 border-t">
                    <div className={cn(
                        "text-center text-xs px-3 py-2 rounded-md font-medium",
                        status === 'SUBMITTED'
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                    )}>
                        {status === 'SUBMITTED' ? '⏳ Awaiting Review' : '🔍 Under Review'}
                    </div>
                </div>
            )}
        </aside>
    );
}

// ── Backward-compat stubs ─────────────────────────────────────────────────────

export function PortalHeader({ buyerName }: any) {
    return null;
}

export function PortalNav() {
    return null;
}
