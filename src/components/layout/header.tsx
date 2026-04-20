"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Mail, Loader2, AlertCircle, ChevronRight, Building2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useSupplierOnboardingStore } from "@/lib/store/supplier-onboarding-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import { useMessageStore } from "@/lib/store/message-store";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
    const router = useRouter();
    const { user, switchProfile } = useAuthStore();
    const { completedSections, supplierId, unreadCount: messagesUnreadCount } = useSupplierOnboardingStore();
    const { unreadCount } = useNotificationStore();
    const { unreadCount: buyerMessagesUnreadCount, fetchMessages } = useMessageStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);

    // Fetch initial message counts for buyers
    useEffect(() => {
        if (user?.role === 'BUYER' || user?.role === 'ADMIN') {
            fetchMessages();
        }
    }, [user, fetchMessages]);

    // Notification polling is handled by NotificationPoller component
    // We just read from the store
    const displayUnreadCount = unreadCount;
    const displayMessagesCount = user?.role === 'SUPPLIER' ? messagesUnreadCount : buyerMessagesUnreadCount;
    // Update link to point to notifications page instead of messages
    const notificationLink = user?.role === 'SUPPLIER' ? '/supplier/notifications' : '/buyer/notifications';
    const messagesLink = user?.role === 'SUPPLIER' ? '/supplier/messages' : 
                         user?.role === 'ADMIN' ? '/admin/messages' : '/buyer/messages';

    const isSubmitEnabled = Object.values(completedSections).every(Boolean);
    const showSubmitButton = user?.role === 'SUPPLIER' && !['APPROVED', 'PENDING', 'SUBMITTED'].includes(user?.approvalStatus || '');

    const sectionInfo: Record<string, { label: string; hint: string }> = {
        company: { label: 'Company Details', hint: 'Add legal name and business type' },
        address: { label: 'Registered Address', hint: 'Add street, city and postal code' },
        contact: { label: 'Contact Person', hint: 'Add contact name and position' },
        tax: { label: 'Tax Information', hint: 'Add PAN/Tax ID and GST details' },
        bank: { label: 'Bank Details', hint: 'Add bank name, account and IFSC/routing' },
        documents: { label: 'Documents', hint: 'Upload required documents' },
        messages: { label: 'Messages', hint: 'Check your messages' }
    };

    const missingSections = Object.entries(completedSections)
        .filter(([, isComplete]) => !isComplete)
        .map(([section]) => ({
            key: section,
            ...sectionInfo[section]
        }));

    const handleSubmit = async () => {
        if (!supplierId) return;
        setIsSubmitting(true);
        try {
            await apiClient.post(`/api/suppliers/${supplierId}/reviews/submit`);
            toast.success("Submitted for approval!");
            window.location.reload();
        } catch (e: any) {
            console.error(e);
            toast.error("Submission failed. " + (e.response?.data?.error || "Please try again."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const navigateToSection = (section: string) => {
        setPopoverOpen(false);
        router.push(`/supplier/onboarding/${section}`);
    };

    return (
        <header className="flex h-14 items-center gap-4 border-b border-gray-200 bg-gray-50 px-6">
            <div className="flex flex-1 items-center gap-4">
                {/* Header Actions for Supplier */}
                {showSubmitButton && (
                    isSubmitEnabled ? (
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit for Approval
                        </Button>
                    ) : (
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-amber-500 text-amber-700 hover:bg-amber-50"
                                >
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Submit for Approval
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="start">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Complete these sections first:</p>
                                    <div className="space-y-1">
                                        {missingSections.map((section) => (
                                            <button
                                                key={section.key}
                                                onClick={() => navigateToSection(section.key)}
                                                className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors text-left"
                                            >
                                                <div className="flex w-full items-center justify-between">
                                                    <span className="font-medium">{section.label}</span>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <span className="text-xs text-muted-foreground">{section.hint}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )
                )}

                {/* Profile Switcher for Multi-Buyer Suppliers */}
                {user?.role === 'SUPPLIER' && (user.memberships?.length || 0) > 1 && (
                    <div className="flex items-center gap-2 border-l pl-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 hover:bg-muted font-normal text-muted-foreground">
                                    <Building2 className="h-4 w-4" />
                                    <span className="max-w-[150px] truncate font-medium text-foreground">
                                        {user.memberships?.find(m => String(m.supplierId) === String(user.activeSupplierId))?.buyerName || "Select Organization"}
                                    </span>
                                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {user.memberships?.map((membership) => (
                                    <DropdownMenuItem
                                        key={membership.supplierId}
                                        onClick={() => {
                                            switchProfile(String(membership.supplierId));
                                            toast.success(`Switched to ${membership.buyerName}`);
                                            // Optional: reload to clear state, but store update should trigger re-renders
                                            router.refresh();
                                        }}
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium">{membership.buyerName}</span>
                                            <span className="text-xs text-muted-foreground">{membership.supplierName}</span>
                                        </div>
                                        {String(membership.supplierId) === String(user.activeSupplierId) && (
                                            <Check className="h-4 w-4 text-blue-600" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {/* Notifications and Profile */}
            {(user?.role === 'SUPPLIER' || user?.role === 'BUYER') && (
                <div className="flex items-center gap-4">
                    {/* Messages Icon */}
                    <Link href={messagesLink} className={`relative cursor-pointer p-2 rounded-full transition-colors ${displayMessagesCount > 0 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200'}`}>
                        <Mail className={`h-4 w-4 ${displayMessagesCount > 0 ? 'text-gray-700' : 'text-gray-500'}`} />
                        {displayMessagesCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white shadow-sm ring-2 ring-white">
                                {displayMessagesCount}
                            </span>
                        )}
                    </Link>
                    {/* Notifications Icon */}
                    <Link href={notificationLink} className={`relative cursor-pointer p-2 rounded-full transition-colors ${displayUnreadCount > 0 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200'}`}>
                        <Bell className={`h-4 w-4 ${displayUnreadCount > 0 ? 'text-gray-700' : 'text-gray-500'}`} />
                        {displayUnreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white shadow-sm ring-2 ring-white">
                                {displayUnreadCount}
                            </span>
                        )}
                    </Link>
                    <div className="flex flex-col items-end justify-center border-l border-gray-200 pl-4 gap-1">
                        <span className="font-semibold text-sm leading-none capitalize text-gray-800">
                            {user.role === 'SUPPLIER' ? (user.supplierName || "Company Name") : user.username}
                        </span>
                        {user.role === 'SUPPLIER' && (
                            <Badge variant={
                                user.approvalStatus === 'APPROVED' ? 'default' :
                                    user.approvalStatus === 'REJECTED' ? 'destructive' : 'secondary'
                            } className="text-[10px] px-2 py-0 h-4 min-h-0">
                                {user.approvalStatus?.replace("_", " ") || "DRAFT"}
                            </Badge>
                        )}
                        {user.role === 'BUYER' && (
                            <span className="text-[10px] text-gray-500 leading-none">Buyer Account</span>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
