import apiClient from "./client";

// ── Types ────────────────────────────────────────────────────────────────
export type AuctionEventType = "REVERSE" | "ENGLISH" | "SEALED" | "VICKREY" | "DUTCH" | "DOUBLE";
export type AuctionStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "SOFT_CLOSE" | "PAUSED" | "ENDED" | "AWARDED" | "CANCELLED";

export interface AuctionLot {
    lot_id: string;
    auction_id: string;
    lot_number: number;
    title: string;
    description?: string;
    quantity: number;
    uom?: string;
    incoterms?: string;
    start_price?: number;
    reserve_price?: number;
    current_price?: number;
    current_leader_supplier_id?: number;
    min_decrement?: number;
    decrement_type?: "ABSOLUTE" | "PERCENTAGE";
    bid_buffer_amount?: number;
    bid_buffer_seconds?: number;
    max_seal_pct?: number;
    soft_close_window_sec?: number;
    extension_sec?: number;
    max_extensions?: number;
    extension_type?: "ADD" | "RESET";
    extensions_used?: number;
    visibility_mode?: "FULL" | "RANK_ONLY";
    start_strategy?: "IMMEDIATE" | "SEQUENTIAL";
    initial_duration_sec?: number;
    scheduled_start?: string;
    scheduled_end?: string;
    status: "PENDING" | "LIVE" | "SOFT_CLOSE" | "ENDED" | "CANCELLED";
}

export interface AuctionEvent {
    auction_id: string;
    name: string;
    reference_code?: string;
    event_type: AuctionEventType;
    status: AuctionStatus;
    description?: string;
    base_currency: string;
    global_baseline?: number;
    masking_rule: "MASKED" | "OPEN";
    default_visibility: "FULL" | "RANK_ONLY";
    emd_required?: boolean;
    emd_value_type?: "FIXED" | "PERCENT";
    emd_value?: number;
    emd_verification_mode?: "AUTO" | "MANUAL";
    stagger_interval_sec?: number;
    scheduled_start?: string;
    scheduled_end?: string;
    lot_count?: number;
    supplier_count?: number;
    lots?: AuctionLot[];
    suppliers?: any[];
    bundles?: any[];
}

export interface LeaderRow {
    rank: number;
    supplierId: number | null;
    label?: string;
    isYou?: boolean;
    bidAmount: number | null;
    gapToLead?: number | null;
    timestamp: string;
}

export interface Kpis {
    baseline: number;
    currentTotal: number;
    savings: number;
    savingsPct: number;
    tensionIndex: number;
}

export interface BidResult {
    accepted: boolean;
    status: string;
    reason?: string | null;
    currentLead?: number;
    nextAllowedBid?: number | null;
    secondsRemaining?: number | null;
    extended?: boolean;
    myRank?: number | null;
    leaderboard?: LeaderRow[];
    kpis?: Kpis;
}

// ── Buyer ────────────────────────────────────────────────────────────────
export const listAuctions = (params?: any) => apiClient.get("/api/auctions", { params }) as Promise<AuctionEvent[]>;
export const getAuction = (id: string) => apiClient.get(`/api/auctions/${id}`) as Promise<AuctionEvent>;
export const createAuction = (body: any) => apiClient.post("/api/auctions", body) as Promise<AuctionEvent>;
export const updateAuction = (id: string, body: any) => apiClient.put(`/api/auctions/${id}`, body) as Promise<AuctionEvent>;
export const deleteAuction = (id: string) => apiClient.delete(`/api/auctions/${id}`) as Promise<any>;

export const addLot = (id: string, body: any) => apiClient.post(`/api/auctions/${id}/lots`, body) as Promise<AuctionEvent>;
export const updateLot = (id: string, lotId: string, body: any) => apiClient.put(`/api/auctions/${id}/lots/${lotId}`, body);
export const deleteLot = (id: string, lotId: string) => apiClient.delete(`/api/auctions/${id}/lots/${lotId}`);

export const addSuppliers = (id: string, suppliers: any[]) => apiClient.post(`/api/auctions/${id}/suppliers`, { suppliers }) as Promise<AuctionEvent>;
export const listAuctionSuppliers = (id: string) => apiClient.get(`/api/auctions/${id}/suppliers`) as Promise<any[]>;

export const scheduleAuction = (id: string) => apiClient.post(`/api/auctions/${id}/schedule`, {});
export const launchAuction = (id: string) => apiClient.post(`/api/auctions/${id}/launch`, {});
export const pauseAuction = (id: string) => apiClient.post(`/api/auctions/${id}/pause`, {});
export const endAuction = (id: string) => apiClient.post(`/api/auctions/${id}/end`, {});
export const endLot = (id: string, lotId: string) => apiClient.post(`/api/auctions/${id}/lots/${lotId}/end`, {});
export const awardLot = (id: string, lotId: string, supplierId?: number) =>
    apiClient.post(`/api/auctions/${id}/lots/${lotId}/award`, { supplierId });
export const surrogateBid = (id: string, lotId: string, supplierId: number, amount: number) =>
    apiClient.post(`/api/auctions/${id}/lots/${lotId}/surrogate-bid`, { supplierId, amount });

export const getKpis = (id: string) => apiClient.get(`/api/auctions/${id}/kpis`) as Promise<Kpis>;
export const getAudit = (id: string) => apiClient.get(`/api/auctions/${id}/audit`) as Promise<any[]>;
export const getLeaderboard = (id: string, lotId: string) =>
    apiClient.get(`/api/auctions/${id}/lots/${lotId}/leaderboard`) as Promise<LeaderRow[]>;

export const bundleAnalysis = (id: string, bundleId: string) =>
    apiClient.get(`/api/auctions/${id}/bundles/${bundleId}/award-analysis`) as Promise<any>;
export const doubleClearing = (id: string, lotId: string) =>
    apiClient.get(`/api/auctions/${id}/lots/${lotId}/clearing`) as Promise<any>;

export const approveEmd = (id: string, supplierId: number) =>
    apiClient.post(`/api/auctions/${id}/suppliers/${supplierId}/emd/approve`, {});
export const exemptEmd = (id: string, supplierId: number) =>
    apiClient.post(`/api/auctions/${id}/suppliers/${supplierId}/emd/exempt`, {});

// ── Supplier ─────────────────────────────────────────────────────────────
export const mySupplierAuctions = () => apiClient.get("/api/auctions/my") as Promise<any[]>;
export const myBids = () => apiClient.get("/api/auctions/my/bids") as Promise<any[]>;
export const myActiveBids = () => apiClient.get("/api/auctions/my/active") as Promise<any[]>;
export const joinAuction = (id: string) => apiClient.post(`/api/auctions/${id}/join`, {});
export const getBidConsole = (id: string, lotId: string) =>
    apiClient.get(`/api/auctions/${id}/lots/${lotId}/console`) as Promise<any>;
export const placeBid = (id: string, lotId: string, amount: number, latencyMs?: number) =>
    apiClient.post(`/api/auctions/${id}/lots/${lotId}/bid`, { amount, latencyMs }) as Promise<BidResult>;
export const verifyEmd = (id: string, body: any) => apiClient.post(`/api/auctions/${id}/emd/verify`, body);
export const getWallet = () => apiClient.get("/api/auctions/wallet/me") as Promise<any>;
export const depositWallet = (amount: number) => apiClient.post("/api/auctions/wallet/deposit", { amount });
