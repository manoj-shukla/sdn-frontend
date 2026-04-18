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
    FileText, Package, Users, Eye, Search, XCircle, ShieldCheck,
    Leaf, DollarSign, FileCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InviteSupplierDialog, type InviteEntry } from "@/components/buyer/invite-supplier-dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
    id: string;
    name: string;
    description: string;
    quantity: string;
    unit: string;
    specifications: string;
    specAttributes: Record<string, string>;
    targetPrice: string;
    targetPriceNote: string;
}

interface SupplierOption {
    supplierId: number;
    legalName: string;
    email?: string;
    country?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
    "Event Overview",
    "Line Items & Targets",
    "Requirements",
    "Invite Suppliers",
    "Review & Publish",
];
const STEP_ICONS = [FileText, Package, ShieldCheck, Users, Eye];

const UNIT_OPTIONS = ["pcs", "kg", "mt", "L", "m", "m²", "m³", "hr", "day", "lot", "set", "box", "pallet"];
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED", "INR", "SGD", "AUD"];
const INCOTERMS_OPTIONS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];
const CATEGORY_OPTIONS = [
    "Raw Materials", "Packaging", "IT Services", "Manufacturing", "Logistics",
    "Professional Services", "Facilities", "Marketing", "HR Services", "Pharma", "Food", "Other"
];
const CATEGORY_INSTRUCTIONS: Record<string, string> = {
    "Packaging": "Please submit GSM specifications, flute details, and board composition for all packaging items.",
    "Pharma": "GMP certificates are mandatory. Include batch traceability details and pharmacopeia compliance.",
    "Food": "Submit food-grade certification, allergen declaration, and HACCP compliance documentation.",
    "Raw Materials": "Include material grade, origin certificate, and test reports for all raw materials.",
    "IT Services": "Provide team CVs, methodology documentation, and SLA details.",
    "Logistics": "Include carrier network map, tracking capabilities, and insurance coverage details.",
};

// ── Structured Spec Templates (Section 3) ─────────────────────────────────────

interface SpecField {
    key: string;
    label: string;
    type: "number" | "text" | "select";
    unit?: string;
    options?: string[];
}

const CATEGORY_SPEC_TEMPLATES: Record<string, SpecField[]> = {
    "Packaging": [
        { key: "length_mm",        label: "Length",              type: "number", unit: "mm" },
        { key: "width_mm",         label: "Width",               type: "number", unit: "mm" },
        { key: "height_mm",        label: "Height",              type: "number", unit: "mm" },
        { key: "ply",              label: "Ply",                 type: "select", options: ["3-ply", "5-ply", "7-ply", "9-ply"] },
        { key: "flute_type",       label: "Flute Type",          type: "select", options: ["B", "C", "BC", "E", "F", "EB"] },
        { key: "outer_liner_gsm",  label: "Outer Liner GSM",     type: "number", unit: "GSM" },
        { key: "inner_liner_gsm",  label: "Inner Liner GSM",     type: "number", unit: "GSM" },
        { key: "printing_colors",  label: "Printing Colors",     type: "number" },
        { key: "burst_factor",     label: "Burst Factor",        type: "number" },
    ],
    "Raw Materials": [
        { key: "grade",            label: "Material Grade",      type: "text" },
        { key: "purity_pct",       label: "Purity",              type: "number", unit: "%" },
        { key: "origin_country",   label: "Country of Origin",   type: "text" },
        { key: "form",             label: "Form",                type: "select", options: ["Sheet", "Coil", "Rod", "Wire", "Powder", "Pellet", "Other"] },
        { key: "thickness_mm",     label: "Thickness",           type: "number", unit: "mm" },
        { key: "tensile_strength", label: "Tensile Strength",    type: "number", unit: "MPa" },
    ],
    "Pharma": [
        { key: "active_ingredient", label: "Active Ingredient",  type: "text" },
        { key: "concentration_mg",  label: "Concentration",      type: "number", unit: "mg" },
        { key: "dosage_form",       label: "Dosage Form",        type: "select", options: ["Tablet", "Capsule", "Liquid", "Injection", "Powder", "Cream", "Patch"] },
        { key: "shelf_life_months", label: "Shelf Life",         type: "number", unit: "months" },
        { key: "storage_condition", label: "Storage Condition",  type: "text" },
        { key: "pharmacopeia",      label: "Pharmacopeia Std",   type: "select", options: ["USP", "BP", "EP", "JP", "IP", "Other"] },
    ],
    "Food": [
        { key: "fat_pct",          label: "Fat Content",         type: "number", unit: "%" },
        { key: "protein_pct",      label: "Protein Content",     type: "number", unit: "%" },
        { key: "moisture_pct",     label: "Moisture",            type: "number", unit: "%" },
        { key: "shelf_life_days",  label: "Shelf Life",          type: "number", unit: "days" },
        { key: "packaging_type",   label: "Packaging Type",      type: "select", options: ["Bulk", "Pouch", "Can", "Bottle", "Carton", "Other"] },
    ],
    "Manufacturing": [
        { key: "material",         label: "Material",            type: "text" },
        { key: "tolerance_mm",     label: "Tolerance",           type: "number", unit: "±mm" },
        { key: "surface_finish",   label: "Surface Finish",      type: "select", options: ["Polished", "Painted", "Anodized", "Galvanized", "Raw", "Other"] },
        { key: "weight_kg",        label: "Weight",              type: "number", unit: "kg" },
        { key: "process",          label: "Manufacturing Process", type: "select", options: ["CNC", "Casting", "Forging", "Stamping", "Injection Molding", "Welding", "Other"] },
    ],
};

