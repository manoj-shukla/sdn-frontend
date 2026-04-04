"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Lock, CheckCircle2, XCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import Link from "next/link";
import apiClient from "@/lib/api/client";

export default function AcceptInvitePage() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-10">
            <Card className="w-full max-w-lg shadow-md">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-center">Complete Your Registration</CardTitle>
                </CardHeader>
                <React.Suspense fallback={
                    <CardContent className="py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading invitation...</p>
                    </CardContent>
                }>
                    <AcceptInviteContent />
                </React.Suspense>
            </Card>
        </div>
    );
}

function AcceptInviteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { login } = useAuthStore();

    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<any>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        companyName: "",
        businessType: "",
        country: "",
        password: "",
        confirmPassword: ""
    });

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setError("No invitation token provided. Please check your email link.");
                setLoading(false);
                return;
            }

            try {
                const data = await apiClient.get(`/api/invitations/validate?token=${token}`) as any;

                const mappedInvitation = {
                    ...data,
                    buyerName: data.buyerName || data.buyername,
                    legalName: data.legalName || data.legalname,
                    country: data.country,
                    supplierType: data.supplierType || data.suppliertype,
                    email: data.email,
                    status: data.status,
                    invitationLink: data.invitationLink || data.invitationlink
                };

                setInvitation(mappedInvitation);
                setFormData(prev => ({
                    ...prev,
                    companyName: mappedInvitation.legalName || "",
                    country: mappedInvitation.country || "India",
                    businessType: mappedInvitation.supplierType || "Enterprise"
                }));
            } catch (err: any) {
                console.error("Validation error", err);
                setError(err.response?.data?.error || "Failed to validate invitation. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (!formData.companyName.trim()) {
            setError("Company name is required");
            return;
        }

        if (!formData.country.trim()) {
            setError("Country is required");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const data = await apiClient.post(`/api/invitations/accept?token=${token}`, {
                companyName: formData.companyName,
                businessType: formData.businessType,
                country: formData.country,
                password: formData.password
            }) as any;

            // Auto-login with the returned token
            localStorage.setItem("token", data.token);
            document.cookie = `token=${data.token}; path=/; max-age=3600`;
            document.cookie = `role=${data.user.role}; path=/; max-age=3600`;

            // Validate mapped user object from response if needed
            login(data.user);

            setSuccess(true);

            // Redirect to supplier dashboard after a short delay
            setTimeout(() => {
                router.push("/supplier/dashboard");
            }, 2000);

        } catch (err: any) {
            console.error("Accept invitation error", err);
            setError(err.response?.data?.error || "Failed to complete registration. Please try again.");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Validating invitation...</p>
            </CardContent>
        );
    }

    if (error && !invitation) {
        return (
            <>
                <CardHeader className="text-center">
                    <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                    <CardTitle>Invalid Invitation</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Optional: Add manual token entry if link is broken */}
                    <div className="text-sm text-center text-muted-foreground mb-4">
                        If you have a token code, you can try pasting it here:
                    </div>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const val = (e.currentTarget.elements.namedItem('manualToken') as HTMLInputElement).value;
                        if (val) window.location.href = `/auth/accept-invite?token=${val}`;
                    }} className="flex gap-2">
                        <Input name="manualToken" placeholder="Paste token here..." />
                        <Button type="submit">Validate</Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <Link href="/">
                        <Button variant="outline">Go to Home</Button>
                    </Link>
                </CardFooter>
            </>
        );
    }

    if (success) {
        return (
            <>
                <CardHeader className="text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <CardTitle>Account Created!</CardTitle>
                    <CardDescription>
                        Your supplier account has been set up successfully. Redirecting to your dashboard...
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                </CardContent>
            </>
        );
    }

    return (
        <>
            <CardHeader>
                <CardDescription className="text-center">
                    You've been invited by <strong>{invitation?.buyerName || "a buyer"}</strong> to join as a supplier.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={invitation?.email || ""}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Legal Name</Label>
                            <Input
                                id="companyName"
                                placeholder="e.g. Acme Corp"
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                disabled={submitting}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="businessType">Business Type</Label>
                            <Input
                                id="businessType"
                                placeholder="e.g. Enterprise, SME"
                                value={formData.businessType}
                                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                                disabled={submitting}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                            id="country"
                            placeholder="e.g. India, USA"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            disabled={submitting}
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-sm font-medium text-destructive">{error}</p>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <CardTitle className="text-center">Creating Account...</CardTitle>
                            </>
                        ) : (
                            <>
                                <Lock className="mr-2 h-4 w-4" />
                                Complete Registration
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </>
    );
}
