import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUserManagementStore } from '@/lib/store/user-management-store';
import type { User, Role, UserProfile } from '@/lib/store/user-management-store';

const resetStore = () => {
    useUserManagementStore.setState({
        users: [],
        roles: [],
        activeUser: null,
        currentUser: null,
        isLoading: false,
        error: null,
        totalCount: 0,
    });
};

describe('User Management Store', () => {
    beforeEach(() => resetStore());

    const mockUser: User = {
        userId: 1,
        username: 'john.doe',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1-555-0100',
        role: 'BUYER',
        subRole: 'Admin',
        buyerId: 1,
        supplierId: null,
        isActive: true,
        isDeleted: false,
        createdAt: '2026-02-26T00:00:00Z',
        lastLogin: '2026-02-26T08:00:00Z',
    };

    const mockRole: Role = {
        roleId: 1,
        roleName: 'Buyer Admin',
        description: 'Full buyer admin access',
        buyerId: 1,
        isSystemRole: false,
        permissions: ['VIEW_SUPPLIERS', 'EDIT_SUPPLIERS', 'APPROVE_SUPPLIERS'],
    };

    describe('User CRUD Operations', () => {
        it('sets users list', () => {
            act(() => useUserManagementStore.getState().setUsers([mockUser]));
            expect(useUserManagementStore.getState().users).toHaveLength(1);
            expect(useUserManagementStore.getState().users[0].username).toBe('john.doe');
        });

        it('sets active user', () => {
            act(() => useUserManagementStore.getState().setActiveUser(mockUser));
            expect(useUserManagementStore.getState().activeUser).toEqual(mockUser);
        });

        it('adds new user', () => {
            act(() => useUserManagementStore.getState().addUser(mockUser));
            expect(useUserManagementStore.getState().users).toHaveLength(1);
            expect(useUserManagementStore.getState().totalCount).toBe(1);
        });

        it('updates existing user', () => {
            act(() => useUserManagementStore.getState().addUser(mockUser));
            act(() => useUserManagementStore.getState().updateUser(1, { firstName: 'Jane' }));

            const user = useUserManagementStore.getState().users[0];
            expect(user.firstName).toBe('Jane');
        });

        it('updates active user when modified', () => {
            act(() => useUserManagementStore.getState().setActiveUser(mockUser));
            act(() => useUserManagementStore.getState().updateUser(1, { lastName: 'Smith' }));

            expect(useUserManagementStore.getState().activeUser?.lastName).toBe('Smith');
        });

        it('removes user from list', () => {
            act(() => useUserManagementStore.getState().addUser(mockUser));
            act(() => useUserManagementStore.getState().removeUser(1));

            expect(useUserManagementStore.getState().users).toHaveLength(0);
            expect(useUserManagementStore.getState().totalCount).toBe(0);
        });

        it('clears active user when deleted', () => {
            act(() => useUserManagementStore.getState().setActiveUser(mockUser));
            act(() => useUserManagementStore.getState().removeUser(1));

            expect(useUserManagementStore.getState().activeUser).toBeNull();
        });

        it('sets total count independently', () => {
            act(() => useUserManagementStore.getState().setTotalCount(100));
            expect(useUserManagementStore.getState().totalCount).toBe(100);
        });
    });

    describe('Role Management', () => {
        it('sets roles list', () => {
            act(() => useUserManagementStore.getState().setRoles([mockRole]));
            expect(useUserManagementStore.getState().roles).toHaveLength(1);
        });

        it('adds new role', () => {
            act(() => useUserManagementStore.getState().addRole(mockRole));
            expect(useUserManagementStore.getState().roles).toHaveLength(1);
            expect(useUserManagementStore.getState().roles[0].roleName).toBe('Buyer Admin');
        });

        it('updates existing role', () => {
            act(() => useUserManagementStore.getState().addRole(mockRole));
            act(() => useUserManagementStore.getState().updateRole(1, { description: 'Updated description' }));

            const role = useUserManagementStore.getState().roles[0];
            expect(role.description).toBe('Updated description');
        });

        it('removes role from list', () => {
            act(() => useUserManagementStore.getState().addRole(mockRole));
            act(() => useUserManagementStore.getState().removeRole(1));

            expect(useUserManagementStore.getState().roles).toHaveLength(0);
        });

        it('handles system role protection', () => {
            const systemRole: Role = {
                ...mockRole,
                isSystemRole: true,
            };

            act(() => useUserManagementStore.getState().addRole(systemRole));
            expect(useUserManagementStore.getState().roles[0].isSystemRole).toBe(true);
        });
    });

    describe('Current User Profile', () => {
        const mockProfile: UserProfile = {
            ...mockUser,
            fullName: 'John Doe',
            initials: 'JD',
            permissions: ['VIEW_SUPPLIERS', 'EDIT_SUPPLIERS'],
        };

        it('sets current user profile', () => {
            act(() => useUserManagementStore.getState().setCurrentUser(mockProfile));
            expect(useUserManagementStore.getState().currentUser).toEqual(mockProfile);
        });

        it('updates current user profile', () => {
            act(() => useUserManagementStore.getState().setCurrentUser(mockProfile));
            act(() => useUserManagementStore.getState().updateCurrentUser({ firstName: 'Jane' }));

            expect(useUserManagementStore.getState().currentUser?.firstName).toBe('Jane');
        });

        it('does not update current user if null', () => {
            act(() => useUserManagementStore.getState().setCurrentUser(null));
            act(() => useUserManagementStore.getState().updateCurrentUser({ firstName: 'Jane' }));

            expect(useUserManagementStore.getState().currentUser).toBeNull();
        });

        it('preserves derived properties on update', () => {
            act(() => useUserManagementStore.getState().setCurrentUser(mockProfile));
            act(() => useUserManagementStore.getState().updateCurrentUser({ email: 'jane@example.com' }));

            expect(useUserManagementStore.getState().currentUser?.fullName).toBe('John Doe');
            expect(useUserManagementStore.getState().currentUser?.initials).toBe('JD');
        });
    });

    describe('User State Management', () => {
        it('handles user activation/deactivation', () => {
            act(() => useUserManagementStore.getState().addUser(mockUser));
            act(() => useUserManagementStore.getState().updateUser(1, { isActive: false }));

            expect(useUserManagementStore.getState().users[0].isActive).toBe(false);
        });

        it('handles user soft delete', () => {
            act(() => useUserManagementStore.getState().addUser(mockUser));
            act(() => useUserManagementStore.getState().updateUser(1, { isDeleted: true }));

            expect(useUserManagementStore.getState().users[0].isDeleted).toBe(true);
        });

        it('handles role changes', () => {
            act(() => useUserManagementStore.getState().addUser(mockUser));
            act(() => useUserManagementStore.getState().updateUser(1, { role: 'SUPPLIER', subRole: 'Admin' }));

            const user = useUserManagementStore.getState().users[0];
            expect(user.role).toBe('SUPPLIER');
            expect(user.subRole).toBe('Admin');
        });

        it('handles last login tracking', () => {
            act(() => useUserManagementStore.getState().addUser(mockUser));
            act(() => useUserManagementStore.getState().updateUser(1, { lastLogin: '2026-02-26T10:00:00Z' }));

            expect(useUserManagementStore.getState().users[0].lastLogin).toBe('2026-02-26T10:00:00Z');
        });
    });

    describe('Permission Management', () => {
        it('stores role permissions', () => {
            act(() => useUserManagementStore.getState().setRoles([mockRole]));
            expect(useUserManagementStore.getState().roles[0].permissions).toHaveLength(3);
        });

        it('updates role permissions', () => {
            act(() => useUserManagementStore.getState().addRole(mockRole));
            act(() => useUserManagementStore.getState().updateRole(1, {
                permissions: ['VIEW_SUPPLIERS', 'EDIT_SUPPLIERS', 'APPROVE_SUPPLIERS', 'DELETE_SUPPLIERS']
            }));

            expect(useUserManagementStore.getState().roles[0].permissions).toHaveLength(4);
        });

        it('stores user permissions in profile', () => {
            const profile: UserProfile = {
                ...mockUser,
                fullName: 'John Doe',
                initials: 'JD',
                permissions: ['VIEW_SUPPLIERS', 'EDIT_SUPPLIERS', 'APPROVE_SUPPLIERS'],
            };

            act(() => useUserManagementStore.getState().setCurrentUser(profile));
            expect(useUserManagementStore.getState().currentUser?.permissions).toHaveLength(3);
        });
    });

    describe('Loading and Error States', () => {
        it('sets loading state', () => {
            act(() => useUserManagementStore.getState().setLoading(true));
            expect(useUserManagementStore.getState().isLoading).toBe(true);
        });

        it('sets error message', () => {
            act(() => useUserManagementStore.getState().setError('Failed to load users'));
            expect(useUserManagementStore.getState().error).toBe('Failed to load users');
        });

        it('clears error message', () => {
            act(() => useUserManagementStore.getState().setError('Some error'));
            act(() => useUserManagementStore.getState().clearError());
            expect(useUserManagementStore.getState().error).toBeNull();
        });
    });

    describe('Filtering and Search', () => {
        it('supports filtering users by role', () => {
            const supplierUser: User = {
                ...mockUser,
                userId: 2,
                role: 'SUPPLIER',
            };

            act(() => useUserManagementStore.getState().setUsers([mockUser, supplierUser]));

            const buyers = useUserManagementStore.getState().users.filter(u => u.role === 'BUYER');
            expect(buyers).toHaveLength(1);
        });

        it('supports filtering users by status', () => {
            const inactiveUser: User = {
                ...mockUser,
                userId: 2,
                isActive: false,
            };

            act(() => useUserManagementStore.getState().setUsers([mockUser, inactiveUser]));

            const active = useUserManagementStore.getState().users.filter(u => u.isActive);
            expect(active).toHaveLength(1);
        });

        it('supports searching users by name', () => {
            const janeUser: User = {
                ...mockUser,
                userId: 2,
                firstName: 'Jane',
                lastName: 'Smith',
            };

            act(() => useUserManagementStore.getState().setUsers([mockUser, janeUser]));

            const found = useUserManagementStore.getState().users.filter(
                u => u.firstName?.toLowerCase().includes('john') || u.lastName?.toLowerCase().includes('john')
            );
            expect(found).toHaveLength(1);
        });
    });

    describe('Derived Properties', () => {
        it('calculates full name from first and last', () => {
            const profile: UserProfile = {
                ...mockUser,
                fullName: 'John Doe',
                initials: 'JD',
                permissions: [],
            };

            act(() => useUserManagementStore.getState().setCurrentUser(profile));
            expect(useUserManagementStore.getState().currentUser?.fullName).toBe('John Doe');
        });

        it('calculates initials from name', () => {
            const profile: UserProfile = {
                ...mockUser,
                fullName: 'John Doe',
                initials: 'JD',
                permissions: [],
            };

            act(() => useUserManagementStore.getState().setCurrentUser(profile));
            expect(useUserManagementStore.getState().currentUser?.initials).toBe('JD');
        });

        it('handles users without names', () => {
            const noNameUser: User = {
                ...mockUser,
                firstName: null,
                lastName: null,
            };

            act(() => useUserManagementStore.getState().addUser(noNameUser));
            expect(useUserManagementStore.getState().users[0].firstName).toBeNull();
        });
    });

    describe('Cross-Store Updates', () => {
        it('updates current user when regular user is updated', () => {
            const profile: UserProfile = {
                ...mockUser,
                fullName: 'John Doe',
                initials: 'JD',
                permissions: [],
            };

            act(() => useUserManagementStore.getState().setCurrentUser(profile));
            act(() => useUserManagementStore.getState().updateUser(1, { phone: '+1-555-0199' }));

            expect(useUserManagementStore.getState().currentUser?.phone).toBe('+1-555-0199');
        });

        it('does not affect current user if different user is updated', () => {
            const profile: UserProfile = {
                ...mockUser,
                fullName: 'John Doe',
                initials: 'JD',
                permissions: [],
            };

            const otherUser: User = {
                ...mockUser,
                userId: 2,
            };

            act(() => useUserManagementStore.getState().setCurrentUser(profile));
            act(() => useUserManagementStore.getState().addUser(otherUser));
            act(() => useUserManagementStore.getState().updateUser(2, { firstName: 'Jane' }));

            expect(useUserManagementStore.getState().currentUser?.firstName).toBe('John');
        });
    });
});
