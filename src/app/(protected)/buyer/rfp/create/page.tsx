"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    ChevronRight, ChevronLeft, Check, Loader2, Plus, Trash2,
    FileText, Package, Users, Eye, Search, X, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InviteSupplierDialog, type InviteEntry } from "@/components/buyer/invite-supplier-dialog";

interface LineItem {
    id: string;
    name: string;
    description: string;
    quantity: string;
    unit: string;
    specifications: string;
}

interface SupplierOption {
    supplierId: number;
    legalName: string;
    email?: string;
    country?: string;
}

const STEPS = ["Basic Info", "Line Items", "Invite Suppliers", "Review & Publish"];
const STEP_ICONS = [FileText, Package, Users, Eye];

const UNIT_OPTIONS = ["pcs", "kg", "mt", "L", "m", "m²", "m³", "hr", "day", "lot", "set", "box", "pallet"];
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED", "INR", "SGD", "AUD"];
const CATEGORY_OPTIONS = [
    "Raw Materials", "Packaging", "IT Services", "Manufacturing", "Logistics",
    "Professional Services", "Facilities", "Marketing", "HR Services", "Other"
];

function newItem(): LineItem {
    return { id: crypto.randomUUID(), name: "", description: "", quantity: "", unit: "pcs", specifications: "" };
}

