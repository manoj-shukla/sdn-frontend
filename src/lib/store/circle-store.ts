import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────

export interface Circle {
    circleId: number;
    circleName: string;
    description: string | null;
    buyerId: number;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CircleMember {
    circleId: number;
    supplierId: number;
    supplierName: string;
    addedAt: string;
    addedBy: number;
}

export interface CircleWorkflow {
    circleId: number;
    workflowId: number;
    workflowName: string;
    assignedAt: string;
}

// ─── State ────────────────────────────────────────────────────────────────

interface CircleState {
    circles: Circle[];
    activeCircle: Circle | null;
    circleMembers: Record<number, CircleMember[]>;
    circleWorkflows: Record<number, CircleWorkflow[]>;
    isLoading: boolean;
    error: string | null;

    // Actions
    setCircles: (circles: Circle[]) => void;
    setActiveCircle: (circle: Circle | null) => void;
    addCircle: (circle: Circle) => void;
    updateCircle: (circleId: number, updates: Partial<Circle>) => void;
    removeCircle: (circleId: number) => void;
    setCircleMembers: (circleId: number, members: CircleMember[]) => void;
    addCircleMember: (circleId: number, member: CircleMember) => void;
    removeCircleMember: (circleId: number, supplierId: number) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────

export const useCircleStore = create<CircleState>((set) => ({
    circles: [],
    activeCircle: null,
    circleMembers: {},
    circleWorkflows: {},
    isLoading: false,
    error: null,

    setCircles: (circles) => set({ circles }),

    setActiveCircle: (circle) => set({ activeCircle: circle }),

    addCircle: (circle) => set((state) => ({
        circles: [...state.circles, circle]
    })),

    updateCircle: (circleId, updates) => set((state) => ({
        circles: state.circles.map(c =>
            c.circleId === circleId ? { ...c, ...updates } : c
        ),
        activeCircle: state.activeCircle?.circleId === circleId
            ? { ...state.activeCircle, ...updates }
            : state.activeCircle
    })),

    removeCircle: (circleId) => set((state) => ({
        circles: state.circles.filter(c => c.circleId !== circleId),
        activeCircle: state.activeCircle?.circleId === circleId ? null : state.activeCircle,
        circleMembers: Object.fromEntries(
            Object.entries(state.circleMembers).filter(([id]) => Number(id) !== circleId)
        )
    })),

    setCircleMembers: (circleId, members) => set((state) => ({
        circleMembers: {
            ...state.circleMembers,
            [circleId]: members
        }
    })),

    addCircleMember: (circleId, member) => set((state) => ({
        circleMembers: {
            ...state.circleMembers,
            [circleId]: [...(state.circleMembers[circleId] || []), member]
        }
    })),

    removeCircleMember: (circleId, supplierId) => set((state) => ({
        circleMembers: {
            ...state.circleMembers,
            [circleId]: (state.circleMembers[circleId] || []).filter(m => m.supplierId !== supplierId)
        }
    })),

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null })
}));
