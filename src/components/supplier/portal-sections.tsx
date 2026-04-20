"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSupplierOnboardingStore, OnboardingSection } from "@/lib/store/supplier-onboarding-store";
import { Loader2, Upload, FileText, Check, AlertCircle, ChevronDown, ChevronUp, Mail, MailOpen, Bell } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import { format } from "date-fns";
import { DashboardStats } from "./dashboard-stats";
import { AnalyticsCharts } from "./analytics-charts";
import { ApprovalWorkflowProgress } from "@/components/shared/ApprovalWorkflowProgress";

// ────────────────────────────────────────────────────────────────────────────────
// Shared helper: navigate to an onboarding section.
//
// Why this exists:
//   Onboarding sections live at /supplier/onboarding/<section>. Updating the
//   Zustand store's activeSection alone doesn't change the URL, which means
//   Next/Back buttons that only called setActiveSection() would save data but
//   leave the user on the same page. This hook keeps the store and the URL
//   in sync — router.push() causes the [section] route to re-render with the
//   new section, and its own effect then updates the store.
// ────────────────────────────────────────────────────────────────────────────────
function useSectionNavigate() {
    const router = useRouter();
    const setActiveSection = useSupplierOnboardingStore((s) => s.setActiveSection);
    return (section: OnboardingSection) => {
        setActiveSection(section);
        router.push(`/supplier/onboarding/${section}`);
    };
}

// ... existing code ...

