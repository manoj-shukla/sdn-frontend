import { create } from 'zustand';
import {
    SupplierContractReadiness,
    SupplierERPActivation,
    SupplierContractMap,
    ERPSystem,
    ERPActivationStatus,
} from '@/types/supplier';

// ─── Milestone 3: Risk & Compliance Store ────────────────────────────────────

import type { RiskLevel, ComplianceDocument } from '@/types/supplier';

interface RiskComplianceState {
    riskLevel: RiskLevel | null;
    assessedBy: string | null;
    assessedAt: string | null;
    controlsTriggered: boolean;
    complianceDocs: ComplianceDocument[];

    setRiskLevel: (level: RiskLevel, assessedBy: string) => void;
    addComplianceDoc: (doc: ComplianceDocument) => void;
    updateDocStatus: (docId: string, status: ComplianceDocument['status']) => void;
    /** Auto-updates expiry statuses based on today's date */
    refreshComplianceStatuses: () => void;
}

// ─── Milestone 4: Relationship Store ─────────────────────────────────────────

import type { BuyerSupplierRelationship, RelationshipStatus } from '@/types/supplier';

interface RelationshipState {
    relationships: BuyerSupplierRelationship[];
    addRelationship: (rel: BuyerSupplierRelationship) => void;
    updateRelationshipStatus: (id: string, status: RelationshipStatus) => void;
    getActiveRelationships: () => BuyerSupplierRelationship[];
}

// ─── Milestone 5: Contract Readiness & ERP Activation Store ──────────────────

interface M5State {
    /** Contract-Ready state per supplier (keyed by supplierId) */
    contractReadiness: Record<number, SupplierContractReadiness>;
    /** ERP Activation state per supplier */
    erpActivation: Record<number, SupplierERPActivation>;
    /** Contract associations per supplier */
    contracts: Record<number, SupplierContractMap[]>;

    // ── Contract Readiness ──────────────────────────────────────────────────
    markContractReady: (supplierId: number, markedBy: string, criteria: {
        legalEntityVerified: boolean;
        complianceComplete: boolean;
        ndaAccepted: boolean;
    }) => void;
    isContractReady: (supplierId: number) => boolean;

    // ── Contract Association ────────────────────────────────────────────────
    associateContract: (supplierId: number, contractId: string) => void;
    getContracts: (supplierId: number) => SupplierContractMap[];

    // ── ERP Readiness ───────────────────────────────────────────────────────
    markERPReady: (supplierId: number, markedBy: string, erpSystem: ERPSystem) => { success: boolean; reason?: string };
    isERPReady: (supplierId: number) => boolean;

    // ── ERP Sync ────────────────────────────────────────────────────────────
    syncToERP: (supplierId: number, erpVendorId: string) => void;
    recordERPSyncFailure: (supplierId: number) => void;
    getERPStatus: (supplierId: number) => ERPActivationStatus;

    // ── ERP Activation validation ───────────────────────────────────────────
    /** Returns true only if supplierId is fully SYNCED — required before POs */
    canUsePO: (supplierId: number) => boolean;

    // ── Deactivation ────────────────────────────────────────────────────────
    /** Marks supplier inactive post-ERP, preserves ERP history */
    offboardSupplier: (supplierId: number, reason: string) => void;
    offboardedSuppliers: Record<number, { reason: string; offboardedAt: string }>;
}

// ─── Combined Store ───────────────────────────────────────────────────────────

type SupplierGovernanceState = RiskComplianceState & RelationshipState & M5State;

