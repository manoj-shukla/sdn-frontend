import apiClient from "./client";

// Postgres returns lowercase column names.
export interface Order {
    orderid: number; supplierid: number; buyerid: number; ordernumber: string;
    orderdate: string; totalamount: number; currency: string; status: string;
    expecteddeliverydate?: string;
}
export interface Invoice {
    invoiceid: number; supplierid: number; buyerid: number; orderid?: number;
    invoicenumber: string; invoicedate: string; amount: number; status: string;
    duedate?: string; order_number?: string;
}
export interface Payment {
    paymentid: number; supplierid: number; buyerid: number; invoiceid?: number;
    paymentnumber: string; amount: number; currency: string; method: string;
    status: string; reference?: string; paymentdate: string; invoice_number?: string;
}

export const listOrders = () => apiClient.get("/api/procurement/orders") as Promise<Order[]>;
export const listInvoices = () => apiClient.get("/api/procurement/invoices") as Promise<Invoice[]>;
export const listPayments = () => apiClient.get("/api/procurement/payments") as Promise<Payment[]>;

export const createInvoice = (body: { orderId?: number; buyerId?: number; amount: number; dueDate?: string }) =>
    apiClient.post("/api/procurement/invoices", body) as Promise<Invoice>;
