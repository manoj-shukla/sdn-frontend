"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore, mapBuyerResponseToProfile, BuyerApiResponse } from "@/lib/store/auth-store";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { User } from "@/types/auth";

const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z.object({
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export default function LoginPage() {
    const router = useRouter();
    // Get registered buyers from store
    const { login, registeredBuyers } = useAuthStore();
    const [error, setError] = useState<string | null>(null);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [pendingUser, setPendingUser] = useState<any>(null);
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [changingPassword, setChangingPassword] = useState(false);
    const [changeError, setChangeError] = useState<string | null>(null);

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const changePasswordForm = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
    });

    const redirectToRole = (user: any) => {
        switch (user.role) {
            case "ADMIN":
                router.push("/admin/dashboard");
                break;
            case "BUYER":
                router.push("/buyer/dashboard");
                break;
            case "SUPPLIER":
                router.push("/supplier/dashboard");
                break;
            default:
                router.push("/");
        }
    };

    const onSubmit = async (data: LoginValues) => {
        setError(null);
        try {
            const response = await apiClient.post('/auth/login', {
                username: data.email, // backend still uses 'username' field to represent both in its query. This works because the query searches `username = ? OR email = ?`
                password: data.password
            }) as any;

            const { token, user } = response;

            // Store token in localStorage for API client
            localStorage.setItem("token", token);

            // Handle potential different user structures
            let authenticatedUser = user;

            // Check if it's the new Buyer API response (lowercase keys)
            if (user.buyerid) {
                authenticatedUser = mapBuyerResponseToProfile(user as BuyerApiResponse);
            }

            // Check if user must change password
            if (authenticatedUser.mustChangePassword) {
                setPendingUser(authenticatedUser);
                setPendingToken(token);
                setCurrentPassword(data.password);
                setShowChangePassword(true);
                return;
            }

            // Set cookies for Middleware (authentication & RBAC)
            document.cookie = `token=${token}; path=/; max-age=3600`;
            document.cookie = `role=${authenticatedUser.role || 'BUYER'}; path=/; max-age=3600`;

            // Update auth state
            login(authenticatedUser as any);

            // Redirect based on role
            redirectToRole(authenticatedUser);

        } catch (err: any) {
            console.error(err);
            setError("Invalid credentials or server error");
        }
    };

    const onChangePassword = async (data: ChangePasswordValues) => {
        setChangeError(null);
        setChangingPassword(true);
        try {
            await apiClient.post('/auth/change-password', {
                currentPassword: currentPassword,
                newPassword: data.newPassword,
            });

            // Set cookies for Middleware (authentication & RBAC)
            document.cookie = `token=${pendingToken}; path=/; max-age=3600`;
            document.cookie = `role=${pendingUser.role || 'BUYER'}; path=/; max-age=3600`;

            // Update auth state
            login(pendingUser as any);

            // Redirect based on role
            redirectToRole(pendingUser);

        } catch (err: any) {
            console.error(err);
            setChangeError(err.response?.data?.error || err.message || "Failed to change password");
        } finally {
            setChangingPassword(false);
        }
    };

    if (showChangePassword) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Change Your Password</CardTitle>
                    <CardDescription>
                        You must set a new password before continuing. This is a one-time requirement.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="Enter new password"
                                {...changePasswordForm.register("newPassword")}
                                disabled={changingPassword}
                            />
                            {changePasswordForm.formState.errors.newPassword && (
                                <p className="text-sm text-destructive">{changePasswordForm.formState.errors.newPassword.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm new password"
                                {...changePasswordForm.register("confirmPassword")}
                                disabled={changingPassword}
                            />
                            {changePasswordForm.formState.errors.confirmPassword && (
                                <p className="text-sm text-destructive">{changePasswordForm.formState.errors.confirmPassword.message}</p>
                            )}
                        </div>
                        {changeError && <p className="text-sm font-medium text-destructive">{changeError}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={changingPassword}>
                            {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Set New Password & Continue
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            placeholder="name@company.com"
                            {...form.register("email")}
                            disabled={form.formState.isSubmitting}
                        />
                        {form.formState.errors.email && (
                            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <a href="/auth/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</a>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            {...form.register("password")}
                            disabled={form.formState.isSubmitting}
                        />
                        {form.formState.errors.password && (
                            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                        )}
                    </div>
                    {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
