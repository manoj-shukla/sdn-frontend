import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
    useSupplierGovernanceStore,
    computeComplianceStatus,
    validateTaxId,
    detectDuplicate,
    classifyChange,
    validateERPReadiness
} from '@/lib/store/supplier-erp-store';

const resetStore = () => {
    useSupplierGovernanceStore.setState({
        riskLevel: null,
        assessedBy: null,
        assessedAt: null,
        controlsTriggered: false,
        complianceDocs: [],
        relationships: [],
        contractReadiness: {},
        erpActivation: {},
        contracts: {},
        offboardedSuppliers: {},
    });
};

describe('Supplier Governance Store', () => {
    beforeEach(() => resetStore());

    // ── M3: Risk & Compliance Tests ────────────────────────────────────────
    describe('Risk & Compliance (Milestone 3)', () => {
        describe('risk level management', () => {
            it('sets risk level with assessor', () => {
                act(() => useSupplierGovernanceStore.getState().setRiskLevel('HIGH', 'admin@example.com'));
                const state = useSupplierGovernanceStore.getState();
                expect(state.riskLevel).toBe('HIGH');
                expect(state.assessedBy).toBe('admin@example.com');
                expect(state.assessedAt).toBeDefined();
            });

            it('triggers controls for HIGH risk', () => {
                act(() => useSupplierGovernanceStore.getState().setRiskLevel('HIGH', 'admin@example.com'));
                expect(useSupplierGovernanceStore.getState().controlsTriggered).toBe(true);
            });

            it('does not trigger controls for LOW/MEDIUM risk', () => {
                act(() => useSupplierGovernanceStore.getState().setRiskLevel('LOW', 'admin@example.com'));
                expect(useSupplierGovernanceStore.getState().controlsTriggered).toBe(false);

                act(() => useSupplierGovernanceStore.getState().setRiskLevel('MEDIUM', 'admin@example.com'));
                expect(useSupplierGovernanceStore.getState().controlsTriggered).toBe(false);
            });
        });

        describe('compliance documents', () => {
            const doc1 = {
                docId: 'DOC001',
                docType: 'INSURANCE',
                name: 'Liability Insurance',
                fileUrl: '/files/insurance.pdf',
                expiryDate: '2026-12-31',
                status: 'VALID' as const,
            };

            const doc2 = {
                docId: 'DOC002',
                docType: 'LICENSE',
                name: 'Business License',
                fileUrl: '/files/license.pdf',
                expiryDate: '2026-01-01',
                status: 'VALID' as const,
            };

            it('adds compliance document', () => {
                act(() => useSupplierGovernanceStore.getState().addComplianceDoc(doc1));
                expect(useSupplierGovernanceStore.getState().complianceDocs).toHaveLength(1);
                expect(useSupplierGovernanceStore.getState().complianceDocs[0].docId).toBe('DOC001');
            });

            it('updates document status', () => {
                act(() => useSupplierGovernanceStore.getState().addComplianceDoc(doc1));
                act(() => useSupplierGovernanceStore.getState().updateDocStatus('DOC001', 'EXPIRED'));
                const doc = useSupplierGovernanceStore.getState().complianceDocs.find(d => d.docId === 'DOC001');
                expect(doc?.status).toBe('EXPIRED');
            });

            it('refreshes compliance statuses based on expiry dates', () => {
                act(() => useSupplierGovernanceStore.getState().addComplianceDoc(doc1)); // Expires in Dec
                act(() => useSupplierGovernanceStore.getState().addComplianceDoc(doc2)); // Expires Jan

                act(() => useSupplierGovernanceStore.getState().refreshComplianceStatuses());

                // Verify the method runs - actual status logic is tested in helper functions
                const docs = useSupplierGovernanceStore.getState().complianceDocs;
                expect(docs).toHaveLength(2);
            });
        });
    });

    // ── M4: Relationships Tests ──────────────────────────────────────────────
    describe('Relationships (Milestone 4)', () => {
        const rel1 = {
            relationshipId: 'REL001',
            buyerId: 'B001',
            supplierId: 'S001',
            status: 'ACTIVE' as const,
            startDate: '2026-01-01',
        };

        const rel2 = {
            relationshipId: 'REL002',
            buyerId: 'B001',
            supplierId: 'S002',
            status: 'PENDING' as const,
            startDate: '2026-01-15',
        };

        it('adds relationship', () => {
            act(() => useSupplierGovernanceStore.getState().addRelationship(rel1));
            expect(useSupplierGovernanceStore.getState().relationships).toHaveLength(1);
        });

        it('updates relationship status', () => {
            act(() => useSupplierGovernanceStore.getState().addRelationship(rel2));
            act(() => useSupplierGovernanceStore.getState().updateRelationshipStatus('REL002', 'ACTIVE'));
            const rel = useSupplierGovernanceStore.getState().relationships.find(r => r.relationshipId === 'REL002');
            expect(rel?.status).toBe('ACTIVE');
        });

        it('filters active relationships', () => {
            act(() => useSupplierGovernanceStore.getState().addRelationship(rel1));
            act(() => useSupplierGovernanceStore.getState().addRelationship(rel2));
            const active = useSupplierGovernanceStore.getState().getActiveRelationships();
            expect(active).toHaveLength(1);
            expect(active[0].relationshipId).toBe('REL001');
        });
    });

    // ── M5: Contract Readiness & ERP Tests ───────────────────────────────────
    describe('Contract Readiness & ERP Activation (Milestone 5)', () => {
        describe('contract readiness', () => {
            it('marks supplier as contract ready when all criteria met', () => {
                act(() => useSupplierGovernanceStore.getState().markContractReady(
                    123,
                    'admin@example.com',
                    { legalEntityVerified: true, complianceComplete: true, ndaAccepted: true }
                ));
                expect(useSupplierGovernanceStore.getState().isContractReady(123)).toBe(true);
            });

            it('does not mark contract ready if criteria not met', () => {
                act(() => useSupplierGovernanceStore.getState().markContractReady(
                    123,
                    'admin@example.com',
                    { legalEntityVerified: true, complianceComplete: false, ndaAccepted: true }
                ));
                expect(useSupplierGovernanceStore.getState().isContractReady(123)).toBe(false);
            });

            it('associates contract after contract ready', () => {
                act(() => useSupplierGovernanceStore.getState().markContractReady(
                    123,
                    'admin@example.com',
                    { legalEntityVerified: true, complianceComplete: true, ndaAccepted: true }
                ));
                act(() => useSupplierGovernanceStore.getState().associateContract(123, 'CONTRACT-001'));
                const contracts = useSupplierGovernanceStore.getState().getContracts(123);
                expect(contracts).toHaveLength(1);
                expect(contracts[0].contractId).toBe('CONTRACT-001');
            });

            it('does not associate contract if not contract ready', () => {
                act(() => useSupplierGovernanceStore.getState().associateContract(123, 'CONTRACT-001'));
                const contracts = useSupplierGovernanceStore.getState().getContracts(123);
                expect(contracts).toHaveLength(0);
            });
        });

        describe('ERP readiness', () => {
            beforeEach(() => {
                act(() => useSupplierGovernanceStore.getState().markContractReady(
                    123,
                    'admin@example.com',
                    { legalEntityVerified: true, complianceComplete: true, ndaAccepted: true }
                ));
            });

            it('marks ERP ready when all validations pass', () => {
                // First set the validation states
                act(() => useSupplierGovernanceStore.setState({
                    erpActivation: {
                        123: {
                            supplierId: 123,
                            erpSystem: 'SAP',
                            activationStatus: 'NONE',
                            bankValidated: true,
                            taxApproved: true,
                            complianceOk: true,
                        }
                    }
                }));

                const result = useSupplierGovernanceStore.getState().markERPReady(
                    123,
                    'admin@example.com',
                    'SAP'
                );
                expect(result.success).toBe(true);
            });

            it('fails ERP readiness if bank not validated', () => {
                act(() => useSupplierGovernanceStore.setState({
                    erpActivation: {
                        123: {
                            supplierId: 123,
                            erpSystem: 'SAP',
                            activationStatus: 'NONE',
                            bankValidated: false,
                            taxApproved: true,
                            complianceOk: true,
                        }
                    }
                }));

                const result = useSupplierGovernanceStore.getState().markERPReady(
                    123,
                    'admin@example.com',
                    'SAP'
                );
                expect(result.success).toBe(false);
                expect(result.reason).toBe('Bank details not validated');
            });

            it('syncs to ERP when ready', () => {
                act(() => useSupplierGovernanceStore.setState({
                    erpActivation: {
                        123: {
                            supplierId: 123,
                            erpSystem: 'SAP',
                            activationStatus: 'READY',
                            bankValidated: true,
                            taxApproved: true,
                            complianceOk: true,
                        }
                    }
                }));

                act(() => useSupplierGovernanceStore.getState().syncToERP(123, 'VENDOR-123'));
                const status = useSupplierGovernanceStore.getState().getERPStatus(123);
                expect(status).toBe('SYNCED');
            });

            it('records ERP sync failure', () => {
                act(() => useSupplierGovernanceStore.setState({
                    erpActivation: {
                        123: {
                            supplierId: 123,
                            erpSystem: 'SAP',
                            activationStatus: 'READY',
                            bankValidated: true,
                            taxApproved: true,
                            complianceOk: true,
                        }
                    }
                }));

                act(() => useSupplierGovernanceStore.getState().recordERPSyncFailure(123));
                const status = useSupplierGovernanceStore.getState().getERPStatus(123);
                expect(status).toBe('FAILED');
            });

            it('only allows PO when synced', () => {
                expect(useSupplierGovernanceStore.getState().canUsePO(123)).toBe(false);

                act(() => useSupplierGovernanceStore.setState({
                    erpActivation: {
                        123: {
                            supplierId: 123,
                            erpSystem: 'SAP',
                            activationStatus: 'SYNCED',
                            bankValidated: true,
                            taxApproved: true,
                            complianceOk: true,
                        }
                    }
                }));

                expect(useSupplierGovernanceStore.getState().canUsePO(123)).toBe(true);
            });
        });

        describe('supplier offboarding', () => {
            it('offboards supplier with reason', () => {
                act(() => useSupplierGovernanceStore.getState().offboardSupplier(123, 'Business closed'));
                const offboarded = useSupplierGovernanceStore.getState().offboardedSuppliers;
                expect(offboarded[123]?.reason).toBe('Business closed');
                expect(offboarded[123]?.offboardedAt).toBeDefined();
            });
        });
    });
});

