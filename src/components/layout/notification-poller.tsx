"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useNotificationStore } from "@/lib/store/notification-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSupplierOnboardingStore } from "@/lib/store/supplier-onboarding-store";

export function NotificationPoller() {
    const pathname = usePathname();
    const { user } = useAuthStore();
    const { fetchNotifications } = useNotificationStore();
    const { fetchMessages } = useSupplierOnboardingStore();

    const refreshCounts = async () => {
        if (!user) return;
        try {
            if (user.role.toUpperCase() === 'SUPPLIER' && (user as any).supplierId && (user as any).supplierId !== 'undefined') {
                const sId = (user as any).supplierId;
                await Promise.all([
                    fetchNotifications({ recipientRole: 'SUPPLIER', supplierId: sId }),
                    fetchMessages(sId)
                ]);
            } else if (user.role.toUpperCase() === 'BUYER' && (user as any).buyerId && (user as any).buyerId !== 'undefined') {
                const bId = (user as any).buyerId;
                await fetchNotifications({ recipientRole: 'BUYER', ...(bId ? { buyerId: bId } : {}) });
            }
        } catch (error) {
            console.error("Failed to poll counts", error);
        }
    };

    // Poll on mount and interval
    useEffect(() => {
        if (!user) return;

        // Initial fetch
        refreshCounts();

        // Poll every 30 seconds
        const interval = setInterval(refreshCounts, 30000);

        return () => clearInterval(interval);
    }, [user]);

    // Also fetch on route change
    useEffect(() => {
        if (user) {
            refreshCounts();
        }
    }, [pathname, user]);

    return null; // Headless component
}
