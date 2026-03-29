import { BuyerRoleProvider } from "./context/BuyerRoleContext";
import { NotificationPoller } from "@/components/layout/notification-poller";

export default function BuyerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <NotificationPoller />
            {children}
        </>
    );
}
