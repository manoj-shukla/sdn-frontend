"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { DraggableDevTool } from "@/components/demo/DraggableDevTool";
import { useAuthStore } from "@/lib/store/auth-store";

export type AdminRole = "Super Admin" | "SEM" | "AP" | "Compliance";

interface AdminRoleContextType {
    role: AdminRole;
    setRole: (role: AdminRole) => void;
    canCreateAdmins: boolean;
    canCreateBuyers: boolean;
    canCreateSuppliers: boolean;
    canManageFinancials: boolean; // AP specific
    canVerifyCompliance: boolean; // Compliance specific
}

const AdminRoleContext = createContext<AdminRoleContextType | undefined>(undefined);

export function AdminRoleProvider({ children }: { children: ReactNode }) {
    const { user } = useAuthStore();
    const [role, setRole] = useState<AdminRole>("Super Admin");

    // Platform ADMIN users (real role from JWT) always have full Super Admin privileges.
    // The dev tool role switcher only applies to non-ADMIN users previewing different roles.
    const isSuperAdmin = user?.role === "ADMIN";

    // Super Admin: Can do everything
    // SEM: Can create/invite suppliers
    // AP/Compliance: Specialized read/verify/edit but no user creation

    const canCreateAdmins = isSuperAdmin || role === "Super Admin";
    const canCreateBuyers = isSuperAdmin || role === "Super Admin";
    const canCreateSuppliers = isSuperAdmin || role === "Super Admin" || role === "SEM";
    const canManageFinancials = isSuperAdmin || role === "Super Admin" || role === "AP";
    const canVerifyCompliance = isSuperAdmin || role === "Super Admin" || role === "Compliance";

    return (
        <AdminRoleContext.Provider value={{
            role,
            setRole,
            canCreateAdmins,
            canCreateBuyers,
            canCreateSuppliers,
            canManageFinancials,
            canVerifyCompliance
        }}>
            {children}

            {/* Dev Tools Helpers */}
            <React.Suspense fallback={null}>
                <DraggableDevTool title="Admin Controls (Role)" defaultPosition={{ x: 1000, y: 80 }}>
                    <div className="flex gap-2 items-center justify-between">
                        <span>Role:</span>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as AdminRole)}
                            className="border rounded px-1 max-w-[120px]"
                        >
                            <option value="Super Admin">Super Admin</option>
                            <option value="SEM">SEM</option>
                            <option value="AP">AP / Finance</option>
                            <option value="Compliance">Compliance</option>
                        </select>
                    </div>
                    <div className="text-[10px] text-muted-foreground pt-1 border-t mt-1">
                        Create Admin: {canCreateAdmins ? "Yes" : "No"} <br />
                        Create Supplier: {canCreateSuppliers ? "Yes" : "No"}
                    </div>
                </DraggableDevTool>
            </React.Suspense>
        </AdminRoleContext.Provider>
    );
}

export function useAdminRole() {
    const context = useContext(AdminRoleContext);
    if (context === undefined) {
        throw new Error("useAdminRole must be used within a AdminRoleProvider");
    }
    return context;
}
