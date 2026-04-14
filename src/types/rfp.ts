export type RFPStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'AWARDED' | 'ARCHIVED';
export type SupplierInviteStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'SUBMITTED' | 'AWARDED';
export type ResponseStatus = 'DRAFT' | 'SUBMITTED';
export type NegotiationRoundStatus = 'OPEN' | 'CLOSED';
export type InsightType = 'PRICE_GAP' | 'LEAD_TIME' | 'MOQ' | 'RISK';
export type InsightSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RFP {
    rfpId: string;
    name: string;
    category?: string;
    currency: string;
    deadline: string;
    description?: string;
    status: RFPStatus;
    buyerId?: number;
    sourceRfiId?: string;
    createdBy?: number;
    createdAt: string;
    updatedAt: string;
    supplierCount: number;
    submittedCount: number;
    items?: RFPItem[];
    suppliers?: RFPSupplier[];
    // Section 1 enhancements
    buRegion?: string;
    incoterms?: string;
    contactPerson?: string;
    instructions?: string;
    requireComplianceAck?: boolean;
    // Section 2/6 — buyer certification gates
    requireIso?: boolean;
    requireGmp?: boolean;
    requireFsc?: boolean;
    minRevenueM?: number;
    // Configurable scoring weights (must sum to 100)
    weightCommercial?: number;
    weightTechnical?: number;
    weightQuality?: number;
    weightLogistics?: number;
    weightEsg?: number;
}

export interface RFPItem {
    itemId: string;
    rfpId: string;
    name: string;
    description?: string;
    quantity: number;
    unit?: string;
    specifications?: string;
    targetPrice?: number;
    targetPriceNote?: string;
    createdAt?: string;
}

export interface RFPSupplier {
    id: string;
    rfpId: string;
    supplierId?: number;
    supplierName?: string;
    email?: string;
    status: SupplierInviteStatus;
    createdAt?: string;
}

export interface SupplierResponse {
    responseId: string;
    rfpId: string;
    supplierId: number;
    status: ResponseStatus;
    notes?: string;
    submittedAt?: string;
    items: ResponseItem[];
}

export interface ResponseItem {
    id: string;
    itemId: string;
    price?: number;
    leadTime?: number;
    moq?: number;
    notes?: string;
    // Section 4: cost breakdown
    rawMaterialCost?: number;
    conversionCost?: number;
    laborCost?: number;
    logisticsCost?: number;
    overheadCost?: number;
    supplierMargin?: number;
}

export interface ComparisonRow {
    itemId: string;
    itemName: string;
    quantity: number;
    unit?: string;
    lowestPrice?: number;
    suppliers: ComparisonSupplierData[];
}

export interface ComparisonSupplierData {
    supplierId: number;
    supplierName: string;
    price?: number;
    leadTime?: number;
    moq?: number;
    notes?: string;
    totalCost?: number;
    isLowest: boolean;
}

export interface RFPInsight {
    insightId: string;
    type: InsightType;
    message: string;
    severity: InsightSeverity;
    supplierId?: number;
    supplierName?: string;
}

export interface NegotiationRound {
    roundId: string;
    rfpId: string;
    roundNumber: number;
    status: NegotiationRoundStatus;
    changeCount: number;
    createdAt: string;
}

export interface NegotiationChange {
    id: string;
    supplierId: number;
    supplierName?: string;
    itemId: string;
    itemName?: string;
    prevPrice?: number;
    newPrice: number;
    deltaPct?: number;
}

export interface RFPAward {
    awardId: string;
    rfpId: string;
    supplierId: number;
    supplierName?: string;
    allocationPct?: number;
    awardedValue?: number;
    notes?: string;
    createdAt: string;
}
