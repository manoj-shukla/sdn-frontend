export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                {children}
            </div>
        </div>
    );
}
