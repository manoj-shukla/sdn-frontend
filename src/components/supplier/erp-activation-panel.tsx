'use client';

import { useSupplierGovernanceStore } from '@/lib/store/supplier-erp-store';
import { validateERPReadiness } from '@/lib/store/supplier-erp-store';

interface ERPActivationPanelProps {
    supplierId: number;
    currentUserId: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
        NONE:   'bg-gray-100 text-gray-600',
        READY:  'bg-blue-100 text-blue-700',
        SYNCED: 'bg-green-100 text-green-700',
        FAILED: 'bg-red-100 text-red-700',
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? map.NONE}`}>
            {status}
        </span>
    );
};

/** M5-CON-01 / M5-CON-02: Contract-Ready section */
export function ContractReadinessCard({ supplierId, currentUserId }: ERPActivationPanelProps) {
    const { contractReadiness, markContractReady } = useSupplierGovernanceStore();
    const cr = contractReadiness[supplierId];

    const handleMark = () => {
        markContractReady(supplierId, currentUserId, {
            legalEntityVerified: true,
            complianceComplete: true,
            ndaAccepted: true,
        });
    };

    return (
        <div className="rounded-lg border p-4 space-y-3" data-testid="contract-readiness-card">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Contract Readiness</h3>
                {cr?.contractReady ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Contract-Ready
                    </span>
                ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                        Not Ready
                    </span>
                )}
            </div>

            {cr ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Legal Entity Verified</dt>
                    <dd>{cr.legalEntityVerified ? '✓' : '✗'}</dd>
                    <dt className="text-muted-foreground">Compliance Complete</dt>
                    <dd>{cr.complianceComplete ? '✓' : '✗'}</dd>
                    <dt className="text-muted-foreground">NDA Accepted</dt>
                    <dd>{cr.ndaAccepted ? '✓' : '✗'}</dd>
                    <dt className="text-muted-foreground">Marked By</dt>
                    <dd>{cr.markedBy}</dd>
                </dl>
            ) : (
                <p className="text-xs text-muted-foreground">
                    All readiness criteria must be met before marking Contract-Ready.
                </p>
            )}

            {!cr?.contractReady && (
                <button
                    onClick={handleMark}
                    className="mt-2 w-full rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                    data-testid="mark-contract-ready-btn"
                >
                    Mark as Contract-Ready
                </button>
            )}
        </div>
    );
}

/** M5-ERP-01 / M5-ERP-02: ERP Readiness section */
export function ERPReadinessCard({ supplierId, currentUserId }: ERPActivationPanelProps) {
    const { erpActivation, markERPReady, isContractReady } = useSupplierGovernanceStore();
    const erp = erpActivation[supplierId];
    const contractReady = isContractReady(supplierId);

    const readinessCheck = validateERPReadiness({
        bankValidated: erp?.bankValidated ?? false,
        taxApproved: erp?.taxApproved ?? false,
        complianceOk: erp?.complianceOk ?? false,
        contractReady,
    });

    const handleMarkERPReady = () => {
        markERPReady(supplierId, currentUserId, 'SAP');
    };

    return (
        <div className="rounded-lg border p-4 space-y-3" data-testid="erp-readiness-card">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">ERP Activation</h3>
                <StatusBadge status={erp?.activationStatus ?? 'NONE'} />
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Bank Validated (AP)</dt>
                <dd className={erp?.bankValidated ? 'text-green-600' : 'text-red-500'}>
                    {erp?.bankValidated ? '✓ Validated' : '✗ Pending'}
                </dd>
                <dt className="text-muted-foreground">Tax Approved</dt>
                <dd className={erp?.taxApproved ? 'text-green-600' : 'text-red-500'}>
                    {erp?.taxApproved ? '✓ Approved' : '✗ Pending'}
                </dd>
                <dt className="text-muted-foreground">Compliance OK</dt>
                <dd className={erp?.complianceOk ? 'text-green-600' : 'text-red-500'}>
                    {erp?.complianceOk ? '✓ Clear' : '✗ Issues'}
                </dd>
                <dt className="text-muted-foreground">Contract-Ready</dt>
                <dd className={contractReady ? 'text-green-600' : 'text-red-500'}>
                    {contractReady ? '✓ Yes' : '✗ No'}
                </dd>
            </dl>

            {erp?.erpVendorId && (
                <div className="rounded bg-green-50 px-3 py-2 text-xs" data-testid="erp-vendor-id">
                    <span className="font-medium">ERP Vendor ID:</span> {erp.erpVendorId}
                </div>
            )}

            {!readinessCheck.ready && readinessCheck.blockers.length > 0 && (
                <ul className="rounded bg-red-50 px-3 py-2 text-xs space-y-0.5" data-testid="erp-blockers">
                    {readinessCheck.blockers.map((b) => (
                        <li key={b} className="text-red-600">• {b}</li>
                    ))}
                </ul>
            )}

            {readinessCheck.ready && erp?.activationStatus === 'NONE' && (
                <button
                    onClick={handleMarkERPReady}
                    className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                    data-testid="mark-erp-ready-btn"
                >
                    Mark as ERP-Ready
                </button>
            )}

            {erp?.activationStatus === 'FAILED' && (
                <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600" data-testid="erp-sync-failed">
                    ERP sync failed. Supplier state preserved. Retry sync when ready.
                </p>
            )}
        </div>
    );
}

/** Combined M5 panel */
export default function ERPActivationPanel(props: ERPActivationPanelProps) {
    return (
        <div className="space-y-4" data-testid="erp-activation-panel">
            <ContractReadinessCard {...props} />
            <ERPReadinessCard {...props} />
        </div>
    );
}
