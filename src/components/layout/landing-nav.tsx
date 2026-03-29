"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LogOut, User, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";


export function LandingNav() {
    const { user, logout } = useAuthStore();
    const pathname = usePathname();
    const isLoginPage = pathname === "/auth/login";

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9">
                    <defs>
                        <linearGradient id="navLogoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#6366f1" />
                            <stop offset="1" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                    <rect width="36" height="36" rx="10" fill="url(#navLogoGrad)" />
                    <circle cx="12" cy="10" r="2.5" fill="white" opacity="0.9" />
                    <circle cx="24" cy="10" r="2.5" fill="white" opacity="0.9" />
                    <circle cx="18" cy="18" r="3" fill="white" />
                    <circle cx="10" cy="26" r="2.5" fill="white" opacity="0.9" />
                    <circle cx="26" cy="26" r="2.5" fill="white" opacity="0.9" />
                    <line x1="12" y1="10" x2="18" y2="18" stroke="white" strokeWidth="1.2" opacity="0.5" />
                    <line x1="24" y1="10" x2="18" y2="18" stroke="white" strokeWidth="1.2" opacity="0.5" />
                    <line x1="18" y1="18" x2="10" y2="26" stroke="white" strokeWidth="1.2" opacity="0.5" />
                    <line x1="18" y1="18" x2="26" y2="26" stroke="white" strokeWidth="1.2" opacity="0.5" />
                    <line x1="12" y1="10" x2="24" y2="10" stroke="white" strokeWidth="1" opacity="0.3" />
                    <line x1="10" y1="26" x2="26" y2="26" stroke="white" strokeWidth="1" opacity="0.3" />
                </svg>
                <Link href="/" className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">SDN Tech</Link>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                    <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
                    <Link href="#solutions" className="hover:text-primary transition-colors">Solutions</Link>
                </div>

                {!isLoginPage && (
                    <>
                        {user ? (
                            <div className="flex items-center gap-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            <span>{user.username}</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href="/admin/dashboard" className="flex items-center gap-2 cursor-pointer">
                                                <LayoutDashboard className="h-4 w-4" />
                                                <span>Dashboard</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
                                            <LogOut className="h-4 w-4 mr-2" />
                                            <span>Logout</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ) : (
                            <Button asChild variant="ghost">
                                <Link href="/auth/login">Login</Link>
                            </Button>
                        )}
                    </>
                )}


            </div>
        </nav>
    );
}
