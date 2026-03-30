import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const token = request.cookies.get("token")?.value;
    const role = request.cookies.get("role")?.value;
    const { pathname } = request.nextUrl;

    // 1. Redirect to login if not authenticated and accessing protected routes
    const protectedPaths = ["/admin", "/buyer", "/supplier"];
    const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

    if (isProtected && !token) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Role-Based Access Control
    if (isProtected && token && role) {
        if (pathname.startsWith("/admin") && role !== "ADMIN") {
            return NextResponse.redirect(new URL("/403", request.url)); // Or redirect to their dashboard
        }
        if (pathname.startsWith("/buyer") && role !== "BUYER") {
            // Allow ADMIN access to RFI question library only (super admin manages questions)
            if (role === "ADMIN" && pathname.startsWith("/buyer/rfi/questions")) {
                return NextResponse.next();
            }
            // Allow ADMIN access to the RFI layout root (needed for question library navigation)
            if (role === "ADMIN" && pathname === "/buyer/rfi") {
                // Redirect admin to questions page directly
                return NextResponse.redirect(new URL("/buyer/rfi/questions", request.url));
            }
            return NextResponse.redirect(new URL("/403", request.url));
        }
        if (pathname.startsWith("/supplier") && role !== "SUPPLIER") {
            // Admin views supplier via /admin/suppliers/[id] not /supplier/dashboard
            return NextResponse.redirect(new URL("/403", request.url));
        }
    }

    // 3. Prevent authenticated users from visiting login
    if (pathname.startsWith("/auth/login") && token && role) {
        if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        if (role === "BUYER") return NextResponse.redirect(new URL("/buyer/dashboard", request.url));
        if (role === "SUPPLIER") return NextResponse.redirect(new URL("/supplier/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/buyer/:path*",
        "/supplier/:path*",
        "/auth/:path*",
    ],
};