export default function BuyerRFPCreatePage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Step 1 — basic info
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [deadline, setDeadline] = useState("");
    const [description, setDescription] = useState("");
    const [basicErrors, setBasicErrors] = useState<Record<string, string>>({});

    // Step 2 — line items
    const [items, setItems] = useState<LineItem[]>([newItem()]);

    // Step 3 — suppliers
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<number>>(new Set());
    const [emailInvites, setEmailInvites] = useState<InviteEntry[]>([]);
    const [emailInvDialogOpen, setEmailInvDialogOpen] = useState(false);

    useEffect(() => {
        if (step === 2) {
            setSuppliersLoading(true);
            apiClient.get("/api/suppliers").then((res: any) => {
                const raw = res.content || (Array.isArray(res) ? res : []);
                setSuppliers(raw.map((s: any) => ({
                    supplierId: s.supplierId || s.supplierid,
                    legalName: s.legalName || s.legalname,
                    email: s.email,
                    country: s.country,
                })));
            }).catch(() => toast.error("Failed to load suppliers"))
                .finally(() => setSuppliersLoading(false));
        }
    }, [step]);

    const validateBasic = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = "RFP name is required.";
        if (!currency) errs.currency = "Currency is required.";
        if (!deadline) errs.deadline = "Deadline is required.";
        else if (new Date(deadline) <= new Date()) errs.deadline = "Deadline must be a future date.";
        setBasicErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateItems = () => {
        const valid = items.every(item => item.name.trim() && parseFloat(item.quantity) > 0);
        if (!valid) {
            toast.error("Each line item must have a name and quantity > 0.");
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 0 && !validateBasic()) return;
        if (step === 1 && !validateItems()) return;
        setStep(s => s + 1);
    };


    const handlePublish = async (publish: boolean) => {
        setSubmitting(true);
        try {
            // 1. Create RFP
            const rfpRes = await apiClient.post("/api/rfp", {
                name, category: category || undefined, currency, deadline,
                description: description || undefined,
            }) as any;
            const rfpId = rfpRes.rfpId;

            // 2. Add line items
            for (const item of items.filter(i => i.name.trim())) {
                await apiClient.post(`/api/rfp/${rfpId}/items`, {
                    name: item.name,
                    description: item.description || undefined,
                    quantity: parseFloat(item.quantity),
                    unit: item.unit || undefined,
                    specifications: item.specifications || undefined,
                });
            }

            // 3. Add suppliers
            const supplierIds = [...selectedSupplierIds];
            const emailInviteObjs = emailInvites.map(inv => ({ email: inv.email, legalName: inv.legalName }));
            if (supplierIds.length > 0 || emailInviteObjs.length > 0) {
                await apiClient.post(`/api/rfp/${rfpId}/suppliers`, {
                    supplierIds, emailInvites: emailInviteObjs,
                });
            }

            // 4. Publish if requested
            if (publish) {
                await apiClient.post(`/api/rfp/${rfpId}/publish`);
                toast.success("RFP published successfully!");
            } else {
                toast.success("RFP saved as draft.");
            }

            router.push(`/buyer/rfp/${rfpId}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to create RFP. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const updateItem = (id: string, field: keyof LineItem, value: string) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeItem = (id: string) => {
        if (items.length === 1) { toast.error("At least one line item is required."); return; }
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const filteredSuppliers = suppliers.filter(s =>
        !supplierSearch ||
        s.legalName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const toggleSupplier = (id: number) => {
        setSelectedSupplierIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const totalSelected = selectedSupplierIds.size + emailInvites.length;

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Create New RFP</h1>
                    <p className="text-sm text-muted-foreground">Set up a competitive sourcing event</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-0">
                {STEPS.map((s, i) => {
                    const Icon = STEP_ICONS[i];
                    const isActive = i === step;
                    const isDone = i < step;
                    return (
                        <div key={s} className="flex items-center flex-1">
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors flex-shrink-0",
                                isActive ? "bg-indigo-50 text-indigo-700" : isDone ? "text-green-600" : "text-muted-foreground"
                            )}>
                                <div className={cn(
                                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                                    isActive ? "bg-indigo-600 text-white" : isDone ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                                )}>
                                    {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                                </div>
                                <span className={cn("text-sm font-medium hidden sm:block", isActive ? "text-indigo-700" : isDone ? "text-green-600" : "text-slate-400")}>
                                    {s}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={cn("h-0.5 flex-1 mx-1", i < step ? "bg-green-400" : "bg-slate-200")} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base">{STEPS[step]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">

                    {/* ── STEP 0: Basic Info ── */}
                    {step === 0 && (
                        <div className="space-y-4">
                            <div>
                                <Label>RFP Name <span className="text-rose-500">*</span></Label>
                                <Input
                                    placeholder="e.g. Q2 Packaging Sourcing 2025"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className={basicErrors.name ? "border-rose-400" : ""}
                                />
                                {basicErrors.name && <p className="text-xs text-rose-500 mt-1">{basicErrors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Category</Label>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select category…</option>
                                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>Currency <span className="text-rose-500">*</span></Label>
                                    <select
                                        value={currency}
                                        onChange={e => setCurrency(e.target.value)}
                                        className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${basicErrors.currency ? "border-rose-400" : ""}`}
                                    >
                                        {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    {basicErrors.currency && <p className="text-xs text-rose-500 mt-1">{basicErrors.currency}</p>}
                                </div>
                            </div>
                            <div>
                                <Label>Submission Deadline <span className="text-rose-500">*</span></Label>
                                <Input
                                    type="datetime-local"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    className={basicErrors.deadline ? "border-rose-400" : ""}
                                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                                />
                                {basicErrors.deadline && <p className="text-xs text-rose-500 mt-1">{basicErrors.deadline}</p>}
                            </div>
                            <div>
                                <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Textarea
                                    placeholder="Briefly describe what you are sourcing and any special requirements…"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── STEP 1: Line Items ── */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Define what you are sourcing. Each item will be quoted individually by suppliers.
                            </p>
                            {items.map((item, idx) => (
                                <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-600">Item {idx + 1}</span>
                                        <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div>
                                        <Label>Item Name <span className="text-rose-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. Corrugated Box 400x300x250mm"
                                            value={item.name}
                                            onChange={e => updateItem(item.id, "name", e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Quantity <span className="text-rose-500">*</span></Label>
                                            <Input
                                                type="number"
                                                placeholder="e.g. 5000"
                                                value={item.quantity}
                                                onChange={e => updateItem(item.id, "quantity", e.target.value)}
                                                min="0.001"
                                                step="any"
                                            />
                                        </div>
                                        <div>
                                            <Label>Unit</Label>
                                            <select
                                                value={item.unit}
                                                onChange={e => updateItem(item.id, "unit", e.target.value)}
                                                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                        <Input
                                            placeholder="Brief description"
                                            value={item.description}
                                            onChange={e => updateItem(item.id, "description", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Specifications <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                        <Textarea
                                            placeholder="Technical specs, material requirements, standards…"
                                            value={item.specifications}
                                            onChange={e => updateItem(item.id, "specifications", e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full gap-2" onClick={() => setItems(prev => [...prev, newItem()])}>
                                <Plus className="h-4 w-4" /> Add Another Item
                            </Button>
                        </div>
                    )}

                    {/* ── STEP 2: Suppliers ── */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Select suppliers from your directory or invite by email. You can also skip and invite later.
                            </p>

                            {/* Email invite input */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Invite by Email</Label>
                                    <Button
                                        size="sm" variant="ghost"
                                        className="h-7 text-xs gap-1 text-primary"
                                        onClick={() => setEmailInvDialogOpen(true)}
                                    >
                                        <Plus className="h-3 w-3" /> Add Guest
                                    </Button>
                                </div>
                                {emailInvites.length > 0 ? (
                                    <div className="border rounded-md divide-y text-sm">
                                        {emailInvites.map((inv, idx) => (
                                            <div key={idx} className="px-3 py-2 flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{inv.legalName}</div>
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

                            {/* Supplier directory */}
                            <div>
                                <Label>Select from Directory</Label>
                                <div className="relative mt-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search suppliers…" value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} className="pl-8" />
                                </div>
                            </div>

                            {suppliersLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                    {filteredSuppliers.length === 0 ? (
                                        <div className="text-center py-6 text-sm text-muted-foreground">No suppliers found</div>
                                    ) : filteredSuppliers.map(s => (
                                        <label key={s.supplierId} className={cn(
                                            "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 border-b last:border-b-0",
                                            selectedSupplierIds.has(s.supplierId) ? "bg-indigo-50" : ""
                                        )}>
                                            <input
                                                type="checkbox"
                                                checked={selectedSupplierIds.has(s.supplierId)}
                                                onChange={() => toggleSupplier(s.supplierId)}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{s.legalName}</div>
                                                {s.email && <div className="text-xs text-muted-foreground truncate">{s.email}</div>}
                                            </div>
                                            {s.country && <Badge variant="outline" className="text-xs flex-shrink-0">{s.country}</Badge>}
                                        </label>
                                    ))}
                                </div>
                            )}

                            {totalSelected > 0 && (
                                <p className="text-sm text-indigo-600 font-medium">{totalSelected} supplier(s) selected</p>
                            )}
                        </div>
                    )}

                    {/* ── STEP 3: Review ── */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">RFP Name</div>
                                    <div className="font-semibold">{name}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Category</div>
                                    <div>{category || "—"}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Currency</div>
                                    <div className="font-medium">{currency}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Deadline</div>
                                    <div>{new Date(deadline).toLocaleString()}</div>
                                </div>
                                {description && (
                                    <div className="col-span-2">
                                        <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Description</div>
                                        <div className="text-slate-600">{description}</div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-indigo-600" />
                                    Line Items ({items.filter(i => i.name.trim()).length})
                                </div>
                                <div className="space-y-2">
                                    {items.filter(i => i.name.trim()).map((item, idx) => (
                                        <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                                            <span className="font-medium">{idx + 1}. {item.name}</span>
                                            <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-indigo-600" />
                                    Invited Suppliers ({totalSelected})
                                </div>
                                {totalSelected === 0 ? (
                                    <p className="text-sm text-amber-600">No suppliers selected. You can invite them after publishing.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {[...selectedSupplierIds].map(id => {
                                            const s = suppliers.find(x => x.supplierId === id);
                                            return <Badge key={id} variant="secondary">{s?.legalName || id}</Badge>;
                                        })}
                                        {emailInvites.map((inv, i) => <Badge key={i} variant="secondary">{inv.legalName} ({inv.email})</Badge>)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={() => step === 0 ? router.push("/buyer/rfp") : setStep(s => s - 1)} disabled={submitting}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {step === 0 ? "Cancel" : "Back"}
                </Button>

                <div className="flex gap-2">
                    {step === 3 ? (
                        <>
                            <Button variant="outline" onClick={() => handlePublish(false)} disabled={submitting}>
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save as Draft
                            </Button>
                            <Button onClick={() => handlePublish(true)} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Publish RFP
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleNext} className="gap-1">
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

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
