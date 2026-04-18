"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSupplierOnboardingStore } from "@/lib/store/supplier-onboarding-store";
import { SupplierRoleProvider } from "./context/SupplierRoleContext";
import { NotificationPoller } from "@/components/layout/notification-poller";
import apiClient from "@/lib/api/client";

// Routes a non-approved supplier may access before approval
const PRE_APPROVAL_PATHS = [
    '/supplier/dashboard',
    '/supplier/messages',
    '/supplier/notifications',
    '/supplier/rfi',
    '/supplier/rfp',
];

export default function SupplierLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, updateBuyer } = useAuthStore();
    const { setStatus } = useSupplierOnboardingStore();

    // null  = not yet determined (never redirect in this state)
    // true  = supplier is APPROVED (allow all routes)
    // false = supplier is NOT approved (restrict to PRE_APPROVAL_PATHS)
    const [approvalState, setApprovalState] = useState<boolean | null>(null);

    // Track which supplierId we last fetched for so switching profiles re-checks.
    const fetchedFor = useRef<string | null>(null);

    useEffect(() => {
        if (!user || user.role !== 'SUPPLIER') return;

        const supplierId = String(user.supplierId ?? '');

        // Already verified for this supplier in this session — skip API call.
        if (fetchedFor.current === supplierId && approvalState !== null) return;

        // Immediate fast-path: trust the persisted auth store when it already
        // shows APPROVED. This eliminates any loading flicker for returning users.
        if ((user.approvalStatus ?? '').toUpperCase() === 'APPROVED') {
            fetchedFor.current = supplierId;
            setApprovalState(true);
            return;
        }

        // Unknown or stale status — fetch the live value from the API.
        // This covers: first login, supplier approved after last login, missing field.
        fetchedFor.current = supplierId;
        apiClient.get('/auth/me')
            .then((me: any) => {
                const approved = (me?.approvalStatus ?? '').toUpperCase() === 'APPROVED';
                setApprovalState(approved);

                // Sync back into stores so the sidebar and dashboard stay consistent.
                if (me?.approvalStatus) {
                    setStatus(me.approvalStatus);
                    if (me.userId) {
                        updateBuyer(String(me.userId), { approvalStatus: me.approvalStatus });
                    }
                }
            })
            .catch(() => {
                // Network / auth error — fall back to whatever the store says,
                // defaulting to false (non-approved) so restricted routes stay protected.
                const fallback = (user.approvalStatus ?? '').toUpperCase() === 'APPROVED';
                setApprovalState(fallback);
            });
    // Re-run only when the active supplier changes (e.g. profile switch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.supplierId]);

    useEffect(() => {
        if (!user || user.role !== 'SUPPLIER') return;

        // While the check is in-flight, do NOT redirect — we don't want to
        // kick approved suppliers out because we haven't confirmed yet.
        if (approvalState === null) return;

        // Approved → unrestricted access.
        if (approvalState === true) return;

        // Not approved → limit to pre-approval paths.
        const allowed = PRE_APPROVAL_PATHS.some(p => pathname.startsWith(p));
        if (!allowed) {
            router.replace('/supplier/dashboard');
        }
    }, [pathname, approvalState, user, router]);

    return (
        <SupplierRoleProvider>
            <NotificationPoller />
            {children}
        </SupplierRoleProvider>
    );
}
