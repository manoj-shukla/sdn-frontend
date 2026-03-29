"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api/client";

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

        if (passwords.new !== passwords.confirm) {
            setError("Passwords do not match");
            return;
        }

        if (passwords.new.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await apiClient.post("/auth/reset-password", {
                token,
                newPassword: passwords.new
            });
            setSuccess(true);
            setTimeout(() => router.push("/auth/login"), 3000);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || "Failed to reset password. Token may be invalid or expired.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!token) {
        return (
            <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Invalid Link</h3>
                <p className="text-muted-foreground mb-4">This password reset link is invalid or missing a token.</p>
                <Link href="/auth/login">
                    <Button variant="outline">Return to Login</Button>
                </Link>
            </CardContent>
        );
    }

    if (success) {
        return (
            <CardContent className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Password Reset Complete</h3>
                <p className="text-muted-foreground mb-4">Your password has been successfully updated. Redirecting to login...</p>
                <Link href="/auth/login">
                    <Button>Sign In</Button>
                </Link>
            </CardContent>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="new-pass">New Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="new-pass"
                            type="password"
                            placeholder="New password"
                            className="pl-10"
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                            required
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-pass">Confirm Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="confirm-pass"
                            type="password"
                            placeholder="Confirm new password"
                            className="pl-10"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            required
                        />
                    </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
                </Button>
            </CardFooter>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Set New Password</CardTitle>
                <CardDescription>
                    Please enter your new password below.
                </CardDescription>
            </CardHeader>
            <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}>
                <ResetPasswordContent />
            </Suspense>
        </Card>
    );
}
