"use client";

import { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";

interface SupplierOption { supplierId: number; legalName: string; email?: string; country?: string; }

interface Props {
    value: number | null;
    onChange: (id: number | null) => void;
    placeholder?: string;
}

/** Single-select searchable supplier picker (name / email / ID). */
export default function SupplierSelect({ value, onChange, placeholder = "Search supplier by name, email, or ID…" }: Props) {
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
                    email: s.email, country: s.country,
                })).filter((s: SupplierOption) => !Number.isNaN(s.supplierId)));
            } catch { /* non-fatal */ }
            finally { setLoading(false); }
        })();
    }, []);

    const selected = useMemo(() => suppliers.find((s) => s.supplierId === value) || null, [suppliers, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
                    <span className={selected ? "" : "text-muted-foreground"}>
                        {selected ? `${selected.legalName} (ID ${selected.supplierId})` : placeholder}
                    </span>
                    <span className="flex items-center gap-1">
                        {value != null && <X className="h-4 w-4 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onChange(null); }} />}
                        {loading ? <Loader2 className="h-4 w-4 animate-spin opacity-50" /> : <ChevronsUpDown className="h-4 w-4 opacity-50" />}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command filter={(val, search) => (val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>{loading ? "Loading…" : "No suppliers found."}</CommandEmpty>
                        <CommandGroup>
                            {suppliers.map((s) => (
                                <CommandItem
                                    key={s.supplierId}
                                    value={`${s.legalName} ${s.email || ""} ${s.supplierId}`}
                                    onSelect={() => { onChange(s.supplierId); setOpen(false); }}
                                >
                                    <Check className={`mr-2 h-4 w-4 ${value === s.supplierId ? "opacity-100" : "opacity-0"}`} />
                                    <div className="flex flex-col">
                                        <span className="text-sm">{s.legalName}</span>
                                        <span className="text-xs text-muted-foreground">ID {s.supplierId}{s.email ? ` · ${s.email}` : ""}{s.country ? ` · ${s.country}` : ""}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
