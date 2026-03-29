"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
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
            // Even on error, we might want to show success to prevent enumeration, 
            // but for debugging let's log it.
            console.error(err);
            setError("Failed to process request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle>Check your email</CardTitle>
                    <CardDescription>
                        If an account exists for {email}, we have sent a password reset link.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="justify-center">
                    <Link href="/auth/login">
                        <Button variant="ghost">Return to Sign In</Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                    Enter your email address and we'll send you a link to reset your password.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                className="pl-10"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                    </Button>
                    <Link href="/auth/login" className="w-full">
                        <Button variant="ghost" type="button" className="w-full">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                        </Button>
                    </Link>
                </CardFooter>
            </form>
        </Card>
    );
}
