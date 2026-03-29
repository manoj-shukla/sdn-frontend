"use client";

import { AdminMessagesSection } from "@/components/admin/messages-section";

export default function AdminMessagesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Messages</h1>
                    <p className="text-muted-foreground">Monitor global communication and broadcast messages to buyers.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <AdminMessagesSection />
            </div>
        </div>
    );
}
