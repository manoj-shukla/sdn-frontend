"use client";

import { useSupplierRole } from "../context/SupplierRoleContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SupplierProfileLayoutProps {
    children: React.ReactNode;
}

export default function SupplierProfileLayout({ children }: SupplierProfileLayoutProps) {
    const { status, canSubmit, submitOnboarding, isSubmitting } = useSupplierRole();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Supplier Profile</h1>
                    <p className="text-muted-foreground">Manage your company information and compliance documents.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant={
                            status === "APPROVED" ? "success" :
                                status === "SUBMITTED" ? "warning" :
                                    status === "REWORK_REQUIRED" ? "destructive" : "secondary"
                        }>
                            {status.replace("_", " ")}
                        </Badge>
                    </div>
                    {canSubmit && (
                        <Button
                            onClick={submitOnboarding}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Submitting..." : "Submit Onboarding"}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full">{children}</div>
        </div>
    );
}