function newItem(): LineItem {
    return {
        id: crypto.randomUUID(), name: "", description: "",
        quantity: "", unit: "pcs", specifications: "",
        specAttributes: {},
        targetPrice: "", targetPriceNote: "",
    };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BuyerRFPCreatePage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Step 0 — Event Overview
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [deadline, setDeadline] = useState("");
    const [description, setDescription] = useState("");
    const [buRegion, setBuRegion] = useState("");
    const [incoterms, setIncoterms] = useState("");
    const [contactPerson, setContactPerson] = useState("");
    const [instructions, setInstructions] = useState("");
    const [requireComplianceAck, setRequireComplianceAck] = useState(false);
    const [basicErrors, setBasicErrors] = useState<Record<string, string>>({});

    // Step 1 — Line Items
    const [items, setItems] = useState<LineItem[]>([newItem()]);

    // Step 2 — Requirements
    const [requireISO, setRequireISO] = useState(false);
    const [requireGMP, setRequireGMP] = useState(false);
    const [requireFSC, setRequireFSC] = useState(false);
    const [minRevenueM, setMinRevenueM] = useState("");
    const [esgWeightPct, setEsgWeightPct] = useState(10);
    const [buyerPaymentTerms, setBuyerPaymentTerms] = useState("Net 30");
    const [priceValidityDays, setPriceValidityDays] = useState("90");
    const [penaltyClausesIncluded, setPenaltyClausesIncluded] = useState(false);
    const [indexLinkage, setIndexLinkage] = useState("");

    // Step 3 — Suppliers
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<number>>(new Set());
    const [emailInvites, setEmailInvites] = useState<InviteEntry[]>([]);
    const [emailInvDialogOpen, setEmailInvDialogOpen] = useState(false);

    // Auto-fill instructions when category changes
    useEffect(() => {
        if (category && CATEGORY_INSTRUCTIONS[category] && !instructions) {
            setInstructions(CATEGORY_INSTRUCTIONS[category]);
        }
        if (category === "Pharma" || category === "Food") setRequireGMP(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category]);

    useEffect(() => {
        if (step === 3) {
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

    const filteredSuppliers = suppliers.filter(s =>
        s.legalName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(supplierSearch.toLowerCase())
    );
    const totalSelected = selectedSupplierIds.size + emailInvites.length;
    const toggleSupplier = (id: number) => setSelectedSupplierIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

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
        const valid = items.some(i => i.name.trim() && parseFloat(i.quantity) > 0);
        if (!valid) { toast.error("Add at least one valid line item."); return false; }
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
            // Derive scoring weights: ESG weight is user-configured, remaining 90% split 40/25/15/10
            // The esgWeightPct is taken as-is; redistribute the rest proportionally to defaults
            const esgW = esgWeightPct;
            const remaining = 100 - esgW;
            const defaultNonEsg = 90; // 40+25+15+10
            const scale = remaining / defaultNonEsg;
            const wCommercial = Math.round(40 * scale);
            const wTechnical  = Math.round(25 * scale);
            const wQuality    = Math.round(15 * scale);
            // logistics gets the remainder to ensure sum = 100
            const wLogistics  = 100 - esgW - wCommercial - wTechnical - wQuality;

            const rfpRes: any = await apiClient.post("/api/rfp", {
                name, category, currency, deadline, description,
                buRegion, incoterms, contactPerson, instructions, requireComplianceAck,
                // Section 2/6 — buyer certification requirements (stored as proper columns)
                requireIso: requireISO,
                requireGmp: requireGMP,
                requireFsc: requireFSC,
                minRevenueM: minRevenueM ? parseFloat(minRevenueM) : 0,
                // Configurable scoring weights
                weightCommercial: wCommercial,
                weightTechnical:  wTechnical,
                weightQuality:    wQuality,
                weightLogistics:  wLogistics,
                weightEsg:        esgW,
            });
            const rfpId = rfpRes.rfpId;

            for (const item of items.filter(i => i.name.trim() && parseFloat(i.quantity) > 0)) {
                await apiClient.post(`/api/rfp/${rfpId}/items`, {
                    name: item.name, description: item.description,
                    quantity: parseFloat(item.quantity), unit: item.unit,
                    specifications: item.specifications,
                    specAttributes: Object.keys(item.specAttributes || {}).length > 0 ? item.specAttributes : undefined,
                    targetPrice: item.targetPrice ? parseFloat(item.targetPrice) : undefined,
                    targetPriceNote: item.targetPriceNote,
                });
            }

            if (totalSelected > 0) {
                await apiClient.post(`/api/rfp/${rfpId}/suppliers`, {
                    supplierIds: [...selectedSupplierIds],
                    emailInvites: emailInvites.map(e => ({ email: e.email, legalName: e.legalName })),
                }).catch((e: any) => toast.warning("Some invitations failed: " + (e?.message || "")));
            }

            if (publish) {
                await apiClient.post(`/api/rfp/${rfpId}/publish`, {});
                toast.success("RFP published successfully!");
            } else {
                toast.success("RFP saved as draft.");
            }
            router.push(`/buyer/rfp/${rfpId}`);
        } catch (err: any) {
            toast.error(err?.message || "Failed to create RFP");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full py-8 px-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Create New RFP</h1>
                <p className="text-sm text-muted-foreground mt-1">Build a structured sourcing event across all 8 evaluation dimensions</p>
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-1">
                {STEPS.map((s, i) => {
                    const Icon = STEP_ICONS[i];
                    const done = i < step;
                    const active = i === step;
                    return (
                        <div key={i} className="flex items-center flex-1 min-w-0">
                            <button onClick={() => i < step && setStep(i)} disabled={i > step}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all w-full",
                                    active ? "bg-indigo-600 text-white" :
                                    done ? "bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200" :
                                    "bg-slate-100 text-slate-400"
                                )}>
                                {done ? <Check className="h-3 w-3 flex-shrink-0" /> : <Icon className="h-3 w-3 flex-shrink-0" />}
                                <span className="truncate hidden sm:inline">{s}</span>
                            </button>
                            {i < STEPS.length - 1 && <div className="w-2 h-px bg-slate-200 flex-shrink-0 mx-0.5" />}
                        </div>
                    );
                })}
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        {(() => { const Icon = STEP_ICONS[step]; return <Icon className="h-4 w-4 text-indigo-600" />; })()}
                        {STEPS[step]}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* ── STEP 0: Event Overview ── */}
                    {step === 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label>RFP / Event Name <span className="text-red-500">*</span></Label>
                                <Input placeholder="e.g. Corrugated Packaging RFQ Q2 2026"
                                    value={name} onChange={e => setName(e.target.value)} />
                                {basicErrors.name && <p className="text-xs text-red-500">{basicErrors.name}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <select value={category} onChange={e => setCategory(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                                    <option value="">— Select —</option>
                                    {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>BU / Region</Label>
                                <Input placeholder="e.g. APAC Procurement" value={buRegion} onChange={e => setBuRegion(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Currency <span className="text-red-500">*</span></Label>
                                <select value={currency} onChange={e => setCurrency(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                                    {CURRENCY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                                </select>
                                {basicErrors.currency && <p className="text-xs text-red-500">{basicErrors.currency}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Submission Deadline <span className="text-red-500">*</span></Label>
                                <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
                                {basicErrors.deadline && <p className="text-xs text-red-500">{basicErrors.deadline}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Incoterms</Label>
                                <select value={incoterms} onChange={e => setIncoterms(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                                    <option value="">— Select —</option>
                                    {INCOTERMS_OPTIONS.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Contact Person</Label>
                                <Input placeholder="Category manager name / email" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label>Description</Label>
                                <Textarea placeholder="Brief overview of the sourcing event…" value={description}
                                    onChange={e => setDescription(e.target.value)} rows={2} />
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label>Supplier Instructions</Label>
                                {category && CATEGORY_INSTRUCTIONS[category] && (
                                    <p className="text-xs text-indigo-600 mb-1">
                                        💡 Auto-loaded for <strong>{category}</strong> — edit as needed
                                    </p>
                                )}
                                <Textarea placeholder="Instructions to suppliers: required documents, pricing format, communication protocol…"
                                    value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={requireComplianceAck}
                                        onChange={e => setRequireComplianceAck(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                                    <span className="text-sm">Require suppliers to acknowledge compliance before proceeding</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 1: Line Items + Target Prices ── */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Define what you are sourcing. Set a <strong>target price</strong> per item to enable should-cost analysis.
                                {category && CATEGORY_SPEC_TEMPLATES[category] && (
                                    <span className="text-indigo-600 font-medium"> Structured spec fields for <strong>{category}</strong> are pre-loaded below.</span>
                                )}
                            </p>
                            {items.map((item, idx) => {
                                const specTemplate = category ? (CATEGORY_SPEC_TEMPLATES[category] || []) : [];
                                const updateSpecAttr = (key: string, val: string) => {
                                    setItems(prev => prev.map(i => i.id === item.id
                                        ? { ...i, specAttributes: { ...i.specAttributes, [key]: val } }
                                        : i
                                    ));
                                };
                                return (
                                <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">Item {idx + 1}</span>
                                        {items.length > 1 && (
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600"
                                                onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div className="col-span-2 sm:col-span-3 space-y-1">
                                            <Label className="text-xs">Item Name *</Label>
                                            <Input placeholder="e.g. Corrugated Box 400x300x250mm"
                                                value={item.name}
                                                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Quantity *</Label>
                                            <Input type="number" placeholder="0" value={item.quantity}
                                                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: e.target.value } : i))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Unit</Label>
                                            <select value={item.unit}
                                                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, unit: e.target.value } : i))}
                                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                                                {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Target Price ({currency}) — Should Cost</Label>
                                            <Input type="number" placeholder="Benchmark price"
                                                value={item.targetPrice}
                                                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, targetPrice: e.target.value } : i))} />
                                        </div>

                                        {/* Section 3: Structured Technical Specifications */}
                                        {specTemplate.length > 0 && (
                                            <div className="col-span-2 sm:col-span-3 space-y-2">
                                                <div className="flex items-center gap-1.5">
                                                    <Package className="h-3.5 w-3.5 text-indigo-600" />
                                                    <Label className="text-xs font-semibold text-indigo-700">Section 3 — Technical Specifications ({category})</Label>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                                                    {specTemplate.map(field => (
                                                        <div key={field.key} className="space-y-1">
                                                            <Label className="text-xs text-slate-600">
                                                                {field.label}{field.unit ? ` (${field.unit})` : ""}
                                                            </Label>
                                                            {field.type === "select" ? (
                                                                <select
                                                                    value={item.specAttributes[field.key] || ""}
                                                                    onChange={e => updateSpecAttr(field.key, e.target.value)}
                                                                    className="w-full h-8 rounded-md border border-input bg-background px-2 py-0.5 text-xs shadow-sm">
                                                                    <option value="">— select —</option>
                                                                    {field.options?.map(o => <option key={o}>{o}</option>)}
                                                                </select>
                                                            ) : (
                                                                <Input
                                                                    type={field.type === "number" ? "number" : "text"}
                                                                    placeholder="—"
                                                                    className="h-8 text-xs"
                                                                    value={item.specAttributes[field.key] || ""}
                                                                    onChange={e => updateSpecAttr(field.key, e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="col-span-2 sm:col-span-3 space-y-1">
                                            <Label className="text-xs">Additional Specifications / Notes</Label>
                                            <Textarea placeholder="e.g. 5-ply BC flute, outer liner 200 GSM, 2-colour print, Burst Factor 16…"
                                                rows={2} value={item.specifications}
                                                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, specifications: e.target.value } : i))} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-3 space-y-1">
                                            <Label className="text-xs">Target Price Note</Label>
                                            <Input placeholder="e.g. Based on current market rate Apr 2026"
                                                value={item.targetPriceNote}
                                                onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, targetPriceNote: e.target.value } : i))} />
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                            <Button variant="outline" className="w-full gap-2" onClick={() => setItems(prev => [...prev, newItem()])}>
                                <Plus className="h-4 w-4" /> Add Another Item
                            </Button>
                        </div>
                    )}

                    {/* ── STEP 2: Requirements (S2 + S7 + S8) ── */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Section 2: Qualification */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                                    Supplier Qualification Requirements (Section 2)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Required Certifications</Label>
                                        {[
                                            { label: "ISO 9001", value: requireISO, set: setRequireISO },
                                            { label: "GMP (Good Manufacturing Practice)", value: requireGMP, set: setRequireGMP },
                                            { label: "FSC (Forest Stewardship Council)", value: requireFSC, set: setRequireFSC },
                                        ].map(c => (
                                            <label key={c.label} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={c.value}
                                                    onChange={e => c.set(e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                                                <span className="text-sm">{c.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Min Annual Revenue (USD million)</Label>
                                        <Input type="number" placeholder="e.g. 5" value={minRevenueM}
                                            onChange={e => setMinRevenueM(e.target.value)} />
                                        <p className="text-xs text-muted-foreground">Suppliers below this will be auto-flagged for financial risk.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section 7: ESG */}
                            <div className="border-t pt-5 space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Leaf className="h-4 w-4 text-green-600" />
                                    Sustainability & ESG Weight (Section 7)
                                </h3>
                                <Label className="text-xs text-muted-foreground block">
                                    ESG scoring weight in final supplier evaluation: <strong>{esgWeightPct}%</strong>
                                </Label>
                                <input type="range" min={0} max={30} step={5} value={esgWeightPct}
                                    onChange={e => setEsgWeightPct(Number(e.target.value))}
                                    className="w-full accent-green-600" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>0%</span><span>10% default</span><span>30%</span>
                                </div>
                            </div>

                            {/* Section 8: Commercial Terms */}
                            <div className="border-t pt-5 space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-amber-600" />
                                    Commercial Terms & Conditions (Section 8)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Payment Terms</Label>
                                        <select value={buyerPaymentTerms} onChange={e => setBuyerPaymentTerms(e.target.value)}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                                            {["Net 30", "Net 45", "Net 60", "Net 90", "Advance", "LC at Sight"].map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Price Validity (days)</Label>
                                        <Input type="number" placeholder="90" value={priceValidityDays}
                                            onChange={e => setPriceValidityDays(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Commodity Index Linkage</Label>
                                        <Input placeholder="e.g. OCC index, LME Copper" value={indexLinkage}
                                            onChange={e => setIndexLinkage(e.target.value)} />
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={penaltyClausesIncluded}
                                                onChange={e => setPenaltyClausesIncluded(e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                                            <span className="text-sm">Include penalty clauses for late delivery</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Scoring weights preview — dynamically computed from ESG slider */}
                            <div className="border-t pt-5 space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <FileCheck className="h-4 w-4 text-blue-600" />
                                    Evaluation Scoring Weights
                                </h3>
                                {(() => {
                                    const esgW = esgWeightPct;
                                    const rem = 100 - esgW;
                                    const scale = rem / 90;
                                    const wC = Math.round(40 * scale);
                                    const wT = Math.round(25 * scale);
                                    const wQ = Math.round(15 * scale);
                                    const wL = 100 - esgW - wC - wT - wQ;
                                    return (
                                        <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                            {[
                                                { label: "Commercial", pct: wC, color: "bg-indigo-100 text-indigo-700" },
                                                { label: "Technical", pct: wT, color: "bg-blue-100 text-blue-700" },
                                                { label: "Quality", pct: wQ, color: "bg-amber-100 text-amber-700" },
                                                { label: "Logistics", pct: wL, color: "bg-orange-100 text-orange-700" },
                                                { label: "ESG", pct: esgW, color: "bg-green-100 text-green-700" },
                                            ].map(w => (
                                                <div key={w.label} className={`rounded-lg p-2 ${w.color}`}>
                                                    <div className="font-bold text-base">{w.pct}%</div>
                                                    <div>{w.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Invite Suppliers ── */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Select suppliers from your directory or invite by email. You can also skip and invite later.
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Invite by Email</Label>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary"
                                        onClick={() => setEmailInvDialogOpen(true)}>
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
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                    onClick={() => setEmailInvites(prev => prev.filter((_, i) => i !== idx))}>
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No email invitations added yet.</p>
                                )}
                            </div>
                            <div>
                                <Label>Select from Directory</Label>
                                <div className="relative mt-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search suppliers…" value={supplierSearch}
                                        onChange={e => setSupplierSearch(e.target.value)} className="pl-8" />
                                </div>
                            </div>
                            {suppliersLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                    {filteredSuppliers.length === 0 ? (
                                        <div className="text-center py-6 text-sm text-muted-foreground">No suppliers found</div>
                                    ) : filteredSuppliers.map(s => (
                                        <label key={s.supplierId} className={cn(
                                            "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 border-b last:border-b-0",
                                            selectedSupplierIds.has(s.supplierId) ? "bg-indigo-50" : ""
                                        )}>
                                            <input type="checkbox"
                                                checked={selectedSupplierIds.has(s.supplierId)}
                                                onChange={() => toggleSupplier(s.supplierId)}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
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

                    {/* ── STEP 4: Review & Publish ── */}
                    {step === 4 && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {[
                                    ["RFP Name", name],
                                    ["Category", category || "—"],
                                    ["Currency", currency],
                                    ["Deadline", deadline ? new Date(deadline).toLocaleString() : "—"],
                                    ["BU / Region", buRegion || "—"],
                                    ["Incoterms", incoterms || "—"],
                                    ["Contact Person", contactPerson || "—"],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
                                        <div className="font-medium">{value}</div>
                                    </div>
                                ))}
                                {instructions && (
                                    <div className="col-span-2">
                                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Supplier Instructions</div>
                                        <div className="text-xs bg-indigo-50 rounded p-2 text-indigo-800">{instructions}</div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-indigo-600" />
                                    Line Items ({items.filter(i => i.name.trim()).length})
                                </div>
                                <div className="border rounded-lg overflow-hidden text-xs">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 text-muted-foreground">
                                            <tr>
                                                <th className="text-left px-3 py-2">Item</th>
                                                <th className="text-right px-3 py-2">Qty</th>
                                                <th className="text-right px-3 py-2">Target Price</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {items.filter(i => i.name.trim()).map((item, idx) => (
                                                <tr key={item.id}>
                                                    <td className="px-3 py-2 font-medium">{idx + 1}. {item.name}</td>
                                                    <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                                                    <td className="px-3 py-2 text-right text-indigo-700">
                                                        {item.targetPrice ? `${currency} ${item.targetPrice}` : "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-semibold mb-2">Requirements Summary</div>
                                <div className="flex flex-wrap gap-1.5 text-xs">
                                    {requireISO && <Badge className="bg-blue-100 text-blue-700 border-none">ISO 9001 Required</Badge>}
                                    {requireGMP && <Badge className="bg-blue-100 text-blue-700 border-none">GMP Required</Badge>}
                                    {requireFSC && <Badge className="bg-blue-100 text-blue-700 border-none">FSC Required</Badge>}
                                    {minRevenueM && <Badge className="bg-amber-100 text-amber-700 border-none">Min Revenue ${minRevenueM}M</Badge>}
                                    <Badge className="bg-green-100 text-green-700 border-none">ESG {esgWeightPct}%</Badge>
                                    <Badge className="bg-slate-100 text-slate-700 border-none">{buyerPaymentTerms}</Badge>
                                    <Badge className="bg-slate-100 text-slate-700 border-none">Price Valid {priceValidityDays}d</Badge>
                                    {penaltyClausesIncluded && <Badge className="bg-red-100 text-red-700 border-none">Penalty Clauses</Badge>}
                                    {requireComplianceAck && <Badge className="bg-violet-100 text-violet-700 border-none">Compliance Ack Required</Badge>}
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
                                        {emailInvites.map((inv, i) => <Badge key={i} variant="secondary">{inv.legalName}</Badge>)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline"
                    onClick={() => step === 0 ? router.push("/buyer/rfp") : setStep(s => s - 1)}
                    disabled={submitting}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {step === 0 ? "Cancel" : "Back"}
                </Button>
                <div className="flex gap-2">
                    {step === STEPS.length - 1 ? (
                        <>
                            <Button variant="outline" onClick={() => handlePublish(false)} disabled={submitting}>
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save as Draft
                            </Button>
                            <Button onClick={() => handlePublish(true)} disabled={submitting}
                                className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
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