// --- DASHBOARD OVERVIEW ---
export function DashboardOverview() {
    const { user } = useAuthStore();
    const { status } = useSupplierOnboardingStore();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                    <p className="text-muted-foreground">Welcome back. Here is your onboarding status and performance overview.</p>
                </div>
            </div>

            {status === 'REWORK_REQUIRED' && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-md animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-orange-900">Action Required: Your profile needs revision</h3>
                            <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                                A buyer has requested changes to your profile. Please check your **Notifications** for specific feedback, update the required fields, and resubmit.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {status === 'REJECTED' && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-red-900">Profile Not Approved</h3>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                Your onboarding application has been rejected. Please review our compliance standards or contact support for more details.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Display Workflow Progress if Submitted/Under Review/Rework */}
            {(status === 'SUBMITTED' || status === 'IN_REVIEW' || status === 'REWORK_REQUIRED') && (user as any)?.supplierId && (
                <div className="mt-6 mb-8">
                    <ApprovalWorkflowProgress supplierId={(user as any).supplierId} isSupplierView={true} />
                </div>
            )}

            <DashboardStats />

            <div className="mt-8">
                <AnalyticsCharts />
            </div>
        </div>
    );
}


// --- NOTIFICATIONS SECTION ---
export function NotificationsSection() {
    const { notificationsData, fetchNotifications, markAsRead } = useNotificationStore();
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const { user } = useAuthStore();

    useEffect(() => {
        const load = async () => {
            try {
                const supplierId = (user as any)?.supplierId;
                if (supplierId) {
                    await fetchNotifications({ recipientRole: 'SUPPLIER', supplierId });
                }
            } catch (e) {
                console.error("Failed to load notifications", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user, fetchNotifications]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'APPROVAL_APPROVED':      return <Check className="h-5 w-5 text-green-600" />;
            case 'APPROVAL_REJECTED':      return <AlertCircle className="h-5 w-5 text-red-600" />;
            case 'REWORK_REQUIRED':        return <AlertCircle className="h-5 w-5 text-orange-600" />;
            case 'CHANGE_REQUEST_SUBMITTED': return <Check className="h-5 w-5 text-blue-600" />;
            default: return <Bell className="h-5 w-5 text-blue-600" />;
        }
    };

    const handleRowClick = (id: number, isRead: boolean) => {
        // Clicking a row both toggles expansion and marks as read. No separate button needed.
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            if (!isRead) markAsRead(id);
        }
    };

    const sortedNotifications = [...notificationsData].sort((a: any, b: any) =>
        new Date(b.createdAt || b.createdat || 0).getTime() - new Date(a.createdAt || a.createdat || 0).getTime()
    );

    return (
        <Card className="overflow-hidden border-none shadow-md">
            <CardHeader className="bg-muted/30">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-600" />
                    Notifications
                </CardTitle>
                <CardDescription>System alerts and status updates. Click any notification to expand and mark it as viewed.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                ) : sortedNotifications.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground bg-muted/5">
                        <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No notifications yet</p>
                        <p className="text-sm">New alerts will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {sortedNotifications.map((n: any) => {
                            const id = n.notificationid || n.notificationId;
                            const isRead = n.isread || n.isRead;
                            const createdAt = n.createdat || n.createdAt;
                            const isExpanded = expandedId === id;

                            return (
                                <div
                                    key={id}
                                    className={`group transition-all ${!isRead ? 'bg-blue-50/20' : ''}`}
                                >
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isExpanded}
                                        onClick={() => handleRowClick(id, !!isRead)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleRowClick(id, !!isRead);
                                            }
                                        }}
                                        className="p-4 cursor-pointer flex items-center justify-between gap-4 hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${!isRead ? 'bg-blue-100' : 'bg-muted'}`}>
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`flex items-center gap-2 ${!isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                                    <span className="truncate">{n.type ? n.type.replace(/_/g, ' ') : 'System Notification'}</span>
                                                    {!isRead && <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="unread" />}
                                                </div>
                                                <div className={`text-sm truncate ${!isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {n.message?.substring(0, 120)}{n.message?.length > 120 ? '…' : ''}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {createdAt ? format(new Date(createdAt), "MMM d, h:mm a") : ""}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-6 pb-5 pt-2 animate-in slide-in-from-top-1 duration-200">
                                            <div className="bg-muted/50 rounded-lg p-5 border border-border/50 shadow-inner">
                                                <div className="text-sm leading-relaxed whitespace-pre-wrap">{n.message}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- MESSAGES SECTION ---
export function MessagesSection() {
    const { messagesData, setMessagesData, markMessageAsRead } = useSupplierOnboardingStore();
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const { user } = useAuthStore();

    // Fetch messages on mount
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                // Determine supplierId
                let supplierId = (user as any)?.supplierId;

                // If not in auth store, try to fetch from API
                if (!supplierId) {
                    try {
                        const userRes = await apiClient.get('/auth/me') as any;
                        supplierId = userRes.supplierId;
                    } catch (e) { /* ignore */ }
                }

                if (supplierId) {
                    const msgs = await apiClient.get(`/api/suppliers/${supplierId}/messages`) as any;
                    setMessagesData(msgs);
                }
            } catch (e) {
                console.error("Failed to fetch messages", e);
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [user, setMessagesData]);

    const toggleMessage = async (msg: any) => {
        const messageId = msg.messageId || msg.messageid;
        const isRead = msg.isRead !== undefined ? msg.isRead : msg.isread;

        if (expandedId === messageId) {
            setExpandedId(null);
        } else {
            setExpandedId(messageId);
            if (!isRead) {
                markMessageAsRead(messageId);
                // API Call
                try {
                    await apiClient.patch(`/api/messages/${messageId}/read`);
                    // Update local state to reflect read status immediately
                    setMessagesData(messagesData.map((m: any) =>
                        (m.messageId === messageId || m.messageid === messageId) ? { ...m, isRead: true, isread: true } : m
                    ));
                } catch (e) { console.error(e); }
            }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Inbox ({messagesData.filter((m: any) => !m.isRead && !m.isread).length} unread)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
                ) : messagesData.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No messages found.</div>
                ) : (
                    <div className="divide-y">
                        {messagesData.map((msg: any) => {
                            const messageId = msg.messageId || msg.messageid;
                            const isRead = msg.isRead !== undefined ? msg.isRead : msg.isread;
                            const senderName = msg.senderName || msg.sendername;
                            const sentAt = msg.sentAt || msg.sentat;

                            return (
                                <div key={messageId} className={`transition-colors hover:bg-muted/50 ${!isRead ? 'bg-blue-50/50' : ''}`}>
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer gap-4"
                                        onClick={() => toggleMessage(msg)}
                                    >
                                        <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                            <div className={`p-2 rounded-full ${!isRead ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                                                {isRead ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`flex items-center gap-2 ${!isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                                    <span className="truncate">{senderName || "Buyer Admin"}</span>
                                                    {!isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                                                </div>
                                                <div className={`text-sm truncate ${!isRead ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                    {msg.subject}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {sentAt ? format(new Date(sentAt), "MMM d, h:mm a") : ""}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                                            <div className="flex flex-row items-center gap-2">
                                                {!isRead && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleMessage(msg); // Just use toggle which handles read marking
                                                        }}
                                                    >
                                                        Mark View
                                                    </Button>
                                                )}
                                                <div className="text-xs text-muted-foreground">
                                                    {sentAt ? new Date(sentAt).toLocaleDateString() : ''}
                                                </div>
                                            </div>
                                            {expandedId === messageId ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {expandedId === messageId && (
                                        <div className="p-4 bg-muted/30 border-t">
                                            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
export function CompanySection() {
    const { status, companyDetails, setCompanyDetails, markSectionComplete, supplierId, taxDetails, bankDetails, setActiveSection } = useSupplierOnboardingStore();
    const navigateTo = useSectionNavigate();
    const { user } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    // Lock fields ONLY if under active buyer review
    const isLocked = ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL'].includes(status);

    // Initial check
    useEffect(() => {
        markSectionComplete('company', true);
    }, []);

    const handleChange = (field: string, value: string) => {
        setCompanyDetails({ ...companyDetails, [field]: value });
    };

    const handleSave = async () => {
        if (!supplierId) {
            toast.error("Error: Missing Supplier ID");
            return;
        }
        setIsSaving(true);
        try {
            const mapCountryToISO = (country: string) => {
                if (!country) return '';
                const c = country.toLowerCase().trim();
                if (c === 'india' || c === 'ind') return 'IN';
                if (c === 'usa' || c === 'united states' || c === 'us') return 'US';
                if (c === 'uk' || c === 'united kingdom') return 'GB';
                if (c === 'maldives') return 'MV';
                if (c.length === 2) return country.toUpperCase();
                return country.substring(0, 2).toUpperCase();
            };
            const payload = {
                legalName: companyDetails.legalName,
                country: mapCountryToISO(companyDetails.country),
                businessType: companyDetails.businessType,
                website: companyDetails.website,
                description: companyDetails.description,
                taxId: taxDetails.taxId || taxDetails.pan,
                bankName: bankDetails.bankName,
                accountNumber: bankDetails.accountNumber,
                routingNumber: bankDetails.routingNumber,
            };
            await apiClient.put(`/api/suppliers/${supplierId}`, payload);
            toast.success("Company details saved");
            navigateTo('address');
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to save: " + e.message);
        }
        finally { setIsSaving(false); }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Company Details</CardTitle>
                <CardDescription>Verify your registered business information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="legalName">Legal Name</Label>
                        <Input
                            id="legalName"
                            value={companyDetails.legalName || ''}
                            onChange={(e) => handleChange('legalName', e.target.value)}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                            id="country"
                            value={companyDetails.country || ''}
                            onChange={(e) => handleChange('country', e.target.value)}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type</Label>
                        <Input
                            id="businessType"
                            value={companyDetails.businessType || ''}
                            onChange={(e) => handleChange('businessType', e.target.value)}
                            placeholder="e.g. Corporation, LLC"
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Website</Label>
                        <Input
                            value={companyDetails.website || ''}
                            onChange={(e) => handleChange('website', e.target.value)}
                            placeholder="https://example.com"
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>Description</Label>
                        <Input
                            value={companyDetails.description || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Brief description of your business..."
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                </div>
                {!isLocked && (
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Next Step
                        </Button>
                    </div>
                )}
                {isLocked && (
                    <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Profile submitted - fields are locked
                        </div>
                        <Button variant="outline" onClick={() => navigateTo('address')}>
                            Next: Address
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function AddressSection() {
    const { status, companyDetails, setCompanyDetails, markSectionComplete, supplierId, setActiveSection } = useSupplierOnboardingStore();
    const navigateTo = useSectionNavigate();
    const { user } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    const isLocked = ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL'].includes(status);

    // Initial validation on mount
    useEffect(() => {
        const isValid = !!companyDetails.address && !!companyDetails.city && !!companyDetails.zip;
        markSectionComplete('address', isValid);
    }, [companyDetails.address, companyDetails.city, companyDetails.zip, markSectionComplete]);

    const handleChange = (field: string, value: string) => {
        const newData = { ...companyDetails, [field]: value };
        setCompanyDetails(newData);
        const isValid = !!newData.address && !!newData.city && !!newData.zip;
        markSectionComplete('address', isValid);
    };

    const handleSave = async () => {
        if (!supplierId) {
            toast.error("Error: Missing Supplier ID");
            return;
        }
        setIsSaving(true);
        try {
            const mapCountryToISO = (country: string) => {
                if (!country) return '';
                const c = country.toLowerCase().trim();
                if (c === 'india' || c === 'ind') return 'IN';
                if (c === 'usa' || c === 'united states' || c === 'us') return 'US';
                if (c === 'uk' || c === 'united kingdom') return 'GB';
                if (c === 'maldives') return 'MV';
                if (c.length === 2) return country.toUpperCase();
                return country.substring(0, 2).toUpperCase();
            };
            const addrPayload = {
                addressType: 'BUSINESS',
                addressLine1: companyDetails.address,
                city: companyDetails.city,
                stateProvince: companyDetails.stateProvince || 'N/A',
                postalCode: companyDetails.zip,
                country: mapCountryToISO(companyDetails.country),
                isPrimary: true
            };

            if (companyDetails.addressId) {
                await apiClient.put(`/api/addresses/${companyDetails.addressId}`, addrPayload);
            } else if (companyDetails.address) {
                const newAddr = await apiClient.post(`/api/suppliers/${supplierId}/addresses`, addrPayload) as any;
                if (newAddr?.addressId) setCompanyDetails({ addressId: newAddr.addressId });
            }
            toast.success("Address saved successfully");
            navigateTo('contact');
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to save address");
        }
        finally { setIsSaving(false); }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registered Address</CardTitle>
                <CardDescription>Please provide your official registered address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="streetAddress">Street Address</Label>
                    <Input
                        id="streetAddress"
                        value={companyDetails.address || ''}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="123 Business Rd"
                        disabled={isLocked}
                        className={isLocked ? "bg-muted" : ""}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                            id="city"
                            value={companyDetails.city || ''}
                            onChange={(e) => handleChange('city', e.target.value)}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>State/Province</Label>
                        <Input
                            value={companyDetails.stateProvince || ''}
                            onChange={(e) => handleChange('stateProvince', e.target.value)}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                            id="postalCode"
                            value={companyDetails.zip || ''}
                            onChange={(e) => handleChange('zip', e.target.value)}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                </div>
                {!isLocked && (
                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => navigateTo('company')}>Back</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Next Step
                        </Button>
                    </div>
                )}
                {isLocked && (
                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => navigateTo('company')}>Back</Button>
                        <Button variant="outline" onClick={() => navigateTo('contact')}>
                            Next: Contact
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function ContactSection() {
    const { status, companyDetails, setCompanyDetails, markSectionComplete, supplierId, setActiveSection } = useSupplierOnboardingStore();
    const navigateTo = useSectionNavigate();
    const { user } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    const isLocked = ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL'].includes(status);

    // Initial validation on mount
    useEffect(() => {
        const isValid = !!companyDetails.contactName && !!companyDetails.position;
        markSectionComplete('contact', isValid);
    }, [companyDetails.contactName, companyDetails.position, markSectionComplete]);

    const handleChange = (field: string, value: string) => {
        const newData = { ...companyDetails, [field]: value };
        setCompanyDetails(newData);
        const isValid = !!newData.contactName && !!newData.position;
        markSectionComplete('contact', isValid);
    };

    const handleSave = async () => {
        if (!supplierId) {
            toast.error("Error: Missing Supplier ID");
            return;
        }
        setIsSaving(true);
        try {
            const [firstName, ...lastNameParts] = (companyDetails.contactName || '').split(' ');
            const contactPayload = {
                contactType: 'Primary',
                firstName: firstName || '',
                lastName: lastNameParts.join(' ') || '',
                email: user?.email,
                phone: companyDetails.phone || '+10000000000',
                designation: companyDetails.position,
                isPrimary: true
            };

            if (companyDetails.contactId) {
                await apiClient.put(`/api/contacts/${companyDetails.contactId}`, contactPayload);
            } else if (companyDetails.contactName) {
                const newCont = await apiClient.post(`/api/suppliers/${supplierId}/contacts`, contactPayload) as any;
                if (newCont?.contactId) setCompanyDetails({ contactId: newCont.contactId });
            }
            toast.success("Contact details saved");
            navigateTo('tax');
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to save contact");
        }
        finally { setIsSaving(false); }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Contact Person</CardTitle>
                <CardDescription>Who should we contact for questions?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            value={companyDetails.contactName || ''}
                            onChange={(e) => handleChange('contactName', e.target.value)}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            value={companyDetails.phone || ''}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                            id="position"
                            value={companyDetails.position || ''}
                            onChange={(e) => handleChange('position', e.target.value)}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email (Read-Only)</Label>
                        <Input value={user?.email || ''} disabled className="bg-muted" />
                    </div>
                </div>
                {!isLocked && (
                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => navigateTo('address')}>Back</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Next Step
                        </Button>
                    </div>
                )}
                {isLocked && (
                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => navigateTo('address')}>Back</Button>
                        <Button variant="outline" onClick={() => navigateTo('tax')}>
                            Next: Tax Info
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- TAX SECTION (DYNAMIC) ---
export function TaxSection() {
    const { status, taxDetails, setTaxDetails, companyDetails, markSectionComplete, supplierId, bankDetails, setActiveSection } = useSupplierOnboardingStore();
    const navigateTo = useSectionNavigate();
    const { user } = useAuthStore();
    const isIndia = companyDetails.country === 'India';
    const [isSaving, setIsSaving] = useState(false);
    const isLocked = ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL'].includes(status);

    // Initial validation on mount
    useEffect(() => {
        const isValid = isIndia ? (!!taxDetails.pan && (taxDetails.gstRegistered === 'No' || !!taxDetails.gstin)) : !!taxDetails.taxId;
        markSectionComplete('tax', isValid);
    }, [taxDetails.pan, taxDetails.gstin, taxDetails.gstRegistered, taxDetails.taxId, isIndia, markSectionComplete]);

    const handleChange = (field: string, value: string) => {
        const newData = { ...taxDetails, [field]: value };
        setTaxDetails(newData);
        // Validation logic based on country
        const isValid = isIndia ? (!!newData.pan && (newData.gstRegistered === 'No' || !!newData.gstin)) : !!newData.taxId;
        markSectionComplete('tax', isValid);
    };

    const handleSave = async () => {
        if (!supplierId) {
            toast.error("Error: Missing Supplier ID");
            return;
        }
        setIsSaving(true);
        try {
            const mapCountryToISO = (country: string) => {
                if (!country) return '';
                const c = country.toLowerCase().trim();
                if (c === 'india' || c === 'ind') return 'IN';
                if (c === 'usa' || c === 'united states' || c === 'us') return 'US';
                if (c === 'uk' || c === 'united kingdom') return 'GB';
                if (c === 'maldives') return 'MV';
                if (c.length === 2) return country.toUpperCase();
                return country.substring(0, 2).toUpperCase();
            };
            const isGstReg = taxDetails.gstRegistered === 'Yes';
            const payload = {
                legalName: companyDetails.legalName,
                country: mapCountryToISO(companyDetails.country), // Keep these
                taxId: isIndia ? taxDetails.pan : taxDetails.taxId,
                bankName: bankDetails.bankName,
                accountNumber: bankDetails.accountNumber,
                routingNumber: bankDetails.routingNumber,
                gstin: isIndia ? taxDetails.gstin : null,
                isGstRegistered: isIndia ? isGstReg : null
            };
            await apiClient.put(`/api/suppliers/${supplierId}`, payload);
            toast.success("Tax details saved");
            navigateTo('bank');
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to save tax details");
        }
        finally { setIsSaving(false); }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tax Information</CardTitle>
                <CardDescription>
                    {isIndia ? "Provide your PAN and GST details." : "Provide your local tax registration details."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isIndia ? (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="pan">Permanent Account Number (PAN)</Label>
                            <Input
                                id="pan"
                                value={taxDetails.pan || ''}
                                onChange={(e) => handleChange('pan', e.target.value)}
                                maxLength={10}
                                placeholder="ABCDE1234F"
                                disabled={isLocked}
                                className={isLocked ? "bg-muted" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>GST Registered?</Label>
                            <Select
                                value={taxDetails.gstRegistered || 'No'}
                                onValueChange={(val) => handleChange('gstRegistered', val)}
                                disabled={isLocked}
                            >
                                <SelectTrigger className={isLocked ? "bg-muted" : ""}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Yes">Yes</SelectItem>
                                    <SelectItem value="No">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {taxDetails.gstRegistered === 'Yes' && (
                            <div className="space-y-2">
                                <Label>GSTIN</Label>
                                <Input
                                    value={taxDetails.gstin || ''}
                                    onChange={(e) => handleChange('gstin', e.target.value)}
                                    placeholder="22AAAAA0000A1Z5"
                                    disabled={isLocked}
                                    className={isLocked ? "bg-muted" : ""}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-2">
                        <Label>Tax Identification Number</Label>
                        <Input
                            value={taxDetails.taxId || ''}
                            onChange={(e) => handleChange('taxId', e.target.value)}
                            disabled={isLocked}
                            className={isLocked ? "bg-muted" : ""}
                        />
                    </div>
                )}
                {!isLocked && (
                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => navigateTo('contact')}>Back</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Next Step
                        </Button>
                    </div>
                )}
                {isLocked && (
                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => navigateTo('contact')}>Back</Button>
                        <Button variant="outline" onClick={() => navigateTo('bank')}>
                            Next: Bank Details
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- DOCUMENTS SECTION ---
// Add this map outside component
const REQUIRED_DOCUMENTS_MAP: Record<string, string[]> = {
    'India': ['PAN Card', 'GST Certificate'],
    'USA': ['W-9 Form'],
    'United States': ['W-9 Form'],
    // Default fallback handled in code
};

export function DocumentsSection() {
    const { status, documents, updateDocumentStatus, companyDetails, markSectionComplete, supplierId, setActiveSection } = useSupplierOnboardingStore();
    const navigateTo = useSectionNavigate();
    const { user } = useAuthStore();
    const country = companyDetails.country || 'Default';

    const isLocked = ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL'].includes(status);

    // File Input Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentDocId, setCurrentDocId] = useState<string | null>(null);

    // Determine requirements
    const countryNorm = country.toLowerCase().trim();
    const requiredNames = (countryNorm === 'india' || countryNorm === 'in' || countryNorm === 'ind')
        ? REQUIRED_DOCUMENTS_MAP['India']
        : (countryNorm === 'usa' || countryNorm === 'us' || countryNorm === 'united states')
            ? REQUIRED_DOCUMENTS_MAP['USA']
            : ['Certificate of Incorporation'];

    // Effect to validate
    useEffect(() => {
        const missing = documents.filter(doc => {
            const isRequired = requiredNames.includes(doc.name);
            const isUploaded = ['UPLOADED', 'VERIFIED', 'APPROVED'].includes(doc.status);
            return isRequired && !isUploaded;
        });
        const isValid = missing.length === 0;
        markSectionComplete('documents', isValid);
    }, [documents, country, markSectionComplete]);

    const handleUploadClick = (docId: string) => {
        setCurrentDocId(docId);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && currentDocId) {
            const file = e.target.files[0];
            const docItem = documents.find(d => d.id === currentDocId);

            if (!supplierId) {
                toast.error("Supplier ID missing. Cannot upload.");
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('documentType', docItem?.name || 'Other');

            toast.info("Uploading " + file.name + "...");

            try {
                const res = await apiClient.post(`/api/suppliers/${supplierId}/documents`, formData) as any;

                const filePath = res?.filePath || res?.filepath;
                updateDocumentStatus(currentDocId, 'UPLOADED', filePath);
                toast.success("Document uploaded successfully");
            } catch (err: any) {
                console.error(err);
                toast.error("Upload failed: " + err.message);
            }

            if (fileInputRef.current) fileInputRef.current.value = '';
            setCurrentDocId(null);
        }
    };

    return (
        <div className="space-y-4">
            {status === 'REWORK_REQUIRED' && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-md">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-orange-900">Action Required: Rework Requested</h3>
                            <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                                A buyer reviewer has requested changes to your submission. Please review your documents, re-upload any that need updating, and resubmit your profile.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {status === 'REJECTED' && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-red-900">Profile Rejected</h3>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                Your onboarding application was rejected. Please contact your procurement team for details.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        <Card>
            <CardHeader>
                <CardTitle>Required Documents</CardTitle>
                <CardDescription>Upload necessary compliance documents for {country}.</CardDescription>
            </CardHeader>
            <CardContent>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                />
                <div className="space-y-4">
                    {documents.map((doc, idx) => {
                        const isRequired = requiredNames.includes(doc.name);
                        // Filter out irrelevant country docs?
                        // E.g. "W-9 Form" checks if Country is US.
                        // Ideally we hide W-9 if NOT US.
                        // Logic: If doc name is specific (like "W-9 Form") and country is NOT USA, hide it.
                        // But verifying strict list is hard without metadata.
                        // I'll show all for now to avoid hiding needed ones.

                        return (
                            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg bg-muted/40">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{doc.name}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            {isRequired ? <span className="text-red-500 font-semibold">* Required</span> : "Optional"}
                                            {doc.status === 'UPLOADED' && <span className="text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Uploaded</span>}
                                            {(doc.status === 'VERIFIED' || doc.status === 'APPROVED') && <span className="text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Verified</span>}
                                        </div>
                                    </div>
                                </div>
                                {(doc.status === 'UPLOADED' || doc.status === 'VERIFIED' || doc.status === 'APPROVED') ? (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (doc.filePath) {
                                                    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';
                                                    // Attach JWT as a query param so deployments that
                                                    // protect /uploads (or rewrite it through an auth
                                                    // proxy) can still authenticate the new-tab
                                                    // request, which cannot set an Authorization header.
                                                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                                                    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
                                                    window.open(`${apiBase}/${doc.filePath}${qs}`, '_blank');
                                                } else {
                                                    toast.error("File path not found.");
                                                }
                                            }}
                                        >
                                            View
                                        </Button>
                                        {!isLocked && doc.status !== 'VERIFIED' && doc.status !== 'APPROVED' && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleUploadClick(doc.id)}
                                            >
                                                Re-upload
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    !isLocked ? (
                                        <Button
                                            size="sm"
                                            onClick={() => handleUploadClick(doc.id)}
                                        >
                                            Upload
                                        </Button>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Pending</span>
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
        </div>
    );
}

// --- BANK SECTION ---
export function BankSection() {
    const { status, bankDetails, setBankDetails, companyDetails, markSectionComplete, supplierId, taxDetails, setActiveSection } = useSupplierOnboardingStore();
    const navigateTo = useSectionNavigate();
    const { user } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    const country = companyDetails.country || '';
    const isLocked = ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL'].includes(status);

    // Region Helpers
    const isIndia = country === 'India' || country === 'IND';
    const isUS = country === 'United States' || country === 'USA' || country === 'US';
    // Add more Gulf/EU countries as needed or simplified check
    const isGulfOrEU = ['United Arab Emirates', 'UAE', 'Saudi Arabia', 'KSA', 'Qatar', 'UK', 'Germany', 'France', 'Netherlands'].includes(country);

    // Dynamic Labels
    let routingLabel = "SWIFT / BIC Code";
    let accountLabel = "Account Number";
    let routingPlaceholder = "SWIFT Code";

    if (isIndia) {
        routingLabel = "IFSC Code";
        routingPlaceholder = "ABCD0123456";
    } else if (isUS) {
        routingLabel = "ABA Routing Number";
        routingPlaceholder = "9 Digit Routing #";
    } else if (isGulfOrEU) {
        accountLabel = "IBAN";
    }

    // Initial validation on mount
    useEffect(() => {
        let isValid = !!bankDetails.bankName && !!bankDetails.accountNumber;
        if (isIndia) {
            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            isValid = isValid && ifscRegex.test(bankDetails.routingNumber || '');
        } else {
            isValid = isValid && !!bankDetails.routingNumber;
        }
        markSectionComplete('bank', isValid);
    }, [bankDetails.bankName, bankDetails.accountNumber, bankDetails.routingNumber, isIndia, markSectionComplete]);

    const handleChange = (field: string, value: string) => {
        const newData = { ...bankDetails, [field]: value };
        setBankDetails(newData);

        let isValid = !!newData.bankName && !!newData.accountNumber;

        // India Specific Validation
        if (isIndia) {
            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            isValid = isValid && ifscRegex.test(newData.routingNumber || '');
        } else {
            isValid = isValid && !!newData.routingNumber;
        }

        markSectionComplete('bank', isValid);
    };

    const handleSave = async () => {
        if (!supplierId) {
            toast.error("Error: Missing Supplier ID");
            return;
        }
        setIsSaving(true);
        try {
            const mapCountryToISO = (c: string) => {
                if (!c) return '';
                const ct = c.toLowerCase().trim();
                if (ct === 'india' || ct === 'ind') return 'IN';
                if (ct === 'usa' || ct === 'united states' || ct === 'us') return 'US';
                if (ct === 'uk' || ct === 'united kingdom') return 'GB';
                if (ct === 'maldives') return 'MV';
                if (ct.length === 2) return ct.toUpperCase();
                return ct.substring(0, 2).toUpperCase();
            };
            const isIndiaCtx = companyDetails.country === 'India';
            const payload = {
                legalName: companyDetails.legalName,
                country: mapCountryToISO(companyDetails.country),
                taxId: isIndiaCtx ? taxDetails.pan : taxDetails.taxId,
                bankName: bankDetails.bankName,
                accountNumber: bankDetails.accountNumber,
                routingNumber: bankDetails.routingNumber,
            };
            await apiClient.put(`/api/suppliers/${supplierId}`, payload);
            toast.success("Bank details saved");
            navigateTo('documents');
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to save bank details");
        }
        finally { setIsSaving(false); }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Bank Account</CardTitle>
                <CardDescription>
                    Provide bank details for {country || 'your region'}.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                        id="bankName"
                        value={bankDetails.bankName || ''}
                        onChange={(e) => handleChange('bankName', e.target.value)}
                        placeholder="Bank Name"
                        disabled={isLocked}
                        className={isLocked ? "bg-muted" : ""}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="accountNumber">{accountLabel}</Label>
                    <Input
                        id="accountNumber"
                        value={bankDetails.accountNumber || ''}
                        onChange={(e) => handleChange('accountNumber', e.target.value)}
                        placeholder={accountLabel}
                        disabled={isLocked}
                        className={isLocked ? "bg-muted" : ""}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="routingNumber">{routingLabel}</Label>
                    <Input
                        id="routingNumber"
                        value={bankDetails.routingNumber || ''}
                        onChange={(e) => handleChange('routingNumber', e.target.value)}
                        placeholder={routingPlaceholder}
                        maxLength={isIndia ? 11 : 20}
                        disabled={isLocked}
                        className={isLocked ? "bg-muted" : ""}
                    />
                    {isIndia && bankDetails.routingNumber && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.routingNumber) && (
                        <p className="text-xs text-red-500">Invalid IFSC Code format (e.g., ABCD0123456)</p>
                    )}
                </div>
                {!isLocked && (
                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => navigateTo('tax')}>Back</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Next Step
                        </Button>
                    </div>
                )}
                {isLocked && (
                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => navigateTo('tax')}>Back</Button>
                        <Button variant="outline" onClick={() => navigateTo('documents')}>
                            Next: Documents
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
