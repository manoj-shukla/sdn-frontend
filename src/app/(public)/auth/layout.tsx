export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Each auth page (login, forgot-password, etc.) controls its own full-screen layout.
    return <>{children}</>;
}
