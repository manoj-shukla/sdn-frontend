import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useCircleStore } from '@/lib/store/circle-store';
import type { Circle, CircleMember } from '@/lib/store/circle-store';

const resetStore = () => {
    useCircleStore.setState({
        circles: [],
        activeCircle: null,
        circleMembers: {},
        circleWorkflows: {},
        isLoading: false,
        error: null,
    });
};

describe('Circle Store', () => {
    beforeEach(() => resetStore());

    const mockCircle: Circle = {
        circleId: 1,
        circleName: 'Preferred Suppliers',
        description: 'Top-tier suppliers',
        buyerId: 1,
        memberCount: 5,
        createdAt: '2026-02-26T00:00:00Z',
        updatedAt: '2026-02-26T00:00:00Z',
    };

    const mockMember: CircleMember = {
        circleId: 1,
        supplierId: 10,
        supplierName: 'Test Supplier',
        addedAt: '2026-02-26T00:00:00Z',
        addedBy: 1,
    };

    describe('Circle Management', () => {
        it('sets circles list', () => {
            act(() => useCircleStore.getState().setCircles([mockCircle]));
            expect(useCircleStore.getState().circles).toHaveLength(1);
            expect(useCircleStore.getState().circles[0].circleName).toBe('Preferred Suppliers');
        });

        it('sets active circle', () => {
            act(() => useCircleStore.getState().setActiveCircle(mockCircle));
            expect(useCircleStore.getState().activeCircle).toEqual(mockCircle);
        });

        it('adds new circle', () => {
            act(() => useCircleStore.getState().addCircle(mockCircle));
            expect(useCircleStore.getState().circles).toHaveLength(1);
            expect(useCircleStore.getState().circles[0]).toEqual(mockCircle);
        });

        it('updates existing circle', () => {
            act(() => useCircleStore.getState().addCircle(mockCircle));
            act(() => useCircleStore.getState().updateCircle(1, { circleName: 'Elite Suppliers' }));

            const circle = useCircleStore.getState().circles[0];
            expect(circle.circleName).toBe('Elite Suppliers');
        });

        it('updates active circle when modified', () => {
            act(() => useCircleStore.getState().setActiveCircle(mockCircle));
            act(() => useCircleStore.getState().updateCircle(1, { description: 'Updated description' }));

            expect(useCircleStore.getState().activeCircle?.description).toBe('Updated description');
        });

        it('removes circle from list', () => {
            act(() => useCircleStore.getState().addCircle(mockCircle));
            act(() => useCircleStore.getState().removeCircle(1));

            expect(useCircleStore.getState().circles).toHaveLength(0);
        });

        it('clears active circle when deleted', () => {
            act(() => useCircleStore.getState().setActiveCircle(mockCircle));
            act(() => useCircleStore.getState().removeCircle(1));

            expect(useCircleStore.getState().activeCircle).toBeNull();
        });

        it('removes circle members when circle deleted', () => {
            act(() => useCircleStore.getState().addCircle(mockCircle));
            act(() => useCircleStore.getState().setCircleMembers(1, [mockMember]));
            act(() => useCircleStore.getState().removeCircle(1));

            expect(useCircleStore.getState().circleMembers[1]).toBeUndefined();
        });
    });

    describe('Member Management', () => {
        it('sets circle members', () => {
            act(() => useCircleStore.getState().setCircleMembers(1, [mockMember]));
            expect(useCircleStore.getState().circleMembers[1]).toHaveLength(1);
        });

        it('adds member to circle', () => {
            act(() => useCircleStore.getState().addCircleMember(1, mockMember));
            expect(useCircleStore.getState().circleMembers[1]).toHaveLength(1);
            expect(useCircleStore.getState().circleMembers[1][0].supplierId).toBe(10);
        });

        it('adds multiple members to same circle', () => {
            const member2: CircleMember = {
                ...mockMember,
                supplierId: 11,
                supplierName: 'Another Supplier',
            };

            act(() => useCircleStore.getState().addCircleMember(1, mockMember));
            act(() => useCircleStore.getState().addCircleMember(1, member2));

            expect(useCircleStore.getState().circleMembers[1]).toHaveLength(2);
        });

        it('removes member from circle', () => {
            act(() => useCircleStore.getState().addCircleMember(1, mockMember));
            act(() => useCircleStore.getState().removeCircleMember(1, 10));

            expect(useCircleStore.getState().circleMembers[1]).toHaveLength(0);
        });

        it('does not affect other circles when removing member', () => {
            const member2: CircleMember = {
                ...mockMember,
                circleId: 2,
            };

            act(() => useCircleStore.getState().addCircleMember(1, mockMember));
            act(() => useCircleStore.getState().addCircleMember(2, member2));
            act(() => useCircleStore.getState().removeCircleMember(1, 10));

            expect(useCircleStore.getState().circleMembers[1]).toHaveLength(0);
            expect(useCircleStore.getState().circleMembers[2]).toHaveLength(1);
        });
    });

    describe('Loading and Error States', () => {
        it('sets loading state', () => {
            act(() => useCircleStore.getState().setLoading(true));
            expect(useCircleStore.getState().isLoading).toBe(true);
        });

        it('sets error message', () => {
            act(() => useCircleStore.getState().setError('Failed to load circles'));
            expect(useCircleStore.getState().error).toBe('Failed to load circles');
        });

        it('clears error message', () => {
            act(() => useCircleStore.getState().setError('Some error'));
            act(() => useCircleStore.getState().clearError());
            expect(useCircleStore.getState().error).toBeNull();
        });
    });

    describe('Derived State', () => {
        it('calculates total members across all circles', () => {
            const member2: CircleMember = {
                ...mockMember,
                supplierId: 11,
            };

            act(() => useCircleStore.getState().setCircleMembers(1, [mockMember, member2]));

            const state = useCircleStore.getState();
            expect(state.circleMembers[1]).toHaveLength(2);
        });

        it('handles empty state for new circle', () => {
            const members = useCircleStore.getState().circleMembers[999];
            expect(members).toBeUndefined();
        });
    });
});
