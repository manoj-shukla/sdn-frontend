"use client";

import Link from "next/link";
import { ContactDialog } from "@/components/public/contact-dialog";

export function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 py-12">
            <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <span className="font-semibold text-slate-900">SDN Tech</span>
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
