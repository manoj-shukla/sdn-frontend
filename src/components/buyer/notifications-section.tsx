"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/lib/store/auth-store";
import { useNotificationStore } from "@/lib/store/notification-store";

export function BuyerNotificationsSection() {
    const { user } = useAuthStore();
    const { notificationsData, fetchNotifications, markAsRead } = useNotificationStore();
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            if (user?.buyerId) {
                await fetchNotifications({ recipientRole: 'BUYER', buyerId: Number(user.buyerId) });
            }
            setLoading(false);
        };
        load();
    }, [user, fetchNotifications]);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const sortedNotifications = [...notificationsData].sort((a: any, b: any) =>
        new Date(b.createdAt || b.createdat || 0).getTime() - new Date(a.createdAt || a.createdat || 0).getTime()
    );

    return (
        <Card className="overflow-hidden border-none shadow-md">
            <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Bell className="h-5 w-5 text-blue-600" />
                            System Alerts
                        </CardTitle>
                        <CardDescription>Track automated updates and workflow events.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {sortedNotifications.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground bg-muted/5">
                        <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No notifications yet</p>
                        <p className="text-sm">New system alerts will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {sortedNotifications.map((notif: any) => {
                            const notifId = notif.notificationId || notif.notificationid;
                            const isRead = notif.isRead || notif.isread;
                            const createdAt = notif.createdAt || notif.createdat;

                            return (
                                <div
                                    key={notifId}
                                    className={`group transition-all hover:bg-muted/30 ${!isRead ? 'bg-blue-50/20' : ''}`}
                                >
                                    <div
                                        className="p-4 cursor-pointer flex items-center justify-between gap-4"
                                        onClick={() => {
                                            if (expandedId !== notifId) {
                                                setExpandedId(notifId);
                                                if (!isRead) {
                                                    markAsRead(notifId);
                                                }
                                            } else {
                                                setExpandedId(null);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${!isRead ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                                                <Bell className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`flex items-center gap-2 ${!isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                                    <span className="truncate">System Notification</span>
                                                    {!isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                                                </div>
                                                <div className={`text-sm truncate ${!isRead ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                    {notif.message?.substring(0, 100)}{notif.message?.length > 100 ? '...' : ''}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {createdAt ? format(new Date(createdAt), "MMM d, h:mm a") : ""}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0">
                                            {expandedId === notifId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </div>

                                    {expandedId === notifId && (
                                        <div className="px-12 pb-6 pt-2 animate-in slide-in-from-top-1 duration-200">
                                            <div className="bg-muted/50 rounded-lg p-5 border border-border/50 shadow-inner">
                                                <div className="text-sm leading-relaxed whitespace-pre-wrap">{notif.message}</div>
                                                <div className="mt-4 flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{notif.type || 'SYSTEM'}</Badge>
                                                    {(notif.supplierId || notif.supplierid) && (
                                                        <span className="text-xs text-muted-foreground">Supplier Reference: {notif.supplierId || notif.supplierid}</span>
                                                    )}
                                                </div>
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
