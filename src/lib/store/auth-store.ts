import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthState, User } from "@/types/auth";

// API Response type matching the backend JSON strictly
export interface BuyerApiResponse {
    buyerid: number;
    buyername: string;
    buyercode: string;
    email: string;
    phone: string | null;
    country: string;
    isactive: boolean;
    createdat: string;
    updatedat: string | null;
    issandboxactive: boolean;
}

// Adapter to convert API response to frontend BuyerProfile
export const mapBuyerResponseToProfile = (apiBuyer: BuyerApiResponse): BuyerProfile => {
    return {
        userId: apiBuyer.buyercode || String(apiBuyer.buyerid || (apiBuyer as any).buyerId),
        username: apiBuyer.buyername || (apiBuyer as any).username,
        email: apiBuyer.email,
        role: "BUYER",
        buyerId: String(apiBuyer.buyerid || (apiBuyer as any).buyerId),
        subRole: "Admin", // Defaulting to Admin as RBAC is not yet in API
        branding: {
            companyName: apiBuyer.buyername
        },
        isSandboxActive: apiBuyer.issandboxactive,
        suppliersCount: 0
    };
};

// Extended User type for Branding (Internal type augmentation if needed, 
// but better to update the actual type definition if possible. 
// For now, I'll extend it here or assume I can store extra props).
// Actually, let's look at "@/types/auth" first? No, I'll just expand the store to hold what we need.

export interface BuyerProfile extends User {
    email: string;
    subRole?: string; // Enterprise RBAC role: Admin, EnablementManager, Compliance, APFinance, User
    branding?: {
        logoUrl?: string;
        companyName?: string;
    };
    suppliersCount?: number; // Mock stat
    isSandboxActive?: boolean; // Admin-controlled feature flag
}

interface ExtendedAuthState extends Omit<AuthState, 'user' | 'login'> {
    user: BuyerProfile | null;
    registeredBuyers: BuyerProfile[];
    addBuyer: (buyer: BuyerProfile) => void;
    updateBuyer: (userId: string, updates: Partial<BuyerProfile>) => void;
    removeBuyer: (userId: string) => void;
    login: (user: User) => void;
    logout: () => void;
    switchProfile: (supplierId: string) => void;
}

const initialBuyers: BuyerProfile[] = [
    {
        userId: "B001",
        username: "Acme Corp",
        email: "procurement@acme.com",
        role: "BUYER",
        branding: { companyName: "Acme Corp", logoUrl: "" },
        suppliersCount: 12,
        isSandboxActive: false
    },
    {
        userId: "B002",
        username: "Global Tech",
        email: "buying@globaltech.com",
        role: "BUYER",
        branding: { companyName: "Global Tech", logoUrl: "" },
        suppliersCount: 8,
        isSandboxActive: true // For testing
    }
];

export const useAuthStore = create<ExtendedAuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            registeredBuyers: initialBuyers,

            login: (user: any) => {
                // For Suppliers, set initial active profile if memberships exist
                if (user.role === 'SUPPLIER' && user.memberships?.length > 0) {
                    const active = user.memberships[0];
                    user.supplierId = String(active.supplierId);
                    user.buyerId = String(active.buyerId);
                    user.supplierName = active.supplierName;
                    user.approvalStatus = active.approvalStatus;
                    user.activeSupplierId = String(active.supplierId);
                }
                set({ user, isAuthenticated: true });
            },
            logout: () => {
                localStorage.removeItem("token");
                document.cookie = "token=; path=/; max-age=0";
                document.cookie = "role=; path=/; max-age=0";
                set({ user: null, isAuthenticated: false });
            },

            addBuyer: (buyer) => set((state) => ({
                registeredBuyers: [...state.registeredBuyers, buyer]
            })),

            updateBuyer: (userId, updates) => set((state) => ({
                registeredBuyers: state.registeredBuyers.map(b =>
                    b.userId === userId ? { ...b, ...updates } : b
                ),
                // Also update current user if it matches
                user: state.user?.userId === userId ? { ...state.user, ...updates } : state.user
            })),

            removeBuyer: (userId) => set((state) => ({
                registeredBuyers: state.registeredBuyers.filter(b => b.userId !== userId)
            })),

            switchProfile: (supplierId) => set((state) => {
                const user = state.user;
                if (!user || user.role !== 'SUPPLIER' || !user.memberships) return state;

                const target = user.memberships.find(m => String(m.supplierId) === String(supplierId));
                if (!target) return state;

                return {
                    user: {
                        ...user,
                        supplierId: String(target.supplierId),
                        buyerId: String(target.buyerId),
                        supplierName: target.supplierName,
                        approvalStatus: target.approvalStatus,
                        activeSupplierId: String(target.supplierId)
                    }
                };
            }),
        }),
        {
            name: "auth-storage",
        }
    )
);
