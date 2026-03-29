import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BuyerRoleProvider } from "./buyer/context/BuyerRoleContext";

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <BuyerRoleProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                <Sidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
                        <Breadcrumbs />
                        {children}
                    </main>
                </div>
            </div>
        </BuyerRoleProvider>
    );
}
