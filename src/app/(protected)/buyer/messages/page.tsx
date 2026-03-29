"use client";

import { BuyerMessagesSection } from "@/components/buyer/messages-section";

export default function BuyerMessagesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
                    <p className="text-muted-foreground">Direct communications with Super Admins and Suppliers.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <BuyerMessagesSection />
            </div>
        </div>
    );
}
