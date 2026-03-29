"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import { useSupplierOnboardingStore } from "@/lib/store/supplier-onboarding-store";
import { useBuyerRole } from "@/app/(protected)/buyer/context/BuyerRoleContext";
import { navConfig, NavItem, NavCategory } from "@/config/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LogOut, User, FileText, LayoutDashboard, ClipboardCheck, Send, MapPin, Users, CreditCard, KeyRound, Loader2 } from "lucide-react";
import apiClient from "@/lib/api/client";

import { useEffect, useState } from "react";

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const { unreadCount: notificationsCount } = useNotificationStore();
    const { unreadCount: messagesCount } = useSupplierOnboardingStore();
    const [isMounted, setIsMounted] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);
    const [changeError, setChangeError] = useState<string | null>(null);
    const [changeSuccess, setChangeSuccess] = useState(false);

    // Always call hook, provider is guaranteed by ProtectedLayout now
    const { role: contextRole, canViewApprovals } = useBuyerRole();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Prevent hydration mismatch
    if (!isMounted) {
        return <div className="flex h-screen w-64 flex-col border-r bg-card animate-pulse" />;
    }

    if (!user) return null;

    // Case-insensitive lookup for role (buyer -> BUYER)
    const roleKey = Object.keys(navConfig).find(key => key.toUpperCase() === user.role.toUpperCase());
    const allItems = roleKey ? navConfig[roleKey] : [];

    // Filter by SubRole if defined
    // Prioritize the context role (simulated) over the token role
    const userSubRole = contextRole || (user as any).subRole || "User";

    // Dynamic Items Logic
    let displayItems = allItems;

    // Restriction for Unapproved Suppliers
    if (roleKey === 'SUPPLIER') {
        const status = user.approvalStatus;
        if (status !== 'APPROVED') {
            // ... (keep supplier logic)
            displayItems = [
                { title: "Dashboard", href: "/supplier/dashboard?section=dashboard", icon: LayoutDashboard },
                { title: "Company Details", href: "/supplier/dashboard?section=company", icon: User },
                { title: "Registered Address", href: "/supplier/dashboard?section=address", icon: MapPin },
                { title: "Contact Person", href: "/supplier/dashboard?section=contact", icon: Users },
                { title: "Tax Information", href: "/supplier/dashboard?section=tax", icon: FileText },
                { title: "Bank Details", href: "/supplier/dashboard?section=bank", icon: CreditCard },
                { title: "Documents", href: "/supplier/dashboard?section=documents", icon: ClipboardCheck },
                { title: "Messages", href: "/supplier/dashboard?section=messages", icon: Send },
            ];
        }
    }

    // Filtering updated for Categorized structure
    const items = displayItems.reduce<(NavItem | NavCategory)[]>((acc, item) => {
        if ('category' in item) {
            const filteredSubItems = item.items.filter(subItem => {
                if (!subItem.allowedSubRoles) return true;
                return subItem.allowedSubRoles.includes(userSubRole);
            });
            if (filteredSubItems.length > 0) {
                acc.push({ ...item, items: filteredSubItems });
            }
        } else {
            if (!item.allowedSubRoles || item.allowedSubRoles.includes(userSubRole)) {
                acc.push(item);
            }
        }
        return acc;
    }, []);

    const activeItem = items
        .flatMap(entry => 'category' in entry ? entry.items : [entry])
        .filter(item => pathname === item.href || pathname.startsWith(item.href + '/'))
        .sort((a, b) => b.href.length - a.href.length)[0];

    const branding = (user as any).branding;

    const handleChangePassword = async () => {
        setChangeError(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setChangeError("All fields are required");
            return;
        }
        if (newPassword.length < 6) {
            setChangeError("New password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setChangeError("New passwords don't match");
            return;
        }

        setChangingPassword(true);
        try {
            await apiClient.post('/auth/change-password', {
                currentPassword,
                newPassword,
            });
            setChangeSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setChangeError(err.response?.data?.error || err.message || "Failed to change password");
        } finally {
            setChangingPassword(false);
        }
    };

    const closeChangePasswordDialog = () => {
        setIsChangePasswordOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setChangeError(null);
        setChangeSuccess(false);
    };

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-[#0a192f] text-slate-300">
            {/* Header / Logo */}
            <div className="flex h-16 items-center border-b border-slate-800/50 px-6 gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center shrink-0">
                    <div className="absolute inset-0 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="h-5 w-5 relative">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-lg font-bold tracking-tight text-white">SDN Tech</span>
                    <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">Procurement Platform</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">

                {/* Buyer AI Assistant Card (Top of Buyer sidebar) */}
                {user.role.toUpperCase() === 'BUYER' && (
                    <div className="px-4 mb-6">
                        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-xl p-3 border border-blue-500/20 flex items-center gap-3 cursor-pointer hover:from-blue-600/30 hover:to-indigo-600/30 transition-all">
                            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg text-lg">
                                🤖
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-blue-400">SDN Assistant</span>
                                <span className="text-[10px] text-slate-500">Ask me anything...</span>
                            </div>
                        </div>
                    </div>
                )}

                <nav className="space-y-6 px-4">
                    {items.map((entry: NavItem | NavCategory, entryIdx: number) => {
                        if ('category' in entry) {
                            return (
                                <div key={entryIdx} className="space-y-1">
                                    <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">
                                        {entry.category}
                                    </h3>
                                    <div className="space-y-0.5">
                                        {entry.items.map((item, itemIdx) => {
                                            const isActive = activeItem?.href === item.href;
                                            return (
                                                <Link
                                                    key={itemIdx}
                                                    href={item.href}
                                                    className={cn(
                                                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200",
                                                        isActive
                                                            ? "bg-blue-600/10 text-blue-400 shadow-[inset_0_0_10px_rgba(37,99,235,0.1)] border border-blue-500/20"
                                                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                                    )}
                                                >
                                                    <item.icon className={cn(
                                                        "h-4 w-4 transition-colors",
                                                        isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                                                    )} />
                                                    <span className="flex-1">{item.title}</span>
                                                    {item.badgeCount !== undefined && (
                                                        <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                                                            {item.badgeCount}
                                                        </span>
                                                    )}
                                                    {item.title === 'Messages' && messagesCount > 0 && (
                                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                                                            {messagesCount}
                                                        </span>
                                                    )}
                                                    {item.title === 'Notifications' && notificationsCount > 0 && (
                                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                                                            {notificationsCount}
                                                        </span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }

                        // Fallback for flat items (Admin)
                        const isActive = activeItem?.href === entry.href;
                        return (
                            <Link
                                key={entryIdx}
                                href={entry.href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200",
                                    isActive
                                        ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                )}
                            >
                                <entry.icon className={cn(
                                    "h-4 w-4 transition-colors",
                                    isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                                )} />
                                <span className="flex-1">{entry.title}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t p-4 space-y-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="group w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-200"
                    onClick={() => setIsChangePasswordOpen(true)}
                >
                    <KeyRound className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                    Change Password
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="group w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-200"
                    onClick={() => {
                        logout();
                        // Clear cookies on logout
                        document.cookie = "token=; path=/; max-age=0";
                        document.cookie = "role=; path=/; max-age=0";
                        window.location.href = "/auth/login";
                    }}
                >
                    <LogOut className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                    Logout
                </Button>
            </div>

            {/* Change Password Dialog */}
            <Dialog open={isChangePasswordOpen} onOpenChange={closeChangePasswordDialog}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5" />
                            Change Password
                        </DialogTitle>
                        <DialogDescription>
                            Enter your current password and choose a new one.
                        </DialogDescription>
                    </DialogHeader>

                    {changeSuccess ? (
                        <div className="py-6 text-center space-y-2">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                <KeyRound className="h-6 w-6 text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-green-700">Password changed successfully!</p>
                            <p className="text-xs text-muted-foreground">Your new password is now active.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    placeholder="Enter current password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    disabled={changingPassword}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={changingPassword}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmNewPassword"
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={changingPassword}
                                />
                            </div>
                            {changeError && <p className="text-sm font-medium text-destructive">{changeError}</p>}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={closeChangePasswordDialog}>
                            {changeSuccess ? 'Close' : 'Cancel'}
                        </Button>
                        {!changeSuccess && (
                            <Button onClick={handleChangePassword} disabled={changingPassword}>
                                {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
