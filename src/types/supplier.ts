export type SupplierStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "REWORK_REQUIRED" | "SUSPENDED" | "IN_REVIEW";

export type SupplierRole = "Admin" | "User";


export type ReviewDecision = "APPROVE" | "REJECT" | "REQUEST_REWORK";

export interface Supplier {
    supplierId: number;
    legalName: string;
    businessType?: string;
    country?: string;
    taxId?: string;
    website?: string;
    description?: string;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    isActive: boolean;
    approvalStatus: SupplierStatus;
    submittedAt?: string;
    reviewedAt?: string;
    approvalNotes?: string;
    createdByUserId: number;
    createdByUsername?: string;
    buyerId?: number;

    // Frontend convenience fields (if mapped)
    profileStatus?: string;
    documentStatus?: string;
    financeStatus?: string;
    gstin?: string;
    isGstRegistered?: boolean;
}

export interface SupplierContact {
    contactId: number;
    supplierId: number;
    contactType: "PRIMARY" | "FINANCE" | "OPERATIONS" | "TECHNICAL" | "SALES" | "OTHER";
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    mobile?: string;
    designation?: string;
    department?: string;
    isPrimary: boolean;
    isActive: boolean;
}

export interface SupplierAddress {
    addressId: number;
    supplierId: number;
    addressType: "REGISTERED" | "BILLING" | "SHIPPING" | "WAREHOUSE" | "OTHER";
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateProvince?: string;
    postalCode?: string;
    country: string;
    isPrimary: boolean;
}

export type DocumentType = "REGISTRATION" | "TAX_CERTIFICATE" | "BANK_DETAILS" | "QUALITY_CERT" | "INSURANCE" | "COMPLIANCE" | "CONTRACT" | "OTHER";
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";

export interface SupplierDocument {
    documentId: number;
    supplierId: number;
    documentType: DocumentType;
    documentName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
    verificationStatus: VerificationStatus;
    expiryDate?: string;
    notes?: string;
    isActive: boolean;
    uploadedByUserId: number;
    uploadedByUsername?: string;
    verifiedByUserId?: number;
    verifiedAt?: string;
}

export interface ChangeRequest {
    requestId: number;
    supplierId: number;
    requestType: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedByUserId: number;
    requestedAt: string;
    changeType?: string; // For bank-management compatibility
    changeData?: any;    // For bank-management compatibility
    entityId?: number;   // For bank-management compatibility
    items?: ChangeRequestItem[];
}

export interface ChangeRequestItem {
    itemId: number;
    requestId: number;
    fieldName: string;
    oldValue: any;
    newValue: any;
    changeCategory: 'MINOR' | 'MAJOR';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// ─── Milestone 3: Risk & Compliance ──────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ComplianceDocStatus = 'VALID' | 'EXPIRING' | 'EXPIRED';

export interface SupplierRiskProfile {
    supplierId: number;
    riskLevel: RiskLevel;
    assessedBy: string;
    assessedAt: string;
    notes?: string;
    controlsTriggered: boolean;
}

export interface ComplianceDocument {
    docId: string;
    supplierId: number;
    documentName: string;
    status: ComplianceDocStatus;
    expiryDate: string;          // ISO date string
    uploadedAt: string;
    mandatory: boolean;
}

// ─── Milestone 4: Buyer–Supplier Relationship ────────────────────────────────

export type RelationshipStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface BuyerSupplierRelationship {
    relationshipId: string;
    buyerId: string;
    supplierId: number;
    status: RelationshipStatus;
    createdAt: string;
    category?: string;
    sourcingEnabled: boolean;
}

// ─── Milestone 5: Contract Readiness & ERP Activation ────────────────────────

export type ERPSystem = 'SAP' | 'ORACLE' | 'OTHER';
export type ERPActivationStatus = 'NONE' | 'READY' | 'SYNCED' | 'FAILED';
export type ContractAssociationStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface SupplierContractReadiness {
    supplierId: number;
    contractReady: boolean;
    markedBy: string;
    markedAt: string;
    /** Criteria checklist */
    legalEntityVerified: boolean;
    complianceComplete: boolean;
    ndaAccepted: boolean;
}

export interface SupplierERPActivation {
    supplierId: number;
    erpSystem: ERPSystem;
    /** Write-once — set only after successful ERP sync */
    erpVendorId?: string;
    activationStatus: ERPActivationStatus;
    activatedAt?: string;
    /** Financial validations required before ERP-Ready */
    bankValidated: boolean;
    taxApproved: boolean;
    complianceOk: boolean;
}

export interface SupplierContractMap {
    contractId: string;
    supplierId: number;
    status: ContractAssociationStatus;
    createdAt: string;
}

/** Full Milestone 5 state for a supplier */
export interface SupplierM5State {
    contractReadiness: SupplierContractReadiness | null;
    erpActivation: SupplierERPActivation | null;
    contracts: SupplierContractMap[];
}
