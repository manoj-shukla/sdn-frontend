"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";

import { SupplierRole, SupplierStatus, ChangeRequest } from "@/types/supplier";
import { toast } from "sonner";

interface SupplierRoleContextType {
    role: SupplierRole;
    status: SupplierStatus;
    setRole: (role: SupplierRole) => void;
    setStatus: (status: SupplierStatus) => void;
    isReadOnly: boolean;
    canSubmit: boolean;
    canManageUsers: boolean;
    submitOnboarding: () => Promise<void>;
    isSubmitting: boolean;
    allPendingRequests: ChangeRequest[];
    refreshChangeRequests: () => Promise<void>;
}

const SupplierRoleContext = createContext<SupplierRoleContextType | undefined>(undefined);

export function SupplierRoleProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<SupplierRole>("Admin");
    const [status, setStatus] = useState<SupplierStatus>("DRAFT");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allPendingRequests, setAllPendingRequests] = useState<ChangeRequest[]>([]);
    const { user } = useAuthStore();

    // Fetch Change Requests
    const refreshChangeRequests = async () => {
        const sId = user?.supplierId || (user as any)?.activeSupplierId;
        if (!sId || sId === 'undefined') return;
        try {
            const res = await apiClient.get<ChangeRequest[]>('/api/change-requests/my-requests');
            const data = Array.isArray(res) ? res : (res as any).data || [];
            setAllPendingRequests(data);
        } catch (error) {
            console.error("Failed to fetch change requests", error);
        }
    };

    useEffect(() => {
        if (user?.supplierId) {
            refreshChangeRequests();
        }
    }, [user?.supplierId]);

    // Status-based Locking: Fields are locked ONLY during active review or for restricted 'User' role.
    // SUBMITTED is intentionally excluded — URL and description should remain editable after submission.
    const isActiveReview = ['IN_REVIEW', 'PENDING_APPROVAL'].includes(status);
    const isCriticalFieldReadOnly = (role === "User") || isActiveReview;
    const canSubmit = role === "Admin" && status !== "APPROVED";
    const canManageUsers = role === "Admin";

    const submitOnboarding = async () => {
        if (!canSubmit) return;
        const sId = user?.supplierId || (user as any)?.activeSupplierId;
        if (!sId || sId === 'undefined') {
            console.error("No supplierId found on user object:", user);
            toast.error("Error: User profile missing supplier ID. Please replogin.");
            return;
        }

        if (confirm("Are you sure you want to submit your profile for review? You will not be able to edit critical information while in review.")) {
            try {
                setIsSubmitting(true);
                await apiClient.post(`/api/suppliers/${sId}/reviews/submit`);
                setStatus("SUBMITTED");

                let companyName = "the company you belong to";
                if (user?.buyerId) {
                    try {
                        const buyerData = await apiClient.get(`/api/buyers/${user.buyerId}`) as any;
                        if (buyerData && (buyerData.buyername || buyerData.buyerName)) {
                            companyName = buyerData.buyername || buyerData.buyerName;
                        }
                    } catch (e) {
                        console.error("Could not fetch buyer info for toast message", e);
                    }
                }

                toast.success(`Your profile is submitted and is getting reviewed by ${companyName}. They will verify.`);
                refreshChangeRequests();
            } catch (error) {
                console.error("Failed to submit onboarding", error);
                toast.error("Failed to submit profile. Please try again.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <SupplierRoleContext.Provider value={{
            role,
            status,
            setRole,
            setStatus,
            isReadOnly: isCriticalFieldReadOnly,
            canSubmit,
            canManageUsers,
            submitOnboarding,
            isSubmitting,
            allPendingRequests,
            refreshChangeRequests
        }}>
            {children}
        </SupplierRoleContext.Provider>
    );
}

export function useSupplierRole() {
    const context = useContext(SupplierRoleContext);
    if (context === undefined) {
        throw new Error("useSupplierRole must be used within a SupplierRoleProvider");
    }
    return context;
}
