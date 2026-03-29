import { LandingNav } from "@/components/layout/landing-nav";
import { Footer } from "@/components/layout/footer";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <LandingNav />
            <main className="flex-1 pt-16">
                {children}
            </main>
            <Footer />
        </div>
    );
}
