"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, Plus } from "lucide-react";

const COUNTRIES = ["United States", "United Kingdom", "Canada", "Germany", "India", "Singapore", "Australia"];
const SUPPLIER_TYPES = ["Individual", "Enterprise"];

export interface InviteEntry {
    legalName: string;
    email: string;
    supplierType: string;
    country: string;
}

interface InviteSupplierDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (invite: InviteEntry) => void;
}

export function InviteSupplierDialog({ isOpen, onClose, onAdd }: InviteSupplierDialogProps) {
    const [formData, setFormData] = useState<InviteEntry>({
        legalName: "",
        email: "",
        supplierType: "Enterprise",
        country: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.legalName.trim()) newErrors.legalName = "Legal name is required.";
        if (!formData.email.trim()) newErrors.email = "Email is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
            newErrors.email = "Invalid email format.";
        if (!formData.country) newErrors.country = "Country is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAdd = () => {
        if (!validate()) return;
        onAdd({ ...formData, email: formData.email.trim(), legalName: formData.legalName.trim() });
        // Reset form
        setFormData({ legalName: "", email: "", supplierType: "Enterprise", country: "" });
        setErrors({});
        onClose();
    };

    const handleClose = () => {
        setFormData({ legalName: "", email: "", supplierType: "Enterprise", country: "" });
        setErrors({});
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Invite Supplier by Email
                    </DialogTitle>
                    <DialogDescription>
                        Complete the form below to add a supplier invitation. An invitation link will be emailed to them.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                Supplier Legal Name
                            </Label>
                            <Input
                                placeholder="e.g. Acme Corp Ltd"
                                value={formData.legalName}
                                onChange={(e) => {
                                    setFormData({ ...formData, legalName: e.target.value });
                                    if (errors.legalName) setErrors({ ...errors, legalName: "" });
                                }}
                                className={errors.legalName ? "border-red-500" : ""}
                            />
                            {errors.legalName ? (
                                <p className="text-sm text-red-500">{errors.legalName}</p>
                            ) : (
                                <p className="text-[0.8rem] text-muted-foreground">Official registered name.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                Primary Contact Email
                            </Label>
                            <Input
                                type="email"
                                placeholder="finance@supplier.com"
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value });
                                    if (errors.email) setErrors({ ...errors, email: "" });
                                }}
                                className={errors.email ? "border-red-500" : ""}
                            />
                            {errors.email ? (
                                <p className="text-sm text-red-500">{errors.email}</p>
                            ) : (
                                <p className="text-[0.8rem] text-muted-foreground">Used for login and notifications.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                Business Type
                            </Label>
                            <Select
                                value={formData.supplierType}
                                onValueChange={(val) => setFormData({ ...formData, supplierType: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUPPLIER_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                Country of Registration
                            </Label>
                            <Select
                                value={formData.country}
                                onValueChange={(val) => {
                                    setFormData({ ...formData, country: val });
                                    if (errors.country) setErrors({ ...errors, country: "" });
                                }}
                            >
                                <SelectTrigger className={errors.country ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select Country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COUNTRIES.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.country && <p className="text-sm text-red-500">{errors.country}</p>}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleAdd}>
                        <Plus className="mr-2 h-4 w-4" /> Add to Invite List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
