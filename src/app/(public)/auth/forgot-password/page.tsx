"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Invalid email format");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await apiClient.post("/auth/forgot-password", { email });
            setSubmitted(true);
        } catch (err: any) {
            console.error(err);
            setError("Failed to process request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const bgStyle = { background: "linear-gradient(135deg, #0d1433 0%, #0f2060 60%, #132d8a 100%)" };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={bgStyle}>
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/30 p-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        If an account exists for <strong>{email}</strong>, we have sent a password reset link.
                    </p>
                    <Link href="/auth/login">
                        <Button className="w-full h-11 mt-4 rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0f2060, #1a3a9f)" }}>
                            Return to Sign In
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={bgStyle}>
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">SDN Tech</span>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl shadow-black/30 p-8 space-y-6">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 mx-auto">
                        <Mail className="h-6 w-6 text-blue-600" />
                    </div>

                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
                        <p className="text-gray-500 text-sm">
                            Enter your email and we'll send you a reset link.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="h-11 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-gray-50/60 placeholder:text-gray-400"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-500">{error}</p>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11 text-sm font-semibold rounded-xl"
                            style={{ background: "linear-gradient(135deg, #0f2060, #1a3a9f)" }}
                            disabled={submitting}
                        >
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Reset Link
                        </Button>
                    </form>

                    <div className="pt-2 border-t border-gray-100">
                        <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs text-blue-200/40 mt-6">
                    © {new Date().getFullYear()} SDN Tech · Procurement Platform
                </p>
            </div>
        </div>
    );
}
