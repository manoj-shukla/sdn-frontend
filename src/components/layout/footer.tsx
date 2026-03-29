"use client";

import Link from "next/link";
import { ContactDialog } from "@/components/public/contact-dialog";

export function Footer() {
    return (
        <footer className="border-t bg-background py-12">
            <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                        <defs>
                            <linearGradient id="footerLogoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#6366f1" />
                                <stop offset="1" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                        <rect width="36" height="36" rx="10" fill="url(#footerLogoGrad)" />
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
                    <span className="font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">SDN Tech</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    © 2026 SDN Tech Inc. All rights reserved.
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <Link href="/auth/login" className="hover:underline">Login</Link>
                    <ContactDialog>
                        <button className="hover:underline hover:text-foreground/80 transition-colors text-left">Contact Us</button>
                    </ContactDialog>
                    <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
                    <Link href="/terms" className="hover:underline">Terms of Service</Link>
                </div>
            </div>
        </footer>
    );
}
