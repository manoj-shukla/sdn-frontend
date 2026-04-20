"use client";

/**
 * Supplier onboarding section route.
 *
 * Replaces the legacy `/supplier/dashboard?section=company` URL pattern with
 * proper path-based routing: `/supplier/onboarding/company`,
 * `/supplier/onboarding/address`, etc.
 *
 * Why path-based?
 *   - Query-param routing was occasionally lost during client-side navigation,
 *     showing the dashboard home instead of the requested section.
 *   - Path-based routes are always honored by the Next.js router and bookmarks
 *     are reliable.
 *
 * Valid sections: company | address | contact | tax | bank | documents | messages.
 * Anything else redirects back to /supplier/dashboard.
 */

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    CompanySection,
    AddressSection,
    ContactSection,
    TaxSection,
    BankSection,
    DocumentsSection,
    MessagesSection,
} from "@/components/supplier/portal-sections";
import { useSupplierOnboardingStore, OnboardingSection } from "@/lib/store/supplier-onboarding-store";
import { useSupplierPortalInit } from "@/lib/hooks/use-supplier-portal-init";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

const VALID_SECTIONS: OnboardingSection[] = [
    "company",
    "address",
    "contact",
    "tax",
    "bank",
    "documents",
    "messages",
];

function isValidSection(s: string | undefined): s is OnboardingSection {
    return !!s && (VALID_SECTIONS as string[]).includes(s);
}

function OnboardingSectionContent() {
    const params = useParams<{ section: string }>();
    const router = useRouter();
    const sectionParam = params?.section;

    const { setActiveSection, completedSections, status: onboardingStatus } = useSupplierOnboardingStore();
    const { loading, isSubmitting, handleFinalSubmit } = useSupplierPortalInit();
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Validate the section param. Invalid → bounce to portal home.
    useEffect(() => {
        if (!isValidSection(sectionParam)) {
            router.replace("/supplier/dashboard");
            return;
        }
        setActiveSection(sectionParam);
    }, [sectionParam, router, setActiveSection]);

    const isSubmitEnabled = Object.values(completedSections).every(Boolean);

    const renderSection = () => {
        switch (sectionParam) {
            case "company":
                return <CompanySection />;
            case "address":
                return <AddressSection />;
            case "contact":
                return <ContactSection />;
            case "tax":
                return <TaxSection />;
            case "bank":
                return <BankSection />;
            case "documents":
                return <DocumentsSection />;
            case "messages":
                return <MessagesSection />;
            default:
                return null;
        }
    };

    if (loading || !isValidSection(sectionParam)) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 bg-muted/10 min-h-full">
            <div className="w-full max-w-none space-y-6">
                {renderSection()}
                {isSubmitEnabled &&
                    onboardingStatus !== "SUBMITTED" &&
                    onboardingStatus !== "APPROVED" &&
                    onboardingStatus !== "PRE_APPROVED" && (
                        <div className="flex justify-end pt-4 border-t mt-8">
                            <Button
                                size="lg"
                                onClick={() => handleFinalSubmit(() => setShowSuccessModal(true))}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Submit Profile
                            </Button>
                        </div>
                    )}
            </div>

            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-md text-center">
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50/50">
                            <CheckCircle2 className="h-10 w-10 text-green-500" strokeWidth={1.5} />
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-xl font-semibold">Profile Submitted!</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                                Thank you! Your profile has been submitted successfully and is now pending approval.
                                You will be notified once it has been reviewed.
                            </DialogDescription>
                        </div>
                        <div className="w-full rounded-lg bg-muted/50 border px-4 py-3 text-xs text-muted-foreground text-left space-y-1">
                            <p className="font-medium text-foreground">What happens next?</p>
                            <p>• Our team will review your submitted information</p>
                            <p>• You may be contacted if additional details are needed</p>
                            <p>• You&apos;ll receive a notification when your profile is approved</p>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button className="w-full sm:w-auto" onClick={() => setShowSuccessModal(false)}>
                            Got it, thanks!
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function SupplierOnboardingSectionPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OnboardingSectionContent />
        </Suspense>
    );
}
