"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RFIStatusBadge } from "@/components/rfi/RFIStatusBadge";
import {
    ClipboardList, ChevronRight, ChevronLeft, Search, Check, Loader2,
    FileText, Users, Calendar, Eye, AlertCircle, X, Plus
} from "lucide-react";
import { toast } from "sonner";
import type { RFITemplate } from "@/types/rfi";
import { cn } from "@/lib/utils";
import { InviteSupplierDialog, type InviteEntry } from "@/components/buyer/invite-supplier-dialog";
import { Mail } from "lucide-react";

interface SupplierOption {
    supplierId: number;
    legalName: string;
    email?: string;
    country?: string;
}

const STEPS = ["Select Template", "Event Details", "Add Suppliers", "Review & Publish"];

export default function BuyerRFICreatePage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Step 1 — template
    const [templates, setTemplates] = useState<RFITemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<RFITemplate | null>(null);
    const [templateSearch, setTemplateSearch] = useState("");

    // Step 2 — event details
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [deadline, setDeadline] = useState("");
    const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

    // Step 3 — suppliers
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<number>>(new Set());
    const [emailInvites, setEmailInvites] = useState<InviteEntry[]>([]);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                setTemplatesLoading(true);
                const res = await apiClient.get("/api/rfi/templates") as any;
                const raw = res.content || (Array.isArray(res) ? res : []);
                setTemplates(raw.filter((t: RFITemplate) => t.status === "PUBLISHED"));
            } catch (err) {
                console.error(err);
                toast.error("Failed to load templates");
            } finally {
                setTemplatesLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    useEffect(() => {
        if (step === 2) {
            const fetchSuppliers = async () => {
                try {
                    setSuppliersLoading(true);
                    const res = await apiClient.get("/api/suppliers") as any;
                    const raw = res.content || (Array.isArray(res) ? res : []);
                    setSuppliers(
                        raw.map((s: any) => ({
                            supplierId: s.supplierId || s.supplierid,
                            legalName: s.legalName || s.legalname,
                            email: s.email,
                            country: s.country,
                        }))
                    );
                } catch (err) {
                    console.error(err);
                    toast.error("Failed to load supplier directory");
                } finally {
                    setSuppliersLoading(false);
                }
            };
            fetchSuppliers();
        }
    }, [step]);

    const validateDetails = () => {
        const errs: Record<string, string> = {};
        if (!title.trim()) errs.title = "Title is required.";
        if (startDate && new Date(startDate) <= new Date()) errs.startDate = "Start date must be in the future.";
        if (!deadline) errs.deadline = "Deadline is required.";
        else if (new Date(deadline) <= new Date()) errs.deadline = "Deadline must be in the future.";
        else if (startDate && new Date(deadline) <= new Date(startDate)) errs.deadline = "Deadline must be after the start date.";
        setDetailErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleNext = () => {
        if (step === 0 && !selectedTemplate) {
            toast.error("Please select a template.");
            return;
        }
        if (step === 1 && !validateDetails()) return;
        setStep((s) => s + 1);
    };

    const handlePublish = async () => {
        setSubmitting(true);
        try {
            // 1. Create event
            const eventRes = await apiClient.post("/api/rfi/events", {
                templateId: selectedTemplate!.templateId,
                title,
                description,
                startDate: startDate || undefined,
                deadline,
            }) as any;

            const rfiId = eventRes.rfiId || eventRes.id;

            // 2. Add invitations
            if (selectedSupplierIds.size > 0 || emailInvites.length > 0) {
                const payload: { supplierIds?: number[]; emailInvites?: any[] } = {};
                if (selectedSupplierIds.size > 0) payload.supplierIds = [...selectedSupplierIds];
                if (emailInvites.length > 0) {
                    payload.emailInvites = emailInvites.map((inv) => ({
                        email: inv.email,
                        legalName: inv.legalName
                    }));
                }
                await apiClient.post(`/api/rfi/events/${rfiId}/invitations`, payload);
            }

            // 3. Publish
            await apiClient.post(`/api/rfi/events/${rfiId}/publish`);

            toast.success("RFI published successfully!");
            router.push(`/buyer/rfi/${rfiId}`);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Failed to create RFI. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!selectedTemplate || !title.trim() || !deadline) {
            toast.error("Please complete Steps 1 and 2 before saving as draft.");
            return;
        }
        setSubmitting(true);
        try {
            const eventRes = await apiClient.post("/api/rfi/events", {
                templateId: selectedTemplate.templateId,
                title,
                description,
                startDate: startDate || undefined,
                deadline,
            }) as any;
            toast.success("RFI saved as draft.");
            router.push(`/buyer/rfi/${eventRes.rfiId || eventRes.id}`);
        } catch (err: any) {
            toast.error("Failed to save draft.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTemplates = templates.filter((t) =>
        !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase())
    );

    const filteredSuppliers = suppliers.filter((s) =>
        !supplierSearch ||
        s.legalName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const toggleSupplier = (id: number) => {
        setSelectedSupplierIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <ClipboardList className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-[#1e293b]">Create RFI Event</h1>
                    <p className="text-muted-foreground text-sm">Follow the steps below to create and publish your RFI.</p>
                </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-0">
                {STEPS.map((label, i) => (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                                i < step ? "bg-primary text-primary-foreground border-primary"
                                    : i === step ? "border-primary text-primary bg-white"
                                    : "border-slate-200 text-slate-400 bg-white"
                            )}>
                                {i < step ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            <span className={cn(
                                "text-xs whitespace-nowrap",
                                i === step ? "text-primary font-semibold" : "text-muted-foreground"
                            )}>
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={cn(
                                "flex-1 h-0.5 mx-2 mb-4",
                                i < step ? "bg-primary" : "bg-slate-200"
                            )} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 0: Select Template */}
            {step === 0 && (
                <Card data-testid="wizard-step-1">
                    <CardHeader>
                        <CardTitle>Select a Template</CardTitle>
                        <CardDescription>Choose a published RFI template to base your event on.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search templates…"
                                value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        {templatesLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredTemplates.map((t) => (
                                    <div
                                        key={t.templateId}
                                        data-testid={`template-select-${t.templateId}`}
                                        onClick={() => setSelectedTemplate(t)}
                                        className={cn(
                                            "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                                            selectedTemplate?.templateId === t.templateId
                                                ? "border-primary bg-primary/5"
                                                : "border-slate-200 hover:border-slate-300 bg-white"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-semibold text-slate-800">{t.name}</div>
                                                <div className="text-sm text-muted-foreground mt-0.5">
                                                    {t.category && <span>{t.category}</span>}
                                                    {t.subcategory && <span> · {t.subcategory}</span>}
                                                    <span className="ml-2">v{t.version}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {t.sections.length > 0 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {t.sections.length} section{t.sections.length !== 1 ? "s" : ""}
                                                        </Badge>
                                                    )}
                                                    {t.regions?.map((r) => (
                                                        <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            {selectedTemplate?.templateId === t.templateId && (
                                                <div className="p-1 rounded-full bg-primary text-primary-foreground shrink-0">
                                                    <Check className="h-3.5 w-3.5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {filteredTemplates.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        No published templates found.{" "}
                                        <a href="/buyer/rfi/templates/create" className="underline text-primary">
                                            Create one
                                        </a>.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 1: Event Details */}
            {step === 1 && (
                <Card data-testid="wizard-step-2">
                    <CardHeader>
                        <CardTitle>Event Details</CardTitle>
                        <CardDescription>Provide the title, description, and deadline for this RFI.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Title</Label>
                            <Input
                                data-testid="event-title-input"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setDetailErrors({ ...detailErrors, title: "" }); }}
                                placeholder="e.g. IT Hardware Procurement — Q1 2026"
                                className={detailErrors.title ? "border-red-500" : ""}
                            />
                            {detailErrors.title && <p className="text-sm text-red-500">{detailErrors.title}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Textarea
                                data-testid="event-description-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Briefly describe the purpose of this RFI…"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label>
                                    Start Date
                                    <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                                </Label>
                                <Input
                                    data-testid="event-startdate-input"
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={(e) => { setStartDate(e.target.value); setDetailErrors({ ...detailErrors, startDate: "" }); }}
                                    className={cn(detailErrors.startDate ? "border-red-500" : "")}
                                />
                                {detailErrors.startDate
                                    ? <p className="text-sm text-red-500">{detailErrors.startDate}</p>
                                    : <p className="text-xs text-muted-foreground">Leave blank to publish immediately.</p>
                                }
                            </div>
                            <div className="space-y-2">
                                <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Response Deadline</Label>
                                <Input
                                    data-testid="event-deadline-input"
                                    type="datetime-local"
                                    value={deadline}
                                    onChange={(e) => { setDeadline(e.target.value); setDetailErrors({ ...detailErrors, deadline: "" }); }}
                                    className={cn(detailErrors.deadline ? "border-red-500" : "")}
                                />
                                {detailErrors.deadline && <p className="text-sm text-red-500">{detailErrors.deadline}</p>}
                            </div>
                        </div>
                        {startDate && new Date(startDate) > new Date() && (
                            <div className="flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                                <p>
                                    This RFI will be <strong>scheduled</strong> and automatically go live on{" "}
                                    <strong>{new Date(startDate).toLocaleString()}</strong>. Suppliers won&apos;t receive invites until then.
                                </p>
                            </div>
                        )}
                        {selectedTemplate && (
                            <div className="p-3 rounded-lg bg-indigo-50 flex gap-3 text-sm">
                                <FileText className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                                <span>
                                    Using template:{" "}
                                    <span className="font-semibold">{selectedTemplate.name}</span>{" "}
                                    (v{selectedTemplate.version})
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Add Suppliers */}
            {step === 2 && (
                <Card data-testid="wizard-step-3">
                    <CardHeader>
                        <CardTitle>Add Suppliers</CardTitle>
                        <CardDescription>
                            Select suppliers from your directory, or invite by email. You can also skip and add later.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email…"
                                value={supplierSearch}
                                onChange={(e) => setSupplierSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        {suppliersLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
                                {filteredSuppliers.map((s) => {
                                    const checked = selectedSupplierIds.has(s.supplierId);
                                    return (
                                        <div
                                            key={s.supplierId}
                                            data-testid={`supplier-select-${s.supplierId}`}
                                            onClick={() => toggleSupplier(s.supplierId)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors",
                                                checked && "bg-primary/5"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0",
                                                checked ? "bg-primary border-primary" : "border-slate-300"
                                            )}>
                                                {checked && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{s.legalName}</div>
                                                {(s.email || s.country) && (
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {[s.email, s.country].filter(Boolean).join(" · ")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredSuppliers.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No suppliers found.
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedSupplierIds.size > 0 && (
                            <p className="text-sm text-primary font-medium">
                                {selectedSupplierIds.size} supplier{selectedSupplierIds.size !== 1 ? "s" : ""} selected
                            </p>
                        )}

                        <div className="border-t pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Invite by email</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsInviteDialogOpen(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Invite New Supplier
                                </Button>
                            </div>

                            {emailInvites.length > 0 ? (
                                <div className="border rounded-lg divide-y">
                                    {emailInvites.map((inv, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between px-4 py-3"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                    <Mail className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-sm truncate">{inv.legalName}</div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {inv.email} · {inv.country} · {inv.supplierType}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-500"
                                                onClick={() =>
                                                    setEmailInvites((prev) => prev.filter((_, i) => i !== idx))
                                                }
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    No email invitations added yet. Click &quot;Invite New Supplier&quot; to add one.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Review & Publish */}
            {step === 3 && (
                <Card data-testid="wizard-step-4">
                    <CardHeader>
                        <CardTitle>Review & Publish</CardTitle>
                        <CardDescription>
                            Review your RFI configuration before publishing. Published events will be immediately visible to invited suppliers.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block mb-0.5">Template</span>
                                <span className="font-semibold">{selectedTemplate?.name} (v{selectedTemplate?.version})</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-0.5">Title</span>
                                <span className="font-semibold">{title}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-0.5">Start Date</span>
                                <span className="font-semibold">
                                    {startDate ? new Date(startDate).toLocaleString() : <span className="text-muted-foreground font-normal">Immediate</span>}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-0.5">Response Deadline</span>
                                <span className="font-semibold">{deadline ? new Date(deadline).toLocaleString() : "—"}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-0.5">Suppliers invited</span>
                                <span className="font-semibold">
                                    {selectedSupplierIds.size}
                                    {emailInvites.length > 0 ? ` + ${emailInvites.length} by email` : ""}
                                </span>
                            </div>
                        </div>
                        {description && (
                            <div>
                                <span className="text-muted-foreground block mb-0.5 text-sm">Description</span>
                                <p className="text-sm">{description}</p>
                            </div>
                        )}
                        {startDate && new Date(startDate) > new Date() ? (
                            <div className="flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded text-sm">
                                <Calendar className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>
                                    This RFI will be saved as <strong>Scheduled</strong>. Invite emails will go out automatically on{" "}
                                    <strong>{new Date(startDate).toLocaleString()}</strong>.
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-3 rounded text-sm">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>
                                    Once published, suppliers will receive invitation emails immediately. The event
                                    deadline and template cannot be changed after publishing.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Footer navigation */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/buyer/rfi")}>
                        Cancel
                    </Button>
                    {step > 0 && (
                        <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    {step === 3 && (
                        <Button variant="outline" onClick={handleSaveDraft} disabled={submitting}>
                            Save as Draft
                        </Button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <Button data-testid="wizard-next-btn" onClick={handleNext}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    ) : (
                        <Button data-testid="publish-event-btn" onClick={handlePublish} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Publish RFI
                        </Button>
                    )}
                </div>
            </div>

            {/* Invite Supplier Modal */}
            <InviteSupplierDialog
                isOpen={isInviteDialogOpen}
                onClose={() => setIsInviteDialogOpen(false)}
                onAdd={(invite) => {
                    // Prevent duplicate emails
                    if (emailInvites.some((e) => e.email.toLowerCase() === invite.email.toLowerCase())) {
                        toast.error("This email has already been added.");
                        return;
                    }
                    setEmailInvites((prev) => [...prev, invite]);
                    toast.success(`${invite.legalName} added to invite list.`);
                }}
            />
        </div>
    );
}
