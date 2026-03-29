export type UserRole = "ADMIN" | "BUYER" | "SUPPLIER";

export interface User {
    userId: string;
    username: string;
    email: string;
    role: UserRole;
    buyerId?: string;
    supplierId?: string;
    approvalStatus?: string;
    supplierName?: string;
    activeSupplierId?: string; // Currently active supplier profile UID
    memberships?: Array<{
        supplierId: number;
        buyerId: number;
        supplierName: string;
        buyerName: string;
        approvalStatus: string;
    }>;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
}
