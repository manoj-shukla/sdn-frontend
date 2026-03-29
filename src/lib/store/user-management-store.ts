import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────

export interface Role {
    roleId: number;
    roleName: string;
    description: string | null;
    buyerId: number | null;
    isSystemRole: boolean;
    permissions: string[];
}

export interface User {
    userId: number;
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: 'BUYER' | 'SUPPLIER' | 'ADMIN';
    subRole: string;
    buyerId: number | null;
    supplierId: number | null;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string;
    lastLogin: string | null;
}

export interface UserProfile extends User {
    fullName: string;
    initials: string;
    permissions: string[];
}

// ─── State ────────────────────────────────────────────────────────────────

interface UserManagementState {
    users: User[];
    roles: Role[];
    activeUser: User | null;
    currentUser: UserProfile | null;
    isLoading: boolean;
    error: string | null;
    totalCount: number;

    // User Actions
    setUsers: (users: User[]) => void;
    setActiveUser: (user: User | null) => void;
    addUser: (user: User) => void;
    updateUser: (userId: number, updates: Partial<User>) => void;
    removeUser: (userId: number) => void;
    setTotalCount: (count: number) => void;

    // Role Actions
    setRoles: (roles: Role[]) => void;
    addRole: (role: Role) => void;
    updateRole: (roleId: number, updates: Partial<Role>) => void;
    removeRole: (roleId: number) => void;

    // Current User Actions
    setCurrentUser: (user: UserProfile | null) => void;
    updateCurrentUser: (updates: Partial<UserProfile>) => void;

    // Utility Actions
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────

export const useUserManagementStore = create<UserManagementState>((set) => ({
    users: [],
    roles: [],
    activeUser: null,
    currentUser: null,
    isLoading: false,
    error: null,
    totalCount: 0,

    // User Actions
    setUsers: (users) => set({ users }),

    setActiveUser: (user) => set({ activeUser: user }),

    addUser: (user) => set((state) => ({
        users: [...state.users, user],
        totalCount: state.totalCount + 1
    })),

    updateUser: (userId, updates) => set((state) => ({
        users: state.users.map(u =>
            u.userId === userId ? { ...u, ...updates } : u
        ),
        activeUser: state.activeUser?.userId === userId
            ? { ...state.activeUser, ...updates }
            : state.activeUser,
        currentUser: state.currentUser?.userId === userId
            ? { ...state.currentUser, ...updates }
            : state.currentUser
    })),

    removeUser: (userId) => set((state) => ({
        users: state.users.filter(u => u.userId !== userId),
        activeUser: state.activeUser?.userId === userId ? null : state.activeUser,
        totalCount: state.totalCount - 1
    })),

    setTotalCount: (count) => set({ totalCount: count }),

    // Role Actions
    setRoles: (roles) => set({ roles }),

    addRole: (role) => set((state) => ({
        roles: [...state.roles, role]
    })),

    updateRole: (roleId, updates) => set((state) => ({
        roles: state.roles.map(r =>
            r.roleId === roleId ? { ...r, ...updates } : r
        )
    })),

    removeRole: (roleId) => set((state) => ({
        roles: state.roles.filter(r => r.roleId !== roleId)
    })),

    // Current User Actions
    setCurrentUser: (user) => set({ currentUser: user }),

    updateCurrentUser: (updates) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null
    })),

    // Utility Actions
    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null })
}));
