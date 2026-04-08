import {
    LucideIcon,
    LayoutDashboard,
    Users,
    UserSquare2,
    FileText,
    ClipboardCheck,
    ClipboardList,
    Send,
    User,
    Shield,
    GitBranch,
    CheckCircle,
    BarChart,
    Settings,
    CreditCard,
    MapPin,
    Bell,
    CheckSquare,
    Search,
    UserPlus,
    Hammer,
    Zap,
    TrendingUp,
    Trophy,
    FileSignature,
    Briefcase,
    Building2,
    Link,
    Store,
    ShoppingBag,
    History,
    FileCheck,
    HelpCircle
} from "lucide-react";

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    allowedSubRoles?: string[];
    badgeCount?: number; // Optional static badge count
}

export interface NavCategory {
    category: string;
    items: NavItem[];
}

export type NavConfigGroup = (NavItem | NavCategory)[];

export const navConfig: Record<string, NavConfigGroup> = {
    ADMIN: [
        { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { title: "Buyers", href: "/admin/buyers", icon: Users },
        { title: "Internal Team", href: "/admin/users", icon: User },
        { title: "Messages", href: "/admin/messages", icon: Send },
        { title: "Question Library", href: "/buyer/rfi/questions", icon: HelpCircle },
    ],
    BUYER: [
        {
            category: "OVERVIEW",
            items: [
                { title: "Dashboard", href: "/buyer/dashboard", icon: LayoutDashboard },
                { title: "My Tasks", href: "/buyer/tasks", icon: CheckSquare }, 
                { title: "Notifications", href: "/buyer/notifications", icon: Bell }, // Placeholder
                { title: "Messages", href: "/buyer/messages", icon: Send },
            ]
        },
        {
            category: "SUPPLIERS",
            items: [
                { title: "Supplier Directory", href: "/buyer/suppliers", icon: Search },
                { title: "Onboarding", href: "/buyer/onboarding", icon: UserPlus },
                { title: "Risk & Compliance", href: "/buyer/compliance", icon: Shield },
                { title: "Performance", href: "/buyer/performance", icon: TrendingUp },
                { title: "Supplier Portal", href: "/buyer/portal", icon: Store },
            ]
        },
        {
            category: "SOURCING",
            items: [
                { title: "RFI Module", href: "/buyer/rfi", icon: ClipboardList },
                { title: "RFQ / RFP", href: "/buyer/rfp", icon: FileText },
                { title: "Auctions", href: "/buyer/auctions", icon: Zap },
                { title: "Bid Analysis", href: "/buyer/bids", icon: BarChart },
                { title: "Award Decisions", href: "/buyer/awards", icon: Trophy },
                { title: "Contracts", href: "/buyer/contracts", icon: FileSignature },
            ]
        },
        {
            category: "ADMINISTRATION",
            items: [
                { title: "User Management", href: "/buyer/users", icon: Users, allowedSubRoles: ['Admin', 'Buyer Admin'] },
                { title: "Org Structure", href: "/buyer/circles", icon: Building2 }, // Mapping Circles to Org Structure
                { title: "Roles & Permissions", href: "/buyer/roles", icon: Shield, allowedSubRoles: ['Admin', 'Buyer Admin'] },
                { title: "Workflows", href: "/buyer/workflows", icon: GitBranch, allowedSubRoles: ['Admin', 'Buyer Admin'] },
                { title: "Integrations", href: "/buyer/integrations", icon: Link },
            ]
        }
    ],
    SUPPLIER: [
        {
            category: "MY PORTAL",
            items: [
                { title: "Dashboard", href: "/supplier/dashboard", icon: LayoutDashboard },
                { title: "Notifications", href: "/supplier/notifications", icon: Bell },
                { title: "Messages", href: "/supplier/messages", icon: Send },
            ]
        },
        {
            category: "SOURCING",
            items: [
                { title: "RFI Inbox", href: "/supplier/rfi", icon: ClipboardList },
                { title: "RFP Invitations", href: "/supplier/rfp", icon: FileText },
                { title: "Open RFQs", href: "/supplier/rfqs", icon: FileText },
                { title: "My Bids", href: "/supplier/bids", icon: Hammer },
                { title: "Awards", href: "/supplier/awards", icon: Trophy },
                { title: "Bid History", href: "/supplier/history", icon: History },
            ]
        },
        {
            category: "BUSINESS",
            items: [
                { title: "Purchase Orders", href: "/supplier/orders", icon: ShoppingBag },
                { title: "Invoices", href: "/supplier/invoices", icon: FileText },
                { title: "Payments", href: "/supplier/payments", icon: CreditCard },
            ]
        },
        {
            category: "COMPLIANCE",
            items: [
                { title: "My Documents", href: "/supplier/documents", icon: ClipboardCheck },
                { title: "Certifications", href: "/supplier/certifications", icon: FileCheck },
                { title: "Performance", href: "/supplier/performance", icon: BarChart },
                { title: "Company Profile", href: "/supplier/profile", icon: User },
                { title: "Settings", href: "/supplier/settings", icon: Settings },
            ]
        }
    ],
};
