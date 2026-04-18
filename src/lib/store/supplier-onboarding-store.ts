import { create } from 'zustand';

export type OnboardingSection = 'dashboard' | 'company' | 'address' | 'contact' | 'tax' | 'bank' | 'documents' | 'messages';

interface SupplierState {
    activeSection: OnboardingSection;
    setActiveSection: (section: OnboardingSection) => void;

    // Data Sections
    companyDetails: any;
    taxDetails: any;
    bankDetails: any;
    documents: any[];

    // Metadata
    status: string;
    country: string;
    supplierType: string;
    supplierId: number | null;
    setSupplierId: (id: number) => void;

    // Progress Tracking
    completedSections: Record<OnboardingSection, boolean>;

    setCompanyDetails: (details: any) => void;
    setTaxDetails: (details: any) => void;
    setBankDetails: (details: any) => void;
    // Messages
    messagesData: any[];
    unreadCount: number;
    setMessagesData: (msgs: any[]) => void;
    fetchMessages: (supplierId: number) => Promise<void>;
    markMessageAsRead: (id: number) => void;

    updateDocumentStatus: (docId: string, status: string, filePath?: string) => void;
    setStatus: (status: string) => void;
    markSectionComplete: (section: OnboardingSection, isComplete: boolean) => void;
    reset: () => void;
}

import apiClient from '@/lib/api/client';

const initialDocuments = () => [
    { id: '1', name: 'Certificate of Incorporation', status: 'PENDING', required: true },
    { id: '2', name: 'Tax Registration Certificate', status: 'PENDING', required: true },
    { id: '3', name: 'Company Profile', status: 'PENDING', required: false },
    { id: '4', name: 'Bank Letter', status: 'PENDING', required: false },
    { id: '5', name: 'PAN Card', status: 'PENDING', required: false },
    { id: '6', name: 'GST Certificate', status: 'PENDING', required: false },
    { id: '7', name: 'W-9 Form', status: 'PENDING', required: false },
];

const initialCompletedSections = (): Record<OnboardingSection, boolean> => ({
    dashboard: true,
    company: false,
    address: false,
    contact: false,
    tax: false,
    bank: false,
    documents: false,
    messages: true,
});

export const useSupplierOnboardingStore = create<SupplierState>((set) => ({
    activeSection: 'dashboard',
    setActiveSection: (section) => set({ activeSection: section }),

    companyDetails: {},
    taxDetails: {},
    bankDetails: {},
    documents: initialDocuments(),

    messagesData: [],
    unreadCount: 0,

    status: 'DRAFT',
    country: '',
    supplierType: '',
    supplierId: null,
    setSupplierId: (id) => set({ supplierId: id }),

    completedSections: initialCompletedSections(),

    setCompanyDetails: (details) => set((state) => ({ companyDetails: { ...state.companyDetails, ...details } })),
    setTaxDetails: (details) => set({ taxDetails: details }),
    setBankDetails: (details) => set({ bankDetails: details }),

    setMessagesData: (msgs) => set({
        messagesData: msgs,
        unreadCount: msgs.filter((m: any) => !(m.isRead || m.isread)).length
    }),

    fetchMessages: async (supplierId) => {
        try {
            const msgs = await apiClient.get(`/api/suppliers/${supplierId}/messages`) as any[];
            set({
                messagesData: msgs,
                unreadCount: msgs.filter((m: any) => !(m.isRead || m.isread)).length
            });
        } catch (e) {
            console.error("Failed to fetch messages", e);
        }
    },

    markMessageAsRead: (id) => set((state) => {
        const newMsgs = state.messagesData.map((m: any) =>
            (m.messageId === id || m.messageid === id) ? { ...m, isRead: true, isread: true } : m
        );
        return {
            messagesData: newMsgs,
            unreadCount: newMsgs.filter((m: any) => !(m.isRead || m.isread)).length
        };
    }),

    updateDocumentStatus: (docId, status, filePath) => set((state) => ({
        documents: state.documents.map(d => d.id === docId ? { ...d, status, filePath: filePath || d.filePath } : d)
    })),

    setStatus: (status) => set({ status }),

    markSectionComplete: (section, isComplete) => set((state) => ({
        completedSections: { ...state.completedSections, [section]: isComplete }
    })),

    // Call this at the start of every init() to prevent stale data from a
    // previous supplier session bleeding into the next supplier's view.
    reset: () => set({
        activeSection: 'dashboard',
        companyDetails: {},
        taxDetails: {},
        bankDetails: {},
        documents: initialDocuments(),
        messagesData: [],
        unreadCount: 0,
        status: 'DRAFT',
        country: '',
        supplierType: '',
        supplierId: null,
        completedSections: initialCompletedSections(),
    }),
}));
