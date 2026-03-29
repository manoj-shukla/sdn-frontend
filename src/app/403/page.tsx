import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ForbiddenPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">403</h1>
            <p className="mt-4 text-xl text-muted-foreground">Access Denied</p>
            <p className="mt-2 text-muted-foreground">
                You do not have permission to access this resource.
            </p>
            <div className="mt-8">
                <Button asChild>
                    <Link href="/auth/login">Return to Login</Link>
                </Button>
            </div>
        </div>
    );
}
