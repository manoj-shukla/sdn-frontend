import apiClient from "./client";

export interface SourcingEvent {
    id: string; kind: "AUCTION" | "RFP"; name: string; status: string; currency: string;
    participants: number; bids: number; baseline: number | null; best: number | null;
    savings: number | null; savingsPct: number | null;
}
export interface BidAnalysis {
    kpis: { totalEvents: number; auctions: number; rfps: number; totalBids: number; totalSavings: number; liveEvents: number };
    events: SourcingEvent[];
}
export interface Award {
    id: string; kind: "AUCTION" | "RFP"; event_name: string; supplier_id: number | null;
    supplier_name?: string; value: number | null; allocation_pct: number | null;
    currency: string; created_at: string; source_id: string;
}
export interface Contract {
    contractid: number; buyerid: number; supplierid?: number; title: string;
    sourcetype: string; sourceid?: string; value?: number; currency: string;
    status: string; startdate?: string; enddate?: string; notes?: string; createdat: string;
    supplier_name?: string;
}

export const getBidAnalysis = () => apiClient.get("/api/sourcing/bid-analysis") as Promise<BidAnalysis>;
export const getAwards = () => apiClient.get("/api/sourcing/awards") as Promise<Award[]>;

export const listContracts = () => apiClient.get("/api/contracts") as Promise<Contract[]>;
export const createContract = (body: any) => apiClient.post("/api/contracts", body) as Promise<Contract>;
export const updateContractStatus = (id: number, status: string) => apiClient.patch(`/api/contracts/${id}/status`, { status });
export const deleteContract = (id: number) => apiClient.delete(`/api/contracts/${id}`);
