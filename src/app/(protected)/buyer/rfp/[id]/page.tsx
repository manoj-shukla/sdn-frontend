"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft, Loader2, Users, Package, BarChart2, Trophy,
    Plus, Trash2, Send, Lock, Edit2, Check, X, Search, XCircle
} from "lucide-react";
import { toast } from "sonner";
import type { RFP, RFPItem, RFPSupplier } from "@/types/rfp";
import { cn } from "@/lib/utils";
import { InviteSupplierDialog, type InviteEntry } from "@/components/buyer/invite-supplier-dialog";

const STATUS_STYLES: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    OPEN: "bg-green-100 text-green-700 border-green-200",
    CLOSED: "bg-amber-100 text-amber-700 border-amber-200",
    AWARDED: "bg-violet-100 text-violet-700 border-violet-200",
    ARCHIVED: "bg-gray-100 text-gray-500 border-gray-200",
};

const UNIT_OPTIONS = ["pcs", "kg", "mt", "L", "m", "m²", "m³", "hr", "day", "lot", "set", "box", "pallet"];

interface SupplierOption {
    supplierId: number;
    legalName: string;
    email?: string;
    country?: string;
}

export default function BuyerRFPDetailPage() {
    const params = useParams();
    const router = useRouter();
    const rfpId = params.id as string;

    const [rfp, setRfp] = useState<RFP | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Item editing
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editItemData, setEditItemData] = useState<Partial<RFPItem>>({});
    const [showAddItem, setShowAddItem] = useState(false);
    const [newItem, setNewItem] = useState({ name: "", description: "", quantity: "", unit: "pcs", specifications: "" });

    // Supplier inviting
    const [showInvitePanel, setShowInvitePanel] = useState(false);
    const [allSuppliers, setAllSuppliers] = useState<SupplierOption[]>([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [emailInvites, setEmailInvites] = useState<InviteEntry[]>([]);
    const [emailInvDialogOpen, setEmailInvDialogOpen] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);

    // silent=true skips the full-page loading spinner (used after sub-actions like invite/add item)
    const fetchRFP = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await apiClient.get(`/api/rfp/${rfpId}`) as any;
            setRfp(res);
        } catch {
            toast.error("Failed to load RFP");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRFP(); }, [rfpId]);

    const handlePublish = async () => {
        if (!rfp) return;
        if (!rfp.items || rfp.items.length === 0) {
            toast.error("Add at least one line item before publishing.");
            return;
        }
        setActionLoading(true);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/publish`);
            toast.success("RFP published! Suppliers have been notified.");
            await fetchRFP(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to publish RFP");
        } finally {
            setActionLoading(false);
        }
    };

    const handleClose = async () => {
        if (!confirm("Close this RFP? No more responses will be accepted.")) return;
        setActionLoading(true);
        try {
            await apiClient.post(`/api/rfp/${rfpId}/close`);
            toast.success("RFP closed.");
            await fetchRFP(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to close RFP");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!newItem.name.trim() || !newItem.quantity || parseFloat(newItem.quantity) <= 0) {
            toast.error("Item name and quantity > 0 are required.");
            return;
        }
        try {
            await apiClient.post(`/api/rfp/${rfpId}/items`, {
                name: newItem.name,
                description: newItem.description || undefined,
                quantity: parseFloat(newItem.quantity),
                unit: newItem.unit || undefined,
                specifications: newItem.specifications || undefined,
            });
            toast.success("Item added.");
            setNewItem({ name: "", description: "", quantity: "", unit: "pcs", specifications: "" });
            setShowAddItem(false);
            await fetchRFP(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to add item");
        }
    };

    const handleUpdateItem = async (itemId: string) => {
        try {
            await apiClient.put(`/api/rfp/${rfpId}/items/${itemId}`, editItemData);
            toast.success("Item updated.");
            setEditingItem(null);
            await fetchRFP(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to update item");
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Remove this line item?")) return;
        try {
            await apiClient.delete(`/api/rfp/${rfpId}/items/${itemId}`);
            toast.success("Item removed.");
            await fetchRFP(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to remove item");
        }
    };

    const loadAllSuppliers = async () => {
        setSuppliersLoading(true);
        try {
            const res = await apiClient.get("/api/suppliers") as any;
            const raw = res.content || (Array.isArray(res) ? res : []);
            setAllSuppliers(raw.map((s: any) => ({
                supplierId: Number(s.supplierId || s.supplierid),
                legalName: s.legalName || s.legalname,
                email: s.email,
                country: s.country,
            })));
        } catch { toast.error("Failed to load suppliers"); }
        finally { setSuppliersLoading(false); }
    };

    const handleInvite = async () => {
        const supplierIds = [...selectedIds];
        const emailInviteObjs = emailInvites.map(inv => ({ email: inv.email, legalName: inv.legalName }));
        if (supplierIds.length === 0 && emailInviteObjs.length === 0) {
            toast.error("Select at least one supplier or add an email invite.");
            return;
        }
        setInviteLoading(true);
        try {
            const res = await apiClient.post(`/api/rfp/${rfpId}/suppliers`, {
                supplierIds, emailInvites: emailInviteObjs,
            }) as any;

            // Surface any partial errors
            if (res?.errors?.length > 0) {
                res.errors.forEach((e: any) => {
                    toast.error(`Could not invite ${e.supplierId || e.email}: ${e.error}`);
                });
            }

            const addedCount = (res?.added || []).filter((a: any) => !a.alreadyInvited).length;
            const alreadyCount = (res?.added || []).filter((a: any) => a.alreadyInvited).length;

            if (addedCount > 0) toast.success(`${addedCount} supplier(s) invited successfully.`);
            if (alreadyCount > 0) toast.info(`${alreadyCount} supplier(s) were already invited.`);

            setShowInvitePanel(false);
            setSelectedIds(new Set());
            setEmailInvites([]);
            await fetchRFP(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to invite suppliers");
        } finally {
            setInviteLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );

    if (!rfp) return (
        <div className="text-center py-16 text-muted-foreground">
            <p>RFP not found.</p>
            <Button variant="link" onClick={() => router.push("/buyer/rfp")}>Back to RFPs</Button>
        </div>
    );

    const isDraft = rfp.status === "DRAFT";
    const isOpen = rfp.status === "OPEN";
    const daysLeft = rfp.deadline ? Math.ceil((new Date(rfp.deadline).getTime() - Date.now()) / 86400000) : null;

    const filteredSuppliers = allSuppliers.filter(s => {
        const alreadyInvited = rfp.suppliers?.some(x => Number(x.supplierId) === Number(s.supplierId));
        const matchSearch = !supplierSearch || s.legalName.toLowerCase().includes(supplierSearch.toLowerCase());
        return !alreadyInvited && matchSearch;
    });

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/rfp")} className="mt-0.5">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">{rfp.name}</h1>
                            <Badge variant="outline" className={cn("text-[11px]", STATUS_STYLES[rfp.status])}>{rfp.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                            {rfp.category && <span>{rfp.category}</span>}
                            <span>•</span>
                            <span>{rfp.currency}</span>
                            {rfp.deadline && (
                                <>
                                    <span>•</span>
                                    <span className={daysLeft !== null && daysLeft < 7 && daysLeft > 0 ? "text-amber-600" : ""}>
                                        Deadline: {new Date(rfp.deadline).toLocaleDateString()}
                                        {daysLeft !== null && daysLeft > 0 && ` (${daysLeft}d left)`}
                                        {daysLeft !== null && daysLeft <= 0 && " (Expired)"}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isDraft && (
                        <Button onClick={handlePublish} disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Publish
                        </Button>
                    )}
                    {isOpen && (
                        <>
                            <Button variant="outline" onClick={handleClose} disabled={actionLoading} className="gap-1.5">
                                <Lock className="h-4 w-4" /> Close RFP
                            </Button>
                            {rfp.submittedCount > 0 && (
                                <Button onClick={() => router.push(`/buyer/rfp/${rfpId}/comparison`)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                                    <BarChart2 className="h-4 w-4" /> Compare Responses
                                </Button>
                            )}
                        </>
                    )}
                    {rfp.status === "CLOSED" && rfp.submittedCount > 0 && (
                        <Button onClick={() => router.push(`/buyer/rfp/${rfpId}/comparison`)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                            <BarChart2 className="h-4 w-4" /> Compare & Award
                        </Button>
                    )}
                </div>
            </div>

            {rfp.description && (
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3">{rfp.description}</p>
            )}

            {/* Line Items */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4 text-indigo-600" />
                        Line Items ({rfp.items?.length ?? 0})
                    </CardTitle>
                    {isDraft && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddItem(true)}>
                            <Plus className="h-3.5 w-3.5" /> Add Item
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {rfp.items && rfp.items.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="border-b bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">#</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Item Name</th>
                                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Unit</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
                                    {isDraft && <th className="px-4 py-2" />}
                                </tr>
                            </thead>
                            <tbody>
                                {rfp.items.map((item, idx) => (
                                    <tr key={item.itemId} className="border-b last:border-b-0 hover:bg-slate-50">
                                        {editingItem === item.itemId ? (
                                            <>
                                                <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        value={editItemData.name || ""}
                                                        onChange={e => setEditItemData(p => ({ ...p, name: e.target.value }))}
                                                        className="h-7 text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="number"
                                                        value={editItemData.quantity || ""}
                                                        onChange={e => setEditItemData(p => ({ ...p, quantity: parseFloat(e.target.value) }))}
                                                        className="h-7 text-sm w-20 text-right"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={editItemData.unit || ""}
                                                        onChange={e => setEditItemData(p => ({ ...p, unit: e.target.value }))}
                                                        className="border rounded px-2 py-1 text-sm"
                                                    >
                                                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        value={editItemData.description || ""}
                                                        onChange={e => setEditItemData(p => ({ ...p, description: e.target.value }))}
                                                        className="h-7 text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleUpdateItem(item.itemId)} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                                                        <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                                                <td className="px-4 py-2 font-medium">{item.name}</td>
                                                <td className="px-4 py-2 text-right">{item.quantity}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{item.unit || "—"}</td>
                                                <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{item.description || "—"}</td>
                                                {isDraft && (
                                                    <td className="px-4 py-2">
                                                        <div className="flex gap-1 justify-end">
                                                            <button
                                                                onClick={() => { setEditingItem(item.itemId); setEditItemData({ name: item.name, description: item.description, quantity: item.quantity, unit: item.unit }); }}
                                                                className="text-slate-400 hover:text-indigo-600"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => handleDeleteItem(item.itemId)} className="text-slate-400 hover:text-rose-500">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No line items yet.</p>
                            {isDraft && <Button variant="link" onClick={() => setShowAddItem(true)}>Add your first item</Button>}
                        </div>
                    )}

                    {/* Add Item Form */}
                    {showAddItem && (
                        <div className="border-t p-4 bg-indigo-50 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-indigo-700">New Line Item</p>
                                <button onClick={() => setShowAddItem(false)} className="text-slate-400"><X className="h-4 w-4" /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <Label className="text-xs">Item Name *</Label>
                                    <Input placeholder="e.g. Raw Material A" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} className="h-8" />
                                </div>
                                <div>
                                    <Label className="text-xs">Quantity *</Label>
                                    <Input type="number" placeholder="1000" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))} className="h-8" min="0.001" step="any" />
                                </div>
                                <div>
                                    <Label className="text-xs">Unit</Label>
                                    <select value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm h-8 bg-white">
                                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Description</Label>
                                    <Input placeholder="Optional" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} className="h-8" />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => setShowAddItem(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleAddItem}>Add Item</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Suppliers */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-600" />
                        Invited Suppliers ({rfp.suppliers?.length ?? 0})
                    </CardTitle>
                    {(isDraft || isOpen) && (
                        <Button
                            variant="outline" size="sm" className="gap-1.5"
                            onClick={() => {
                                setShowInvitePanel(p => !p);
                                if (!showInvitePanel) loadAllSuppliers();
                            }}
                        >
                            <Plus className="h-3.5 w-3.5" /> Invite Suppliers
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {rfp.suppliers && rfp.suppliers.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="border-b bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Supplier</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Email</th>
                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rfp.suppliers.map(s => {
                                    const statusColor = {
                                        INVITED: "bg-blue-50 text-blue-700",
                                        ACCEPTED: "bg-indigo-50 text-indigo-700",
                                        DECLINED: "bg-rose-50 text-rose-700",
                                        SUBMITTED: "bg-green-50 text-green-700",
                                        AWARDED: "bg-violet-50 text-violet-700",
                                    }[s.status] || "bg-slate-100 text-slate-600";
                                    return (
                                        <tr key={s.id} className="border-b last:border-b-0 hover:bg-slate-50">
                                            <td className="px-4 py-2.5 font-medium">{s.supplierName || "—"}</td>
                                            <td className="px-4 py-2.5 text-muted-foreground">{s.email || "—"}</td>
                                            <td className="px-4 py-2.5">
                                                <Badge variant="secondary" className={`text-[11px] ${statusColor}`}>{s.status}</Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No suppliers invited yet.</p>
                        </div>
                    )}

                    {/* Invite Panel */}
                    {showInvitePanel && (
                        <div className="border-t p-4 bg-blue-50 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-blue-700">Invite Suppliers</p>
                                <button onClick={() => setShowInvitePanel(false)} className="text-slate-400"><X className="h-4 w-4" /></button>
                            </div>

                            {/* Email invites section */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium">Invite by Email</Label>
                                    <Button
                                        size="sm" variant="ghost"
                                        className="h-7 text-xs gap-1 text-primary"
                                        onClick={() => setEmailInvDialogOpen(true)}
                                    >
                                        <Plus className="h-3 w-3" /> Add Guest
                                    </Button>
                                </div>
                                {emailInvites.length > 0 ? (
                                    <div className="border rounded-md divide-y text-sm bg-white">
                                        {emailInvites.map((inv, idx) => (
                                            <div key={idx} className="px-3 py-2 flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium text-sm">{inv.legalName}</div>
                                                    <div className="text-xs text-muted-foreground">{inv.email}</div>
                                                </div>
                                                <Button
                                                    size="icon" variant="ghost"
                                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                    onClick={() => setEmailInvites(prev => prev.filter((_, i) => i !== idx))}
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        No email invitations added. Click &quot;Add Guest&quot; to invite external suppliers.
                                    </p>
                                )}
                            </div>

                            {/* Directory search section */}
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">From Directory</Label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input placeholder="Search suppliers…" value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} className="pl-7 h-8 text-sm" />
                                </div>
                                {suppliersLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                ) : (
                                    <div className="border rounded max-h-40 overflow-y-auto bg-white">
                                        {filteredSuppliers.length === 0 ? (
                                            <div className="text-xs text-center py-4 text-muted-foreground">All directory suppliers are already invited.</div>
                                        ) : filteredSuppliers.map(s => (
                                            <label key={s.supplierId} className={cn("flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm border-b last:border-0", selectedIds.has(s.supplierId) ? "bg-indigo-50" : "")}>
                                                <input type="checkbox" checked={selectedIds.has(s.supplierId)} onChange={() => {
                                                    setSelectedIds(prev => {
                                                        const next = new Set(prev);
                                                        next.has(s.supplierId) ? next.delete(s.supplierId) : next.add(s.supplierId);
                                                        return next;
                                                    });
                                                }} className="h-3.5 w-3.5" />
                                                <span className="flex-1 truncate font-medium">{s.legalName}</span>
                                                {s.email && <span className="text-xs text-muted-foreground truncate">{s.email}</span>}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => setShowInvitePanel(false)} disabled={inviteLoading}>Cancel</Button>
                                <Button size="sm" onClick={handleInvite} disabled={inviteLoading || (selectedIds.size === 0 && emailInvites.length === 0)}>
                                    {inviteLoading
                                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Inviting…</>
                                        : `Send Invitations (${selectedIds.size + emailInvites.length})`}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Award Section (if awarded) */}
            {rfp.status === "AWARDED" && (
                <Card className="border-violet-200 bg-violet-50">
                    <CardContent className="flex items-center gap-3 py-4 px-5">
                        <Trophy className="h-6 w-6 text-violet-600 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-violet-700">RFP Awarded</p>
                            <p className="text-sm text-violet-600">This sourcing event has been completed and awarded.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/buyer/rfp/${rfpId}/comparison`)} className="ml-auto border-violet-300 text-violet-700 hover:bg-violet-100">
                            View Details
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Invite by Email Dialog */}
            <InviteSupplierDialog
                isOpen={emailInvDialogOpen}
                onClose={() => setEmailInvDialogOpen(false)}
                onAdd={(invite) => {
                    setEmailInvites(prev => [...prev, invite]);
                    setEmailInvDialogOpen(false);
                }}
            />
        </div>
    );
}
