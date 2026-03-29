"use client";

import { MessagesSection } from "@/components/supplier/portal-sections";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect } from "react";
import { useSupplierOnboardingStore } from "@/lib/store/supplier-onboarding-store";

export default function SupplierMessagesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
                    <p className="text-muted-foreground">Manage your communications with buyers and administrators.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <MessagesSection />
            </div>
        </div>
    );
}
