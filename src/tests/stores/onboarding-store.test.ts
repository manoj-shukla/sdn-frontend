import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSupplierOnboardingStore } from '@/lib/store/supplier-onboarding-store';

const resetStore = () => {
    useSupplierOnboardingStore.setState({
        activeSection: 'dashboard',
        companyDetails: {},
        taxDetails: {},
        bankDetails: {},
        status: 'DRAFT',
        country: '',
        supplierType: '',
        supplierId: null,
        completedSections: {
            dashboard: true,
            company: false,
            address: false,
            contact: false,
            tax: false,
            bank: false,
            documents: false,
            messages: true,
        },
        messagesData: [],
        unreadCount: 0,
    });
};

describe('Supplier Onboarding Store', () => {
    beforeEach(() => resetStore());

    describe('section navigation', () => {
        it('sets the active section', () => {
            act(() => useSupplierOnboardingStore.getState().setActiveSection('company'));
            expect(useSupplierOnboardingStore.getState().activeSection).toBe('company');
        });
    });

    describe('section completion tracking', () => {
        it('marks a section as complete', () => {
            act(() => useSupplierOnboardingStore.getState().markSectionComplete('company', true));
            expect(useSupplierOnboardingStore.getState().completedSections.company).toBe(true);
        });

        it('marks a section as incomplete', () => {
            act(() => useSupplierOnboardingStore.getState().markSectionComplete('company', true));
            act(() => useSupplierOnboardingStore.getState().markSectionComplete('company', false));
            expect(useSupplierOnboardingStore.getState().completedSections.company).toBe(false);
        });

        it('dashboard and messages sections are complete by default', () => {
            const { completedSections } = useSupplierOnboardingStore.getState();
            expect(completedSections.dashboard).toBe(true);
            expect(completedSections.messages).toBe(true);
        });
    });

    describe('company details', () => {
        it('merges new company details into existing', () => {
            act(() => useSupplierOnboardingStore.getState().setCompanyDetails({ name: 'ACME' }));
            act(() => useSupplierOnboardingStore.getState().setCompanyDetails({ country: 'SG' }));
            const details = useSupplierOnboardingStore.getState().companyDetails;
            expect(details.name).toBe('ACME');
            expect(details.country).toBe('SG');
        });
    });

    describe('tax details', () => {
        it('replaces tax details', () => {
            act(() => useSupplierOnboardingStore.getState().setTaxDetails({ gst: '1234567890' }));
            expect(useSupplierOnboardingStore.getState().taxDetails.gst).toBe('1234567890');
        });
    });

    describe('bank details', () => {
        it('stores bank details', () => {
            act(() => useSupplierOnboardingStore.getState().setBankDetails({ bankName: 'DBS', accountNumber: '1234567890' }));
            expect(useSupplierOnboardingStore.getState().bankDetails.bankName).toBe('DBS');
        });
    });

    describe('documents', () => {
        it('updates document status to UPLOADED', () => {
            act(() => useSupplierOnboardingStore.getState().updateDocumentStatus('1', 'UPLOADED', '/files/cert.pdf'));
            const doc = useSupplierOnboardingStore.getState().documents.find(d => d.id === '1');
            expect(doc?.status).toBe('UPLOADED');
            expect(doc?.filePath).toBe('/files/cert.pdf');
        });

        it('does not affect other documents when updating one', () => {
            act(() => useSupplierOnboardingStore.getState().updateDocumentStatus('1', 'UPLOADED'));
            const doc2 = useSupplierOnboardingStore.getState().documents.find(d => d.id === '2');
            expect(doc2?.status).toBe('PENDING');
        });
    });

    describe('messages', () => {
        const msgs = [
            { messageId: 1, content: 'Hello', isRead: false },
            { messageId: 2, content: 'Hi',    isRead: true },
        ];

        it('sets messages and calculates unread count', () => {
            act(() => useSupplierOnboardingStore.getState().setMessagesData(msgs));
            expect(useSupplierOnboardingStore.getState().messagesData).toHaveLength(2);
            expect(useSupplierOnboardingStore.getState().unreadCount).toBe(1);
        });

        it('marks a message as read and decrements unread count', () => {
            act(() => useSupplierOnboardingStore.getState().setMessagesData(msgs));
            act(() => useSupplierOnboardingStore.getState().markMessageAsRead(1));
            expect(useSupplierOnboardingStore.getState().unreadCount).toBe(0);
        });
    });

    describe('supplierId', () => {
        it('sets the supplierId', () => {
            act(() => useSupplierOnboardingStore.getState().setSupplierId(42));
            expect(useSupplierOnboardingStore.getState().supplierId).toBe(42);
        });
    });
});