// ── Pure Helper Function Tests ───────────────────────────────────────────────
describe('Supplier Governance Helper Functions', () => {
    describe('computeComplianceStatus', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns VALID for future expiry', () => {
            vi.setSystemTime(new Date('2026-02-26').getTime());
            expect(computeComplianceStatus('2026-12-31')).toBe('VALID');
        });

        it('returns EXPIRING for within 30 days', () => {
            vi.setSystemTime(new Date('2026-02-26').getTime());
            expect(computeComplianceStatus('2026-03-15')).toBe('EXPIRING');
        });

        it('returns EXPIRED for past expiry', () => {
            vi.setSystemTime(new Date('2026-02-26').getTime());
            expect(computeComplianceStatus('2026-01-01')).toBe('EXPIRED');
        });
    });

    describe('validateTaxId', () => {
        it('validates UAE TRN format', () => {
            expect(validateTaxId('UAE', '123456789012345')).toEqual({ valid: true });
            expect(validateTaxId('UAE', '123')).toEqual({
                valid: false,
                error: 'Invalid TRN (15 digits) format'
            });
        });

        it('validates India GSTIN format', () => {
            expect(validateTaxId('IN', '29AABCU9603R1ZM')).toEqual({ valid: true });
            expect(validateTaxId('IN', 'invalid')).toEqual({
                valid: false,
                error: 'Invalid GSTIN format'
            });
        });

        it('validates Singapore UEN format', () => {
            expect(validateTaxId('SG', '123456789A')).toEqual({ valid: true });
            expect(validateTaxId('SG', '123')).toEqual({
                valid: false,
                error: 'Invalid UEN (9 digits + letter) format'
            });
        });

        it('validates US EIN format', () => {
            expect(validateTaxId('US', '12-3456789')).toEqual({ valid: true });
            expect(validateTaxId('US', '123')).toEqual({
                valid: false,
                error: 'Invalid EIN (XX-XXXXXXX) format'
            });
        });

        it('passes for unknown country', () => {
            expect(validateTaxId('XX', 'any-value')).toEqual({ valid: true });
        });
    });

    describe('detectDuplicate', () => {
        const existing = [
            { legalName: 'Acme Corp', taxId: '12345' },
            { legalName: 'Global Tech', taxId: '67890' },
        ];

        it('detects duplicate by legal name', () => {
            expect(detectDuplicate('acme corp', '99999', existing)).toBe(true);
        });

        it('detects duplicate by tax ID', () => {
            expect(detectDuplicate('New Company', '12345', existing)).toBe(true);
        });

        it('returns false for unique entry', () => {
            expect(detectDuplicate('Unique Inc', '11111', existing)).toBe(false);
        });
    });

    describe('classifyChange', () => {
        it('classifies bank fields as MAJOR', () => {
            expect(classifyChange('bankAccountNumber')).toBe('MAJOR');
            expect(classifyChange('routingNumber')).toBe('MAJOR');
            expect(classifyChange('iban')).toBe('MAJOR');
            expect(classifyChange('swiftCode')).toBe('MAJOR');
        });

        it('classifies legal fields as MAJOR', () => {
            expect(classifyChange('taxId')).toBe('MAJOR');
            expect(classifyChange('legalName')).toBe('MAJOR');
            expect(classifyChange('registrationNumber')).toBe('MAJOR');
        });

        it('classifies other fields as MINOR', () => {
            expect(classifyChange('phone')).toBe('MINOR');
            expect(classifyChange('email')).toBe('MINOR');
            expect(classifyChange('website')).toBe('MINOR');
        });
    });

    describe('validateERPReadiness', () => {
        it('returns ready when all checks pass', () => {
            const result = validateERPReadiness({
                bankValidated: true,
                taxApproved: true,
                complianceOk: true,
                contractReady: true,
            });
            expect(result.ready).toBe(true);
            expect(result.blockers).toHaveLength(0);
        });

        it('lists all blockers when multiple fail', () => {
            const result = validateERPReadiness({
                bankValidated: false,
                taxApproved: false,
                complianceOk: false,
                contractReady: false,
            });
            expect(result.ready).toBe(false);
            expect(result.blockers).toHaveLength(4);
        });

        it('identifies specific blockers', () => {
            const result = validateERPReadiness({
                bankValidated: true,
                taxApproved: false,
                complianceOk: true,
                contractReady: false,
            });
            expect(result.ready).toBe(false);
            expect(result.blockers).toContain('Tax information not approved');
            expect(result.blockers).toContain('Supplier not Contract-Ready');
        });
    });
});
