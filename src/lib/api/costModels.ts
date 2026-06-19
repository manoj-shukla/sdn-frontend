import apiClient from "./client";

export interface CostVariable {
    variable_id: string; var_key: string; label: string; unit?: string;
    var_group?: string; data_type?: string; default_value?: number;
}
export interface CostFormula { formula_id: string; output_key: string; label?: string; expression: string; }
export interface CostComponent { component_id: string; name: string; source_key: string; }
export interface CostModel {
    model_id: string; name: string; category?: string; use_case?: string; currency: string;
    description?: string; is_template?: boolean; template_key?: string; status: string;
    variable_count?: number; formula_count?: number;
    variables?: CostVariable[]; formulas?: CostFormula[]; components?: CostComponent[];
}
export interface CalcResult {
    modelId: string; currency: string;
    inputs: Record<string, number>; derived: Record<string, number>; components: Record<string, number>;
    total: number; supplierQuote?: number | null; gap?: number | null; gapPct?: number | null;
    insights: { severity: string; message: string }[];
}

export const listCostModels = (params?: any) => apiClient.get("/api/cost-models", { params }) as Promise<CostModel[]>;
export const getCostModel = (id: string) => apiClient.get(`/api/cost-models/${id}`) as Promise<CostModel>;
export const createCostModel = (body: any) => apiClient.post("/api/cost-models", body) as Promise<CostModel>;
export const cloneCostModel = (id: string) => apiClient.post(`/api/cost-models/${id}/clone`, {}) as Promise<CostModel>;
export const deleteCostModel = (id: string) => apiClient.delete(`/api/cost-models/${id}`);
export const calculateCost = (id: string, inputs: Record<string, any>, opts?: { supplierQuote?: number; rfpId?: string; supplierId?: number }) =>
    apiClient.post(`/api/cost-models/${id}/calculate`, { inputs, ...opts }) as Promise<CalcResult>;
