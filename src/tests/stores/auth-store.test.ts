import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from '@/lib/store/auth-store';
import type { User } from '@/types/auth';

// Reset store before each test
const resetStore = () => {
    useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
    });
};

const buyerUser: User = {
    userId: 'U001',
    username: 'John Buyer',
    email: 'john@buyer.com',
    role: 'BUYER',
    buyerId: 'B001',
};

const supplierUser: User = {
    userId: 'S001',
    username: 'Supplier Co',
    email: 'contact@supplier.com',
    role: 'SUPPLIER',
    supplierId: '10',
    memberships: [
        { supplierId: 10, buyerId: 1, supplierName: 'Supplier Co', buyerName: 'Acme', approvalStatus: 'APPROVED' },
        { supplierId: 20, buyerId: 2, supplierName: 'Supplier Co B', buyerName: 'GlobalTech', approvalStatus: 'SUBMITTED' },
    ],
};

describe('Auth Store', () => {
    beforeEach(() => resetStore());

    describe('login', () => {
        it('sets user and isAuthenticated on login', () => {
            act(() => useAuthStore.getState().login(buyerUser));
            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user?.userId).toBe('U001');
        });

        it('initialises active supplier from first membership on supplier login', () => {
            act(() => useAuthStore.getState().login(supplierUser));
            const state = useAuthStore.getState();
            expect(state.user?.activeSupplierId).toBe('10');
            expect(state.user?.supplierId).toBe('10');
            expect(state.user?.buyerId).toBe('1');
        });

        it('sets approvalStatus from first membership', () => {
            act(() => useAuthStore.getState().login(supplierUser));
            expect(useAuthStore.getState().user?.approvalStatus).toBe('APPROVED');
        });
    });

    describe('logout', () => {
        it('clears user and isAuthenticated on logout', () => {
            act(() => useAuthStore.getState().login(buyerUser));
            act(() => useAuthStore.getState().logout());
            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
        });

        it('removes token from localStorage on logout', () => {
            localStorage.setItem('token', 'abc123');
            act(() => useAuthStore.getState().logout());
            expect(localStorage.getItem('token')).toBeNull();
        });
    });

    describe('switchProfile', () => {
        it('switches to second membership', () => {
            act(() => useAuthStore.getState().login(supplierUser));
            act(() => useAuthStore.getState().switchProfile('20'));
            const user = useAuthStore.getState().user;
            expect(user?.activeSupplierId).toBe('20');
            expect(user?.supplierId).toBe('20');
            expect(user?.buyerId).toBe('2');
            expect(user?.supplierName).toBe('Supplier Co B');
            expect(user?.approvalStatus).toBe('SUBMITTED');
        });

        it('does nothing if supplierId not found in memberships', () => {
            act(() => useAuthStore.getState().login(supplierUser));
            act(() => useAuthStore.getState().switchProfile('999'));
            expect(useAuthStore.getState().user?.activeSupplierId).toBe('10'); // unchanged
        });

        it('does nothing for BUYER users', () => {
            act(() => useAuthStore.getState().login(buyerUser));
            act(() => useAuthStore.getState().switchProfile('20'));
            expect(useAuthStore.getState().user?.userId).toBe('U001'); // unchanged
        });
    });

    describe('buyer management', () => {
        it('adds a new buyer to registeredBuyers', () => {
            const before = useAuthStore.getState().registeredBuyers.length;
            act(() => useAuthStore.getState().addBuyer({
                userId: 'B999',
                username: 'New Buyer',
                email: 'new@buyer.com',
                role: 'BUYER',
            }));
            expect(useAuthStore.getState().registeredBuyers).toHaveLength(before + 1);
        });

        it('updates existing buyer by userId', () => {
            act(() => useAuthStore.getState().updateBuyer('B001', { username: 'Updated Acme' }));
            const b = useAuthStore.getState().registeredBuyers.find(b => b.userId === 'B001');
            expect(b?.username).toBe('Updated Acme');
        });

        it('removes buyer by userId', () => {
            act(() => useAuthStore.getState().removeBuyer('B001'));
            const found = useAuthStore.getState().registeredBuyers.find(b => b.userId === 'B001');
            expect(found).toBeUndefined();
        });

        it('updates current user if userId matches', () => {
            act(() => useAuthStore.getState().login(buyerUser));
            act(() => useAuthStore.getState().updateBuyer('U001', { username: 'John Updated' }));
            expect(useAuthStore.getState().user?.username).toBe('John Updated');
        });
    });
});
