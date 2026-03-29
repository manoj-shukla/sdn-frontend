"use client";

import { BuyerNotificationsSection } from "@/components/buyer/notifications-section";

export default function BuyerNotificationsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground">Track supplier updates and system alerts.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <BuyerNotificationsSection />
            </div>
        </div>
    );
}
