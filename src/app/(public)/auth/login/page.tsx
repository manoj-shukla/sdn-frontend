"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuthStore, mapBuyerResponseToProfile, BuyerApiResponse } from "@/lib/store/auth-store";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z.object({
    newPassword: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

// ── Decorative graphic for the left panel ──
function BrandGraphic() {
    return (
        <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm">
            {/* Background circles */}
            <circle cx="240" cy="240" r="200" fill="#3b82f6" fillOpacity="0.05" />
            <circle cx="240" cy="240" r="150" fill="#3b82f6" fillOpacity="0.05" />
            <circle cx="240" cy="240" r="100" fill="#3b82f6" fillOpacity="0.08" />

            {/* Central hub */}
            <circle cx="240" cy="240" r="36" fill="#3b82f6" fillOpacity="0.1" />
            <circle cx="240" cy="240" r="24" fill="#3b82f6" fillOpacity="0.15" />
            {/* Hub icon: supply chain node */}
            <path d="M232 236 L240 228 L248 236 L248 248 L232 248 Z" fill="#1e293b" fillOpacity="0.8" />
            <circle cx="240" cy="240" r="5" fill="#3b82f6" />

            {/* Connector lines */}
            <line x1="240" y1="204" x2="240" y2="130" stroke="#1e293b" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="240" y1="276" x2="240" y2="350" stroke="#1e293b" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="204" y1="240" x2="130" y2="240" stroke="#1e293b" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="276" y1="240" x2="350" y2="240" stroke="#1e293b" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 4" />
            {/* Diagonal connectors */}
            <line x1="215" y1="215" x2="155" y2="155" stroke="#1e293b" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="265" y1="265" x2="325" y2="325" stroke="#1e293b" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="265" y1="215" x2="325" y2="155" stroke="#1e293b" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="215" y1="265" x2="155" y2="325" stroke="#1e293b" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Outer nodes */}
            {/* Top */}
            <circle cx="240" cy="118" r="22" fill="#3b82f6" fillOpacity="0.08" />
            <circle cx="240" cy="118" r="14" fill="#3b82f6" fillOpacity="0.12" />
            <path d="M235 115 L240 110 L245 115 L245 122 L235 122 Z" fill="#1e293b" fillOpacity="0.7" />

            {/* Bottom */}
            <circle cx="240" cy="362" r="22" fill="#3b82f6" fillOpacity="0.08" />
            <circle cx="240" cy="362" r="14" fill="#3b82f6" fillOpacity="0.12" />
            <rect x="233" y="355" width="14" height="14" rx="2" fill="#1e293b" fillOpacity="0.7" />

            {/* Left */}
            <circle cx="118" cy="240" r="22" fill="#3b82f6" fillOpacity="0.08" />
            <circle cx="118" cy="240" r="14" fill="#3b82f6" fillOpacity="0.12" />
            <path d="M113 236 L122 236 L122 244 L113 244 Z" fill="none" stroke="#1e293b" strokeWidth="2" strokeOpacity="0.7" />
            <line x1="118" y1="240" x2="118" y2="244" stroke="#1e293b" strokeWidth="2" strokeOpacity="0.7" />

            {/* Right */}
            <circle cx="362" cy="240" r="22" fill="#3b82f6" fillOpacity="0.08" />
            <circle cx="362" cy="240" r="14" fill="#3b82f6" fillOpacity="0.12" />
            <circle cx="362" cy="240" r="6" fill="#3b82f6" fillOpacity="0.7" />
            <circle cx="362" cy="240" r="3" fill="#3b82f6" />

            {/* Corner nodes */}
            <circle cx="155" cy="155" r="16" fill="#3b82f6" fillOpacity="0.05" />
            <circle cx="155" cy="155" r="10" fill="#3b82f6" fillOpacity="0.1" />
            <path d="M151 151 L159 151 L159 159 L151 159 Z" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeOpacity="0.6" />

            <circle cx="325" cy="325" r="16" fill="#3b82f6" fillOpacity="0.05" />
            <circle cx="325" cy="325" r="10" fill="#3b82f6" fillOpacity="0.1" />
            <path d="M320 325 L325 320 L330 325 L325 330 Z" fill="#1e293b" fillOpacity="0.6" />

            <circle cx="325" cy="155" r="16" fill="#3b82f6" fillOpacity="0.05" />
            <circle cx="325" cy="155" r="10" fill="#3b82f6" fillOpacity="0.1" />
            <rect x="319" y="149" width="12" height="12" rx="2" fill="#1e293b" fillOpacity="0.6" />

            <circle cx="155" cy="325" r="16" fill="#3b82f6" fillOpacity="0.05" />
            <circle cx="155" cy="325" r="10" fill="#3b82f6" fillOpacity="0.1" />
            <circle cx="155" cy="325" r="5" fill="#1e293b" fillOpacity="0.6" />

            {/* Pulsing ring */}
            <circle cx="240" cy="240" r="52" stroke="#3b82f6" strokeOpacity="0.1" strokeWidth="1" fill="none" />
            <circle cx="240" cy="240" r="72" stroke="#3b82f6" strokeOpacity="0.05" strokeWidth="1" fill="none" />
        </svg>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuthStore();
    const [error, setError] = useState<string | null>(null);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [pendingUser, setPendingUser] = useState<any>(null);
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [changingPassword, setChangingPassword] = useState(false);
    const [changeError, setChangeError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const changePasswordForm = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });

    const redirectToRole = (user: any) => {
        switch (user.role) {
            case "ADMIN": router.push("/admin/dashboard"); break;
            case "BUYER": router.push("/buyer/dashboard"); break;
            case "SUPPLIER": router.push("/supplier/dashboard"); break;
            default: router.push("/");
        }
    };

    const onSubmit = async (data: LoginValues) => {
        setError(null);
        try {
            const response = await apiClient.post("/auth/login", {
                username: data.email,
                password: data.password,
            }) as any;

            const { token, user } = response;
            localStorage.setItem("token", token);

            let authenticatedUser = user;
            if (user.buyerid) {
                authenticatedUser = mapBuyerResponseToProfile(user as BuyerApiResponse);
            }

            document.cookie = `token=${token}; path=/; max-age=3600`;
            document.cookie = `role=${authenticatedUser.role || "BUYER"}; path=/; max-age=3600`;
            login(authenticatedUser as any);
            redirectToRole(authenticatedUser);
        } catch (err: any) {
            setError("Invalid credentials or server error");
        }
    };

    const onChangePassword = async (data: ChangePasswordValues) => {
        setChangeError(null);
        setChangingPassword(true);
        try {
            await apiClient.post("/auth/change-password", {
                currentPassword,
                newPassword: data.newPassword,
            });

            // Refresh token so the new JWT reflects mustChangePassword: false from the DB
            const refreshResult = await apiClient.post("/auth/refresh-token") as any;
            const freshToken = refreshResult.token;
            const freshUser = refreshResult.user;

            localStorage.setItem("token", freshToken);
            document.cookie = `token=${freshToken}; path=/; max-age=3600`;
            document.cookie = `role=${freshUser.role || pendingUser.role || "BUYER"}; path=/; max-age=3600`;
            login(freshUser as any);
            redirectToRole(freshUser);
        } catch (err: any) {
            setChangeError(err.response?.data?.error || err.message || "Failed to change password");
        } finally {
            setChangingPassword(false);
        }
    };

    // ── Set New Password view ──
    if (showChangePassword) {
        return (
            <div className="min-h-screen flex bg-[#f8fafc]">
                {/* Left branding panel */}
                <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500 blur-3xl opacity-20" />
                        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-indigo-400 blur-3xl opacity-20" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold text-slate-900">SDN Tech</span>
                        </div>
                        <BrandGraphic />
                        <div className="space-y-2 max-w-xs">
                            <h2 className="text-2xl font-bold text-slate-900">Secure Your Account</h2>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Setting a strong password helps protect your procurement data and transactions.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right form panel */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6">
                        <div className="space-y-1">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 lg:hidden">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
                            <p className="text-gray-500 text-sm">You must set a new password before continuing.</p>
                        </div>

                        <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-700">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Enter new password"
                                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-gray-50/60"
                                    {...changePasswordForm.register("newPassword")}
                                    disabled={changingPassword}
                                />
                                {changePasswordForm.formState.errors.newPassword && (
                                    <p className="text-xs text-red-500">{changePasswordForm.formState.errors.newPassword.message}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirm new password"
                                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-gray-50/60"
                                    {...changePasswordForm.register("confirmPassword")}
                                    disabled={changingPassword}
                                />
                                {changePasswordForm.formState.errors.confirmPassword && (
                                    <p className="text-xs text-red-500">{changePasswordForm.formState.errors.confirmPassword.message}</p>
                                )}
                            </div>

                            {changeError && (
                                <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                                    {changeError}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all"
                                disabled={changingPassword}
                            >
                                {changingPassword ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting Password...</>
                                ) : (
                                    "Set Password & Continue"
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main Login view ──
    return (
        <div className="min-h-screen flex bg-[#f8fafc]">
            {/* Left branding panel */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full bg-blue-500 blur-3xl opacity-10" />
                    <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-indigo-400 blur-3xl opacity-10" />
                </div>

                <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-sm">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">SDN Tech</span>
                    </div>

                    {/* Graphic */}
                    <BrandGraphic />

                    {/* Copy */}
                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-slate-900 leading-tight">
                            Intelligent Procurement Platform
                        </h2>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Streamline your supply chain with real-time supplier management, smart RFIs, and end-to-end procurement workflows — all in one place.
                        </p>
                    </div>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {["Supplier Management", "Smart RFI", "Analytics", "Approvals"].map((f) => (
                            <span
                                key={f}
                                className="px-3 py-1 rounded-full border border-slate-200 text-slate-600 text-xs font-medium bg-white/50 backdrop-blur-sm"
                            >
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 mb-8 lg:hidden">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">SDN Tech</span>
                    </div>

                    {/* Card */}
                    <div className="bg-white rounded-3xl shadow-2xl shadow-black/30 p-8 space-y-6">
                        {/* Header */}
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
                            <p className="text-gray-500 text-sm">Sign in to your procurement portal</p>
                        </div>

                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    autoComplete="email"
                                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-gray-50/60 placeholder:text-gray-400 transition-all"
                                    {...form.register("email")}
                                    disabled={form.formState.isSubmitting}
                                />
                                {form.formState.errors.email && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        {form.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                                        Password
                                    </Label>
                                    <Link
                                        href="/auth/forgot-password"
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="h-11 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl bg-gray-50/60 placeholder:text-gray-400 transition-all pr-10"
                                        {...form.register("password")}
                                        disabled={form.formState.isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {form.formState.errors.password && (
                                    <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                className="w-full h-11 text-sm font-semibold rounded-xl transition-all duration-200 group"
                                style={{ background: "linear-gradient(135deg, #0f2060, #1a3a9f)" }}
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Sign In
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                )}
                            </Button>
                        </form>

                        {/* Footer */}
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-center text-xs text-gray-500">
                                Need an account?{" "}
                                <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                                    Contact your administrator
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* Bottom text */}
                    <p className="text-center text-xs text-slate-400 mt-6 font-medium">
                        © {new Date().getFullYear()} SDN Tech · Procurement Platform
                    </p>
                </div>
            </div>
        </div>
    );
}