export const useSupplierGovernanceStore = create<SupplierGovernanceState>((set, get) => ({
    // ── M3: Risk & Compliance ─────────────────────────────────────────────────
    riskLevel: null,
    assessedBy: null,
    assessedAt: null,
    controlsTriggered: false,
    complianceDocs: [],

    setRiskLevel: (level, assessedBy) => set({
        riskLevel: level,
        assessedBy,
        assessedAt: new Date().toISOString(),
        controlsTriggered: level === 'HIGH',
    }),

    addComplianceDoc: (doc) => set((state) => ({
        complianceDocs: [...state.complianceDocs, doc],
    })),

    updateDocStatus: (docId, status) => set((state) => ({
        complianceDocs: state.complianceDocs.map(d =>
            d.docId === docId ? { ...d, status } : d
        ),
    })),

    refreshComplianceStatuses: () => set((state) => {
        const now = new Date();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        return {
            complianceDocs: state.complianceDocs.map(doc => {
                const expiry = new Date(doc.expiryDate);
                let status: ComplianceDocument['status'] = 'VALID';
                if (expiry < now) {
                    status = 'EXPIRED';
                } else if (expiry.getTime() - now.getTime() <= thirtyDays) {
                    status = 'EXPIRING';
                }
                return { ...doc, status };
            }),
        };
    }),

    // ── M4: Relationships ─────────────────────────────────────────────────────
    relationships: [],

    addRelationship: (rel) => set((state) => ({
        relationships: [...state.relationships, rel],
    })),

    updateRelationshipStatus: (id, status) => set((state) => ({
        relationships: state.relationships.map(r =>
            r.relationshipId === id ? { ...r, status } : r
        ),
    })),

    getActiveRelationships: () =>
        get().relationships.filter(r => r.status === 'ACTIVE'),

    // ── M5: Contract Readiness & ERP Activation ───────────────────────────────
    contractReadiness: {},
    erpActivation: {},
    contracts: {},
    offboardedSuppliers: {},

    markContractReady: (supplierId, markedBy, criteria) => {
        const allMet =
            criteria.legalEntityVerified &&
            criteria.complianceComplete &&
            criteria.ndaAccepted;

        if (!allMet) return; // Criteria not met — blocked

        set((state) => ({
            contractReadiness: {
                ...state.contractReadiness,
                [supplierId]: {
                    supplierId,
                    contractReady: true,
                    markedBy,
                    markedAt: new Date().toISOString(),
                    ...criteria,
                },
            },
        }));
    },

    isContractReady: (supplierId) =>
        get().contractReadiness[supplierId]?.contractReady === true,

    associateContract: (supplierId, contractId) => {
        // Supplier must be Contract-Ready before associating
        if (!get().isContractReady(supplierId)) return;

        const newEntry: SupplierContractMap = {
            contractId,
            supplierId,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
        };

        set((state) => ({
            contracts: {
                ...state.contracts,
                [supplierId]: [...(state.contracts[supplierId] ?? []), newEntry],
            },
        }));
    },

    getContracts: (supplierId) => get().contracts[supplierId] ?? [],

    markERPReady: (supplierId, _markedBy, erpSystem) => {
        const existing = get().erpActivation[supplierId];

        // Financial validations must all pass
        const bankValidated = existing?.bankValidated ?? false;
        const taxApproved = existing?.taxApproved ?? false;
        const complianceOk = existing?.complianceOk ?? false;

        if (!bankValidated) return { success: false, reason: 'Bank details not validated' };
        if (!taxApproved) return { success: false, reason: 'Tax information not approved' };
        if (!complianceOk) return { success: false, reason: 'Compliance check incomplete' };

        // Supplier must be Contract-Ready first
        if (!get().isContractReady(supplierId)) {
            return { success: false, reason: 'Supplier not Contract-Ready' };
        }

        set((state) => ({
            erpActivation: {
                ...state.erpActivation,
                [supplierId]: {
                    supplierId,
                    erpSystem,
                    activationStatus: 'READY',
                    bankValidated,
                    taxApproved,
                    complianceOk,
                },
            },
        }));

        return { success: true };
    },

    isERPReady: (supplierId) =>
        get().erpActivation[supplierId]?.activationStatus === 'READY' ||
        get().erpActivation[supplierId]?.activationStatus === 'SYNCED',

    syncToERP: (supplierId, erpVendorId) => {
        const current = get().erpActivation[supplierId];
        if (!current || current.activationStatus !== 'READY') return;

        set((state) => ({
            erpActivation: {
                ...state.erpActivation,
                [supplierId]: {
                    ...current,
                    // ERP ID is write-once: never overwrite if already set
                    erpVendorId: current.erpVendorId ?? erpVendorId,
                    activationStatus: 'SYNCED',
                    activatedAt: new Date().toISOString(),
                },
            },
        }));
    },

    recordERPSyncFailure: (supplierId) => {
        const current = get().erpActivation[supplierId];
        if (!current) return;

        set((state) => ({
            erpActivation: {
                ...state.erpActivation,
                [supplierId]: {
                    ...current,
                    activationStatus: 'FAILED',
                    // Supplier state is NOT rolled back — remains READY for retry
                },
            },
        }));
    },

    getERPStatus: (supplierId) =>
        get().erpActivation[supplierId]?.activationStatus ?? 'NONE',

    canUsePO: (supplierId) =>
        get().erpActivation[supplierId]?.activationStatus === 'SYNCED',

    offboardSupplier: (supplierId, reason) => {
        set((state) => ({
            offboardedSuppliers: {
                ...state.offboardedSuppliers,
                [supplierId]: { reason, offboardedAt: new Date().toISOString() },
            },
        }));
    },
}));

