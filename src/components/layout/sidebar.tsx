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
import {
    LogOut, User, FileText, LayoutDashboard, ClipboardCheck,
    Send, MapPin, Users, CreditCard, KeyRound, Loader2,
    PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import apiClient from "@/lib/api/client";

import { useEffect, useState } from "react";

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const { unreadCount: notificationsCount } = useNotificationStore();
    const { unreadCount: messagesCount, activeSection, status: onboardingStatus } = useSupplierOnboardingStore();
    const [isMounted, setIsMounted] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);
    const [changeError, setChangeError] = useState<string | null>(null);
    const [changeSuccess, setChangeSuccess] = useState(false);
    // isPinned = true means sidebar is pinned in COLLAPSED (icon-only) mode on desktop
    const [isPinned, setIsPinned] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [onboardingCount, setOnboardingCount] = useState(0);
    const [activeRfiCount, setActiveRfiCount] = useState(0);
    const [supplierRfiCount, setSupplierRfiCount] = useState(0);
    const [supplierRfpCount, setSupplierRfpCount] = useState(0);

    const { role: contextRole } = useBuyerRole();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const mobile = typeof window !== "undefined" && window.innerWidth < 768;
        setIsMobile(mobile);

        const savedPin = localStorage.getItem("sidebar-pinned");
        if (savedPin !== null) {
            setIsPinned(savedPin === "true");
        } else {
            setIsPinned(false);
        }

        const handleResize = () => {
            const newMobile = window.innerWidth < 768;
            setIsMobile((prevMobile) => {
                if (newMobile !== prevMobile) {
                    setIsPinned(false);
                    localStorage.setItem("sidebar-pinned", "false");
                }
                return newMobile;
            });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (isMounted) {
            localStorage.setItem("sidebar-pinned", isPinned.toString());
        }
    }, [isPinned, isMounted]);

    useEffect(() => {
        const fetchCounts = async () => {
            if (!user) return;
            const role = user.role.toUpperCase();

            try {
                if (role === "BUYER") {
                    const [onboardingRes, rfiRes] = await Promise.allSettled([
                        apiClient.get('/api/approvals/count'),
                        apiClient.get('/api/rfi/events/active-count')
                    ]);
                    if (onboardingRes.status === 'fulfilled') {
                        setOnboardingCount((onboardingRes.value as any)?.count || 0);
                    }
                    if (rfiRes.status === 'fulfilled') {
                        setActiveRfiCount((rfiRes.value as any)?.count || 0);
                    }
                } else if (role === "SUPPLIER") {
                    const [rfiCountRes, rfpCountRes] = await Promise.allSettled([
                        apiClient.get('/api/rfi/invitations/count'),
                        apiClient.get('/api/rfp/my/invitations/count')
                    ]);
                    if (rfiCountRes.status === 'fulfilled') {
                        setSupplierRfiCount((rfiCountRes.value as any)?.count || 0);
                    }
                    if (rfpCountRes.status === 'fulfilled') {
                        setSupplierRfpCount((rfpCountRes.value as any)?.count || 0);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch sidebar counts:", error);
            }
        };

        if (isMounted && user) {
            fetchCounts();
        }
    }, [isMounted, user, pathname]);

    if (!isMounted) {
        return (
            <div
                className="flex h-screen w-16 flex-col border-r animate-pulse shrink-0"
                style={{ background: "linear-gradient(180deg, #0d1433 0%, #0f2060 50%, #132d8a 100%)" }}
            />
        );
    }

    // Sidebar logic:
    // Mobile: always icon-only (w-16), no text, no pin button
    // Desktop + isPinned: icon-only unless hovered → then expands to full
    // Desktop + !isPinned: full sidebar (w-64)
    const isIconOnly = isMobile || isPinned;
    const showFull = !isIconOnly || (isPinned && isHovered);

    if (!user) return null;

    const roleKey = Object.keys(navConfig).find(
        (key) => key.toUpperCase() === user.role.toUpperCase()
    );
    const allItems = roleKey ? navConfig[roleKey] : [];
    const userSubRole = contextRole || (user as any).subRole || "User";

    // Approved suppliers should not see the ONBOARDING nav category
    const isSupplierApproved =
        roleKey?.toUpperCase() === "SUPPLIER" &&
        (
            (user.approvalStatus || '').toUpperCase() === 'APPROVED' ||
            onboardingStatus.toUpperCase() === 'APPROVED'
        );

    const items = allItems.reduce<(NavItem | NavCategory)[]>((acc, item) => {
        if ("category" in item) {
            // Hide ONBOARDING section for approved suppliers
            if (item.category === "ONBOARDING" && isSupplierApproved) {
                return acc;
            }
            const filteredSubItems = item.items.filter((subItem) => {
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

    // Determine the active nav item.
    // Onboarding items now use path-based routing (/supplier/onboarding/<section>),
    // so the simple pathname.startsWith match below handles them.
    // The legacy ?section= branch is retained for safety in case any nav item
    // ever needs query-param-based matching again.
    const activeItem = items
        .flatMap((entry) => ("category" in entry ? entry.items : [entry]))
        .filter((item) => {
            const [hrefPath, hrefQuery] = item.href.split('?');
            if (hrefQuery) {
                const hrefSection = new URLSearchParams(hrefQuery).get('section');
                return (pathname === hrefPath || pathname.startsWith(hrefPath + '/')) &&
                    activeSection === hrefSection;
            }
            return pathname === item.href || pathname.startsWith(item.href + '/');
        })
        .sort((a, b) => b.href.length - a.href.length)[0];

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
            await apiClient.post("/auth/change-password", { currentPassword, newPassword });
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

    const sidebarBg = "linear-gradient(180deg, #0d1433 0%, #0f2060 60%, #132d8a 100%)";

    // user.username is the display name field (User type has username, not name)
    const displayName = user.username || user.email || "User";
    const userInitials = displayName
        .split(/[\s@]/)
        .filter(Boolean)
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    // NavLink renders a navigation item with optional native tooltip when collapsed
    const NavLink = ({
        icon: Icon,
        title,
        href,
        isActive,
        badge,
    }: {
        icon: React.ElementType;
        title: string;
        href: string;
        isActive: boolean;
        badge?: number;
    }) => (
        <Link
            href={href}
            title={!showFull ? title : undefined}
            className={cn(
                "group flex items-center rounded-xl transition-all duration-200 relative",
                showFull ? "gap-3 px-3 py-2.5 w-full" : "justify-center p-2.5 w-10 h-10",
                isActive
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
            )}
        >
            <Icon
                className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-white" : "text-white/65 group-hover:text-white"
                )}
            />
            {showFull && (
                <span className="flex-1 text-sm font-medium truncate">{title}</span>
            )}
            {showFull && badge !== undefined && badge > 0 && (
                <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {badge}
                </span>
            )}
            {!showFull && badge !== undefined && badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white border border-[#0d1433]">
                    {badge > 9 ? "9+" : badge}
                </span>
            )}
        </Link>
    );

    return (
        <>
            <div
                className={cn(
                    "flex h-screen flex-col border-r border-white/10 transition-all duration-300 ease-in-out overflow-hidden shrink-0",
                    showFull ? "w-64" : "w-16"
                )}
                style={{ background: sidebarBg }}
                onMouseEnter={() => !isMobile && isPinned && setIsHovered(true)}
                onMouseLeave={() => { if (!isMobile && isPinned) setIsHovered(false); }}
            >
                {/* ── Header ── */}
                <div
                    className={cn(
                        "flex h-16 items-center border-b border-white/10 shrink-0",
                        showFull ? "px-4 gap-3" : "justify-center px-0"
                    )}
                >
                    <div className="relative flex h-9 w-9 items-center justify-center shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30" />
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-5 w-5 relative">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                    </div>
                    {showFull && (
                        <div className="flex flex-col leading-tight flex-1 min-w-0">
                            <span className="text-base font-bold tracking-tight text-white truncate">SDN Tech</span>
                            <span className="text-[9px] font-semibold text-blue-300/70 tracking-wider uppercase">
                                Procurement Platform
                            </span>
                        </div>
                    )}
                    {/* Pin/Unpin — desktop only, shows when sidebar is expanded */}
                    {!isMobile && showFull && (
                        <button
                            onClick={() => setIsPinned(!isPinned)}
                            title={isPinned ? "Unpin (keep expanded)" : "Pin to icon-only mode"}
                            className={cn(
                                "p-1.5 rounded-lg transition-all shrink-0",
                                isPinned
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "text-white/50 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            {isPinned ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                        </button>
                    )}
                </div>

                {/* ── Navigation ── */}
                <div
                    className={cn(
                        "flex-1 overflow-y-auto py-3",
                        "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent",
                        "[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full",
                        "hover:[&::-webkit-scrollbar-thumb]:bg-white/35"
                    )}
                >
                    <nav className={cn("space-y-4", showFull ? "px-3" : "px-2")}>
                        {items.map((entry: NavItem | NavCategory, entryIdx: number) => {
                            if ("category" in entry) {
                                return (
                                    <div key={entryIdx} className="space-y-0.5">
                                        {showFull && (
                                            <h3 className="px-3 text-[9px] font-bold text-blue-300/50 uppercase tracking-[0.2em] mb-2">
                                                {entry.category}
                                            </h3>
                                        )}
                                        {!showFull && entryIdx > 0 && (
                                            <div className="border-t border-white/10 my-2 mx-1" />
                                        )}
                                        <div className={cn("space-y-0.5", !showFull && "flex flex-col items-center")}>
                                            {entry.items.map((item, itemIdx) => {
                                                const isActive = activeItem?.href === item.href;
                                                const badge =
                                                    item.badgeCount !== undefined
                                                        ? item.badgeCount
                                                        : item.title === "Messages"
                                                        ? messagesCount
                                                        : item.title === "Notifications"
                                                        ? notificationsCount
                                                        : item.title === "Onboarding"
                                                        ? onboardingCount
                                                        : item.title === "RFI Events"
                                                        ? activeRfiCount
                                                        : item.title === "RFI Inbox"
                                                        ? supplierRfiCount
                                                        : item.title === "RFP Invitations"
                                                        ? supplierRfpCount
                                                        : undefined;
                                                return (
                                                    <NavLink
                                                        key={itemIdx}
                                                        icon={item.icon}
                                                        title={item.title}
                                                        href={item.href}
                                                        isActive={isActive}
                                                        badge={badge}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            }

                            const isActive = activeItem?.href === entry.href;
                            return (
                                <div key={entryIdx} className={cn(!showFull && "flex justify-center")}>
                                    <NavLink
                                        icon={entry.icon}
                                        title={entry.title}
                                        href={entry.href}
                                        isActive={isActive}
                                    />
                                </div>
                            );
                        })}
                    </nav>
                </div>

                {/* ── Footer (fixed at bottom) ── */}
                <div
                    className={cn(
                        "border-t border-white/10 py-2 space-y-0.5 shrink-0",
                        showFull ? "px-3" : "px-2"
                    )}
                >
                    <button
                        title={!showFull ? "Change Password" : undefined}
                        className={cn(
                            "group flex items-center rounded-xl w-full transition-all duration-200 text-white/55 hover:bg-white/10 hover:text-white",
                            showFull ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"
                        )}
                        onClick={() => setIsChangePasswordOpen(true)}
                    >
                        <KeyRound className="h-4 w-4 shrink-0 transition-colors group-hover:text-white" />
                        {showFull && <span className="text-sm font-medium">Change Password</span>}
                    </button>

                    <button
                        title={!showFull ? "Logout" : undefined}
                        className={cn(
                            "group flex items-center rounded-xl w-full transition-all duration-200 text-white/55 hover:bg-red-500/20 hover:text-red-400",
                            showFull ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"
                        )}
                        onClick={() => {
                            logout();
                            document.cookie = "token=; path=/; max-age=0";
                            document.cookie = "role=; path=/; max-age=0";
                            window.location.href = "/auth/login";
                        }}
                    >
                        <LogOut className="h-4 w-4 shrink-0 transition-colors" />
                        {showFull && <span className="text-sm font-medium">Logout</span>}
                    </button>
                </div>
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
                                <Label htmlFor="cpCurrentPassword">Current Password</Label>
                                <Input
                                    id="cpCurrentPassword"
                                    type="password"
                                    placeholder="Enter current password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    disabled={changingPassword}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cpNewPassword">New Password</Label>
                                <Input
                                    id="cpNewPassword"
                                    type="password"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={changingPassword}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cpConfirmPassword">Confirm New Password</Label>
                                <Input
                                    id="cpConfirmPassword"
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={changingPassword}
                                />
                            </div>
                            {changeError && (
                                <p className="text-sm font-medium text-destructive">{changeError}</p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={closeChangePasswordDialog}>
                            {changeSuccess ? "Close" : "Cancel"}
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
        </>
    );
}
