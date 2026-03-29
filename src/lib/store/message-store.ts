import { create } from 'zustand';
import apiClient from '@/lib/api/client';

interface MessageState {
    messagesData: any[];
    unreadCount: number;
    fetchMessages: () => Promise<void>;
    markAsRead: (messageId: number) => Promise<void>;
}

export const useMessageStore = create<MessageState>((set) => ({
    messagesData: [],
    unreadCount: 0,
    fetchMessages: async () => {
        try {
            const res = await apiClient.get('/api/messages') as any;
            const messages = (Array.isArray(res) ? res : res?.data) || [];
            set({
                messagesData: messages,
                unreadCount: messages.filter((m: any) => !(m.isRead || m.isread)).length
            });
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    },
    markAsRead: async (messageId: number) => {
        try {
            await apiClient.patch(`/api/messages/${messageId}/read`);
            set((state) => ({
                messagesData: state.messagesData.map(m =>
                    (m.messageId === messageId || m.messageid === messageId)
                        ? { ...m, isRead: true, isread: true }
                        : m
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            }));
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    }
}));
