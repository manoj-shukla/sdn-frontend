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
        <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-gray-200/50 bg-white/70 px-6 backdrop-blur-lg shadow-sm">
            <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>
                <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">SDN Tech</Link>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                    <Link href="#features" className="hover:text-blue-600 transition-colors">Features</Link>
                    <Link href="#solutions" className="hover:text-blue-600 transition-colors">Solutions</Link>
                </div>

                {!isLoginPage && (
                    <>
                        {user ? (
                            <div className="flex items-center gap-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="flex items-center gap-2 text-slate-700 hover:bg-slate-100">
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