// ─── Helpers (pure, testable) ─────────────────────────────────────────────────

/** M3: Determines compliance doc status from expiry date */
export function computeComplianceStatus(expiryDate: string): 'VALID' | 'EXPIRING' | 'EXPIRED' {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (expiry < now) return 'EXPIRED';
    if (expiry.getTime() - now.getTime() <= thirtyDays) return 'EXPIRING';
    return 'VALID';
}

/** M1: Country-specific tax ID validation */
export function validateTaxId(country: string, taxId: string): { valid: boolean; error?: string } {
    const rules: Record<string, { pattern: RegExp; label: string }> = {
        UAE: { pattern: /^\d{15}$/, label: 'TRN (15 digits)' },
        IN:  { pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, label: 'GSTIN' },
        SG:  { pattern: /^\d{9}[A-Z]$/, label: 'UEN (9 digits + letter)' },
        US:  { pattern: /^\d{2}-\d{7}$/, label: 'EIN (XX-XXXXXXX)' },
    };
    const rule = rules[country.toUpperCase()];
    if (!rule) return { valid: true }; // No rule configured → pass
    if (!taxId || !taxId.trim()) return { valid: false, error: `${rule.label} is required` };
    if (!rule.pattern.test(taxId.trim())) return { valid: false, error: `Invalid ${rule.label} format` };
    return { valid: true };
}

/** M1: Duplicate detection — checks name + taxId against existing list */
export function detectDuplicate(
    legalName: string,
    taxId: string,
    existing: Array<{ legalName: string; taxId?: string }>
): boolean {
    const norm = (s: string) => s.trim().toLowerCase();
    return existing.some(
        (s) =>
            norm(s.legalName) === norm(legalName) ||
            (taxId && s.taxId && norm(s.taxId) === norm(taxId))
    );
}

/** M2: Classify a changed field as MINOR or MAJOR */
export function classifyChange(fieldName: string): 'MINOR' | 'MAJOR' {
    const majorFields = new Set([
        'bankAccountNumber', 'routingNumber', 'iban', 'swiftCode',
        'taxId', 'legalName', 'registrationNumber',
    ]);
    return majorFields.has(fieldName) ? 'MAJOR' : 'MINOR';
}

/** M5: Full ERP readiness gate check */
export function validateERPReadiness(params: {
    bankValidated: boolean;
    taxApproved: boolean;
    complianceOk: boolean;
    contractReady: boolean;
}): { ready: boolean; blockers: string[] } {
    const blockers: string[] = [];
    if (!params.bankValidated) blockers.push('Bank details not validated by AP');
    if (!params.taxApproved) blockers.push('Tax information not approved');
    if (!params.complianceOk) blockers.push('Compliance check incomplete');
    if (!params.contractReady) blockers.push('Supplier not Contract-Ready');
    return { ready: blockers.length === 0, blockers };
}
