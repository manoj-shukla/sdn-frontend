"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { DraggableDevTool } from "@/components/demo/DraggableDevTool";
import { useAuthStore } from "@/lib/store/auth-store";
import apiClient from "@/lib/api/client";

// Enterprise-grade buyer roles following SOX compliance
export type BuyerRole =
    | "Admin"              // Administrative only - NO approval rights
    | "Compliance"         // Regulatory & risk verification
    | "Finance"            // Financial validation
    | "AP"                 // Accounts Payable / Activation
    | "Procurement"        // Supplier initiation, relationship, status
    | (string & {});       // Allow custom dynamic roles from backend

interface BuyerRoleContextType {
    role: BuyerRole;
    setRole: (role: BuyerRole) => void;
    // Administrative permissions (Admin only)
    canManageUsers: boolean;
    canAssignRoles: boolean;
    // Onboarding permissions (Enablement Manager only)
    canApproveOnboarding: boolean;
    canRejectOnboarding: boolean;
    canRequestRework: boolean;
    canAssignToCircles: boolean;
    canChangeSupplierStatus: boolean;
    // Compliance permissions
    canVerifyDocuments: boolean;
    canAddComplianceNotes: boolean;
    // Finance permissions
    canViewBankDetails: boolean;
    canVerifyBankDetails: boolean;
    // General permissions
    canViewSuppliers: boolean;
    canViewReviewStatus: boolean;
    canViewReviewHistory: boolean;
    canInviteSuppliers: boolean;
    canManageCircles: boolean;
    canViewApprovals: boolean;
    approvalSection: string | null;
    isSandboxActive: boolean;
    refreshSandboxRoles: () => Promise<void>;
}

const BuyerRoleContext = createContext<BuyerRoleContextType | undefined>(undefined);

