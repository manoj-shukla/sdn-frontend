import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '@/lib/store/notification-store';

const resetStore = () => {
    useNotificationStore.setState({ unreadCount: 0 });
};

describe('Notification Store', () => {
    beforeEach(() => resetStore());

    describe('unread count', () => {
        it('initializes with zero unread count', () => {
            expect(useNotificationStore.getState().unreadCount).toBe(0);
        });

        it('sets the unread count', () => {
            useNotificationStore.getState().setUnreadCount(5);
            expect(useNotificationStore.getState().unreadCount).toBe(5);
        });

        it('decrements the unread count', () => {
            useNotificationStore.getState().setUnreadCount(5);
            useNotificationStore.getState().decrementUnreadCount();
            expect(useNotificationStore.getState().unreadCount).toBe(4);
        });

        it('does not allow negative unread count', () => {
            useNotificationStore.getState().setUnreadCount(1);
            useNotificationStore.getState().decrementUnreadCount();
            useNotificationStore.getState().decrementUnreadCount();
            expect(useNotificationStore.getState().unreadCount).toBe(0);
        });

        it('handles decrement from zero', () => {
            useNotificationStore.getState().decrementUnreadCount();
            expect(useNotificationStore.getState().unreadCount).toBe(0);
        });
    });

    describe('batch operations', () => {
        it('handles multiple decrements correctly', () => {
            useNotificationStore.getState().setUnreadCount(10);
            for (let i = 0; i < 5; i++) {
                useNotificationStore.getState().decrementUnreadCount();
            }
            expect(useNotificationStore.getState().unreadCount).toBe(5);
        });

        it('resets to zero via setUnreadCount', () => {
            useNotificationStore.getState().setUnreadCount(15);
            useNotificationStore.getState().setUnreadCount(0);
            expect(useNotificationStore.getState().unreadCount).toBe(0);
        });
    });
});
