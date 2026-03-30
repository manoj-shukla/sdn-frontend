"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api/client";

const bgStyle = { background: "linear-gradient(135deg, #0d1433 0%, #0f2060 60%, #132d8a 100%)" };

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [passwords, setPasswords] = useState({ new: "", confirm: "" });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (passwords.new.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (passwords.new !== passwords.confirm) {
            setError("Passwords don't match");
            return;
        }
        setSubmitting(true);
        try {
            await apiClient.post("/auth/reset-password", {
                token,
                newPassword: passwords.new,
            });
            setSuccess(true);
            setTimeout(() => router.push("/auth/login"), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to reset password. Token may be invalid or expired.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={bgStyle}>
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/30 p-8 text-center space-y-4">
                    <AlertCircle className="h-14 w-14 text-red-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-900">Invalid Link</h2>
                    <p className="text-gray-500 text-sm">This password reset link is invalid or missing a token.</p>
                    <Link href="/auth/login">
                        <Button className="w-full h-11 rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0f2060, #1a3a9f)" }}>
                            Return to Login
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={bgStyle}>
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/30 p-8 text-center space-y-4">
                    <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-900">Password Reset Complete</h2>
                    <p className="text-gray-500 text-sm">Your password has been successfully updated. Redirecting to login…</p>
                    <Link href="/auth/login">
                        <Button className="w-full h-11 rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0f2060, #1a3a9f)" }}>
                            Sign In
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
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 mx-auto">
                        <KeyRound className="h-6 w-6 text-blue-600" />
                    </div>

                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
                        <p className="text-gray-500 text-sm">Please enter your new password below.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-pass" className="text-sm font-semibold text-gray-700">New Password</Label>
                            <Input
                                id="new-pass"
                                type="password"
                                placeholder="New password"
                                className="h-11 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-gray-50/60"
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-pass" className="text-sm font-semibold text-gray-700">Confirm Password</Label>
                            <Input
                                id="confirm-pass"
                                type="password"
                                placeholder="Confirm new password"
                                className="h-11 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-gray-50/60"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11 text-sm font-semibold rounded-xl"
                            style={{ background: "linear-gradient(135deg, #0f2060, #1a3a9f)" }}
                            disabled={submitting}
                        >
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reset Password
                        </Button>
                    </form>

                    <div className="pt-2 border-t border-gray-100">
                        <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
                <div className="bg-white rounded-3xl p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
