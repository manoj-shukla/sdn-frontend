"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, AlertCircle, MessageSquare } from "lucide-react";
import { useSupplierOnboardingStore, OnboardingSection } from "@/lib/store/supplier-onboarding-store";
import { cn } from "@/lib/utils";

export function PortalHeader({ buyerName, supplierName, status }: any) {
    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-16 items-center">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {buyerName?.charAt(0) || "B"}
                    </div>
                    <div>
                        <div className="font-semibold">{buyerName} Supplier Portal</div>
                    </div>
                </div>
            </div>
        </header>
    );
}

export function PortalNav() {
    const { activeSection, setActiveSection, completedSections } = useSupplierOnboardingStore();

    const navItems: { id: OnboardingSection; label: string; icon?: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Overview' },
        { id: 'company', label: 'Company Details' },
        { id: 'address', label: 'Registered Address' },
        { id: 'contact', label: 'Contact Person' },
        { id: 'tax', label: 'Tax Information' },
        { id: 'bank', label: 'Bank Details' },
        { id: 'documents', label: 'Documents' },
        { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> }
    ];

    return (
        <nav className="w-64 border-r min-h-[calc(100vh-4rem)] p-4 space-y-2 hidden md:block">
            <div className="font-semibold text-sm text-muted-foreground mb-4 px-2">ONBOARDING CHECKLIST</div>
            {navItems.map((item) => {
                const isComplete = completedSections[item.id];
                const isActive = activeSection === item.id;

                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                            isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground",
                        )}
                    >
                        {item.icon ? (
                            <span className="text-muted-foreground">{item.icon}</span>
                        ) : isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        {item.label}
                    </button>
                );
            })}

            <div className="mt-8 pt-4 border-t px-2">
                <SubmitButton />
            </div>
        </nav>
    );
}

import apiClient from "@/lib/api/client";
import { toast } from "sonner";
import { useState } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { Loader2 } from "lucide-react";

function SubmitButton() {
    const { completedSections, supplierId, status } = useSupplierOnboardingStore();
    const [submitting, setSubmitting] = useState(false);

    // Check all required sections
    const requiredSections = ['company', 'address', 'contact', 'tax', 'bank', 'documents'];
    const allSectionsComplete = requiredSections.every(id => completedSections[id as OnboardingSection]);

    // Allow submit if all sections are complete OR if we are in REWORK mode (assuming they fixed it)
    const canSubmit = allSectionsComplete || status === 'REWORK_REQUIRED';

    const handleSubmit = async () => {
        if (!supplierId) {
            console.error("Submit failed: No supplierId in store");
            toast.error("Error: Supplier ID missing. Please refresh.");
            return;
        }
        console.log(`Submitting profile for Supplier ID: ${supplierId}`);
        setSubmitting(true);
        try {
            await apiClient.post(`/api/suppliers/${supplierId}/reviews/submit`);
            toast.success("Profile submitted for review!");
            // Optionally disable or show success state
            // window.location.reload(); // Refresh to update status
        } catch (error) {
            console.error("Submit failed", error);
            toast.error("Failed to submit profile.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-2">
            <Button
                className="w-full"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
            >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {status === 'REWORK_REQUIRED' ? 'Resubmit for Review' : 'Submit for Review'}
            </Button>
            {!canSubmit && (
                <p className="text-xs text-muted-foreground text-center">
                    Complete all sections to submit.
                </p>
            )}
        </div>
    );
}
