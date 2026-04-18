"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

/**
 * ProtectedShell
 *
 * Client wrapper for the (protected) layout.
 *
 * - Supplier routes (/supplier/*) render their children directly — the
 *   buyer Sidebar, Header, and outer wrappers are skipped entirely.
 *   The supplier-specific layout (SupplierSideNav) is responsible for
 *   its own chrome.
 *
 * - All other protected routes (buyer, admin, etc.) get the full
 *   Sidebar + Header + main layout as before.
 */
export function ProtectedShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    if (pathname.startsWith("/supplier")) {
        // Supplier portal has its own layout — render children only
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
                    <Breadcrumbs />
                    {children}
                </main>
            </div>
        </div>
    );
}
