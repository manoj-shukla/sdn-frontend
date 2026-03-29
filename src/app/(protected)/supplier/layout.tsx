"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { SupplierRoleProvider } from "./context/SupplierRoleContext";
import { NotificationPoller } from "@/components/layout/notification-poller";

export default function SupplierLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user) return;
        if (user.role !== 'SUPPLIER') return;

        // If explicitly approved, allow all
        if (user.approvalStatus === 'APPROVED') return;

        // Otherwise (Draft, etc), restrict to dashboard for onboarding
        const allowedOnboardingPaths = ['/supplier/dashboard', '/supplier/messages'];
        const isAllowed = allowedOnboardingPaths.some(path => pathname.startsWith(path));

        if (!isAllowed) {
            router.replace('/supplier/dashboard');
        }
    }, [pathname, user, router]);

    return (
        <SupplierRoleProvider>
            <NotificationPoller />
            {children}
        </SupplierRoleProvider>
    );
}
