"use client";

import { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, X, Loader2, UserPlus } from "lucide-react";

export interface SupplierOption {
    supplierId: number;
    legalName: string;
    email?: string;
    country?: string;
}

interface Props {
    value: number[];
    onChange: (ids: number[]) => void;
    placeholder?: string;
}

/**
 * Searchable multi-select for the supplier whitelist. Loads the buyer's
 * supplier directory once and lets the user type-to-filter and pick several.
 */
export default function SupplierMultiSelect({ value, onChange, placeholder = "Search suppliers by name, email, or ID…" }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const res = (await apiClient.get("/api/suppliers")) as any;
                const raw = res?.content || (Array.isArray(res) ? res : []);
                setSuppliers(raw.map((s: any) => ({
                    supplierId: Number(s.supplierId || s.supplierid),
                    legalName: s.legalName || s.legalname || `Supplier ${s.supplierId || s.supplierid}`,
                    email: s.email,
                    country: s.country,
                })).filter((s: SupplierOption) => !Number.isNaN(s.supplierId)));
            } catch {
                // Non-fatal: user can still proceed, just without the picker list.
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const byId = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.supplierId, s])), [suppliers]);
    const selected = value.map((id) => byId[id] || { supplierId: id, legalName: `Supplier ${id}` });

    const toggle = (id: number) => {
        if (value.includes(id)) onChange(value.filter((v) => v !== id));
        else onChange([...value, id]);
    };

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
                        <span className="flex items-center gap-2 text-muted-foreground">
                            <UserPlus className="h-4 w-4" />
                            {value.length ? `${value.length} supplier${value.length > 1 ? "s" : ""} selected` : placeholder}
                        </span>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin opacity-50" /> : <ChevronsUpDown className="h-4 w-4 opacity-50" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command
                        filter={(val, search) => {
                            // val is the CommandItem `value` (we pack name+email+id into it)
                            return val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                        }}
                    >
                        <CommandInput placeholder={placeholder} />
                        <CommandList>
                            <CommandEmpty>{loading ? "Loading…" : "No suppliers found."}</CommandEmpty>
                            <CommandGroup>
                                {suppliers.map((s) => {
                                    const isSel = value.includes(s.supplierId);
                                    return (
                                        <CommandItem
                                            key={s.supplierId}
                                            value={`${s.legalName} ${s.email || ""} ${s.supplierId}`}
                                            onSelect={() => toggle(s.supplierId)}
                                        >
                                            <Check className={`mr-2 h-4 w-4 ${isSel ? "opacity-100" : "opacity-0"}`} />
                                            <div className="flex flex-col">
                                                <span className="text-sm">{s.legalName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    ID {s.supplierId}{s.email ? ` · ${s.email}` : ""}{s.country ? ` · ${s.country}` : ""}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((s) => (
                        <Badge key={s.supplierId} variant="secondary" className="gap-1 pr-1">
                            {s.legalName}
                            <button type="button" onClick={() => toggle(s.supplierId)} className="ml-0.5 rounded-full hover:bg-slate-300/60 p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
