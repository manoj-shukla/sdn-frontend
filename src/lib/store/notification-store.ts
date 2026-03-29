import { create } from 'zustand';
import apiClient from '@/lib/api/client';

export interface Notification {
    notificationid: number;
    notificationId?: number;
    type: string;
    message: string;
    entityid: string;
    entityId?: string;
    recipientrole: string;
    recipientRole?: string;
    isread: boolean;
    isRead?: boolean;
    createdat: string;
    createdAt?: string;
}

interface NotificationState {
    notificationsData: Notification[];
    unreadCount: number;
    setNotificationsData: (notifications: Notification[]) => void;
    setUnreadCount: (count: number) => void;
    fetchNotifications: (query: { recipientRole?: string; supplierId?: number; buyerId?: number }) => Promise<void>;
    markAsRead: (notificationId: number) => Promise<void>;
    decrementUnreadCount: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notificationsData: [],
    unreadCount: 0,
    setNotificationsData: (notifications) => set({ notificationsData: notifications }),
    setUnreadCount: (count) => set({ unreadCount: count }),
    fetchNotifications: async (query) => {
        try {
            const params = new URLSearchParams();
            if (query.recipientRole) params.append('recipientRole', query.recipientRole);
            if (query.supplierId) params.append('supplierId', query.supplierId.toString());
            if (query.buyerId) params.append('buyerId', query.buyerId.toString());

            const notifications = await apiClient.get(`/api/notifications?${params.toString()}`) as Notification[];
            set({
                notificationsData: Array.isArray(notifications) ? notifications : [],
                unreadCount: Array.isArray(notifications) ? notifications.filter(n => !(n.isread || n.isRead)).length : 0
            });
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    },
    markAsRead: async (notificationId) => {
        try {
            await apiClient.patch(`/api/notifications/${notificationId}/read`);
            set((state) => ({
                notificationsData: state.notificationsData.map(n =>
                    (n.notificationid === notificationId || n.notificationId === notificationId)
                        ? { ...n, isread: true, isRead: true }
                        : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            }));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    },
    decrementUnreadCount: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}));
