"use client";

import { AdminRoleProvider } from "./context/AdminRoleContext";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminRoleProvider>
            {children}
        </AdminRoleProvider>
    );
}