export function BuyerRoleProvider({ children }: { children: ReactNode }) {
    const { user, login } = useAuthStore();
    // Initialize role from user's subRole if available
    const [role, setRoleState] = useState<BuyerRole>("Admin");
    const [sandboxRoles, setSandboxRoles] = useState<any[]>([]);

    // Sandbox Flag
    const isSandboxActive = user?.isSandboxActive || false;

    const fetchSandboxRoles = useCallback(async () => {
        if (!isSandboxActive || !user?.buyerId || user.buyerId === 'undefined' || user.role !== 'BUYER') return;
        try {
            const res: any = await apiClient.get(`/api/buyers/${user.buyerId}/roles`);
            const roles = Array.isArray(res) ? res : (res.data || []);
            setSandboxRoles(roles);
        } catch (err) {
            console.error("Failed to fetch custom roles", err);
        }
    }, [isSandboxActive, user?.buyerId]);

    useEffect(() => {
        fetchSandboxRoles();
    }, [fetchSandboxRoles]);

    // Map frontend role to backend subRole
    const roleToSubRoleMap: Record<BuyerRole, string> = {
        "Admin": "Buyer Admin",
        "Compliance": "Compliance Reviewer",
        "Finance": "Finance Approver",
        "AP": "Accounts Payable (AP) Activator",
        "Procurement": "Procurement Approver"
    };

    // Handler to persist role change to backend AND reload page
    // Also refreshes the JWT so backend sees the updated subRole immediately
    const handleRoleChange = useCallback(async (newRole: BuyerRole) => {
        if (!user?.userId || !isSandboxActive) {
            setRoleState(newRole); // Just update local state if not in sandbox
            return;
        }

        try {
            const backendSubRole = (roleToSubRoleMap as Record<string, string>)[newRole] || newRole;

            // 1. Update DB subRole
            await apiClient.put(`/api/users/${user.userId}`, { subRole: backendSubRole });
            console.log(`[Sandbox] Role changed to ${backendSubRole}. Refreshing JWT token...`);

            // 2. Refresh JWT token so backend sees the new subRole on next API call
            //    Without this, the stale JWT still carries the old subRole and causes 403 errors
            const refreshResult: any = await apiClient.post('/auth/refresh-token', {});
            if (refreshResult?.token) {
                localStorage.setItem('token', refreshResult.token);
                console.log(`[Sandbox] JWT refreshed successfully.`);
            }

            // 3. Update the auth store with new user state
            login({ ...user, subRole: backendSubRole } as any);

            // 4. Small delay to ensure store is persisted, then reload to update UI
            setTimeout(() => window.location.reload(), 100);
        } catch (error) {
            console.error("Failed to persist role change:", error);
            setRoleState(newRole); // Still update local state even if API fails
        }
    }, [user, isSandboxActive, login]);

    useEffect(() => {
        if (user?.subRole) {
            // Map backend subRole to frontend role
            const roleMap: Record<string, BuyerRole> = {
                "Admin": "Admin",
                "Buyer Admin": "Admin",
                "Super Admin": "Admin",
                "Compliance Reviewer": "Compliance",
                "Finance Approver": "Finance",
                "Accounts Payable (AP) Activator": "AP",
                "Supplier Inviter / Requestor": "Procurement",
                "Procurement Approver": "Procurement",
                "Compliance": "Compliance",
                "Finance": "Finance",
                "AP": "AP",
                "User": "Procurement",
                "Procurement": "Procurement"
            };

            // Direct match or mapped match or default to Procurement
            setRoleState(roleMap[user.subRole] || (user.subRole as BuyerRole) || "Procurement");
        }
    }, [user?.subRole]);

    // ========== PERMISSION MATRIX ==========

    // Find custom role permissions if applicable
    const activeCustomRole = sandboxRoles.find(r => (r.roleName || r.rolename) === role);
    const customPerms = activeCustomRole?.permissions
        ? (typeof activeCustomRole.permissions === 'string' ? JSON.parse(activeCustomRole.permissions) : activeCustomRole.permissions)
        : [];

    const hasPermission = (perm: string) => customPerms.includes(perm);

    // Administrative permissions (Admin only)
    const canManageUsers = role === "Admin";
    const canAssignRoles = role === "Admin";

    // Onboarding lifecycle (Shared Approval Responsibilities)
    const canApproveOnboarding = ["Admin", "Procurement", "Compliance", "Finance", "AP"].includes(role) || hasPermission("CAN_APPROVE");
    const canRejectOnboarding = ["Admin", "Procurement", "Compliance", "Finance", "AP"].includes(role) || hasPermission("CAN_REJECT");
    const canRequestRework = ["Admin", "Procurement", "Compliance", "Finance", "AP"].includes(role) || hasPermission("CAN_REJECT"); // Rework usually bundled with reject/review

    const canAssignToCircles = role === "Admin";
    const canChangeSupplierStatus = role === "Admin"; // Moved to Admin

    // Compliance permissions
    const canVerifyDocuments = role === "Compliance" || role === "Single Level Approver" || hasPermission("CAN_APPROVE");
    const canAddComplianceNotes = role === "Compliance" || role === "Single Level Approver" || hasPermission("CAN_APPROVE");

    // Finance permissions
    const canViewBankDetails = ["Finance", "AP", "Admin", "Single Level Approver"].includes(role) || hasPermission("CAN_APPROVE");
    const canVerifyBankDetails = role === "Finance" || role === "Single Level Approver" || hasPermission("CAN_APPROVE");

    // Determine Approval Section
    const approvalSection =
        role === "Compliance" ? "DOCUMENTS" :
            role === "Finance" ? "FINANCE" :
                role === "AP" ? "ACTIVATION" : null;

    // General visibility permissions
    const canViewSuppliers = ["Admin", "Compliance", "Finance", "AP", "Procurement", "Single Level Approver"].includes(role) || hasPermission("CAN_INVITE");
    const canViewReviewStatus = ["Admin", "Compliance", "Finance", "AP", "Single Level Approver"].includes(role) || hasPermission("CAN_APPROVE");
    const canViewReviewHistory = ["Admin", "Compliance", "Finance", "AP", "Single Level Approver"].includes(role) || hasPermission("CAN_APPROVE");

    const canViewApprovals = ["Compliance", "Finance", "AP", "Procurement", "Single Level Approver"].includes(role) || hasPermission("CAN_APPROVE") || hasPermission("CAN_REJECT");

    // Supplier invitation (Enablement Manager only)
    const canInviteSuppliers = role === "Admin" || role === "Procurement" || hasPermission("CAN_INVITE");
    const canManageCircles = role === "Admin";

    return (
        <BuyerRoleContext.Provider value={{
            role,
            setRole: handleRoleChange,
            canManageUsers,
            canAssignRoles,
            canApproveOnboarding,
            canRejectOnboarding,
            canRequestRework,
            canAssignToCircles,
            canChangeSupplierStatus,
            canVerifyDocuments,
            canAddComplianceNotes,
            canViewBankDetails,
            canVerifyBankDetails,
            canViewSuppliers,
            canViewReviewStatus,
            canViewReviewHistory,
            canInviteSuppliers,
            canManageCircles,
            canViewApprovals,
            approvalSection,
            isSandboxActive,
            refreshSandboxRoles: fetchSandboxRoles
        }}>
            {children}

            {/* Dev Tools - Role Switcher for Testing */}
            <React.Suspense fallback={null}>
                {isSandboxActive && user?.role === 'BUYER' && (
                    <DraggableDevTool title="Buyer Role (RBAC)" defaultPosition={{ x: 20, y: 800 }}>
                        <div className="space-y-2">
                            <div className="flex gap-2 items-center justify-between">
                                <span className="text-xs font-medium">Role:</span>
                                <select
                                    data-testid="sandbox-role-select"
                                    value={role}
                                    onChange={(e) => handleRoleChange(e.target.value as BuyerRole)}
                                    className="border rounded px-1 text-xs max-w-[140px]"
                                >
                                    <option value="Admin">Admin (System)</option>
                                    <option value="Procurement">Procurement (Relationship)</option>
                                    <option value="Compliance">Compliance (Regulatory)</option>
                                    <option value="Finance">Finance (Bank/Tax)</option>
                                    <option value="AP">AP (Activation)</option>
                                    {sandboxRoles
                                        .filter(r => {
                                            const name = r.roleName || r.rolename;
                                            return name && !["Buyer Admin", "Compliance Reviewer", "Finance Approver", "Accounts Payable (AP) Activator", "Procurement Approver", "Supplier Inviter / Requestor"].includes(name);
                                        })
                                        .map(r => {
                                            const name = r.roleName || r.rolename;
                                            return <option key={r.roleId || r.roleid || name} value={name}>{name}</option>;
                                        })
                                    }
                                </select>
                            </div>
                            <div className="text-[9px] text-muted-foreground pt-1 border-t space-y-0.5">
                                <div>Manage Users: {canManageUsers ? "✅" : "❌"}</div>
                                <div>Approve/Reject: {canApproveOnboarding ? "✅" : "❌"}</div>
                                <div>Verify Docs: {canVerifyDocuments ? "✅" : "❌"}</div>
                                <div>Bank Access: {canViewBankDetails ? "✅" : "❌"}</div>
                            </div>
                        </div>
                    </DraggableDevTool>
                )}
            </React.Suspense>
        </BuyerRoleContext.Provider>
    );
}

export function useBuyerRole() {
    const context = useContext(BuyerRoleContext);
    if (context === undefined) {
        throw new Error("useBuyerRole must be used within a BuyerRoleProvider");
    }
    return context;
}
