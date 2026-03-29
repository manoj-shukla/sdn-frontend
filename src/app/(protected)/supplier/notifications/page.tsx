"use client";

import { Bell } from "lucide-react";
import { NotificationsSection } from "@/components/supplier/portal-sections";

export default function SupplierNotificationsPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 p-4 bg-[#f8fafc] min-h-screen">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Bell className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Notifications</h1>
                </div>
                <p className="text-muted-foreground ml-11">Alerts regarding bid status, approvals, and system updates.</p>
            </div>

            <NotificationsSection />
        </div>
    );
}
