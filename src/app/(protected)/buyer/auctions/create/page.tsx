"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createAuction, addLot, addSuppliers, scheduleAuction } from "@/lib/api/auctions";
import SupplierMultiSelect from "@/components/auctions/SupplierMultiSelect";

const EVENT_TYPES = ["REVERSE", "ENGLISH", "SEALED", "VICKREY", "DUTCH", "DOUBLE"];

const emptyLot = () => ({
    title: "", quantity: 1, uom: "Pcs", startPrice: "", reservePrice: "",
    minDecrement: "", decrementType: "ABSOLUTE", bidBufferAmount: "", maxSealPct: "",
    softCloseWindowSec: 120, extensionSec: 180, maxExtensions: 10, extensionType: "ADD",
    visibilityMode: "RANK_ONLY", initialDurationSec: 1800, startStrategy: "IMMEDIATE",
    dutchStepSec: 30, dutchStepAmount: "",
});

export default function CreateAuctionPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [header, setHeader] = useState<any>({
        name: "", referenceCode: "", eventType: "REVERSE", baseCurrency: "INR",
        globalBaseline: "", maskingRule: "MASKED", defaultVisibility: "RANK_ONLY",
        staggerIntervalSec: 120, description: "",
        emdRequired: false, emdValueType: "PERCENT", emdValue: 2, emdVerificationMode: "MANUAL",
    });
    const [lots, setLots] = useState<any[]>([emptyLot()]);
    const [supplierIds, setSupplierIds] = useState<number[]>([]);

    const setH = (k: string, v: any) => setHeader((s: any) => ({ ...s, [k]: v }));
    const setLot = (i: number, k: string, v: any) => setLots((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

    const num = (v: any) => (v === "" || v == null ? undefined : Number(v));

    const submit = async (launch: boolean) => {
        if (!header.name.trim()) return toast.error("Auction name is required");
        if (!lots.some((l) => l.title.trim())) return toast.error("Add at least one lot with a title");
        setSaving(true);
        try {
            const created: any = await createAuction({
                ...header,
                globalBaseline: num(header.globalBaseline),
                emdValue: num(header.emdValue),
            });
            const id = created.auction_id;
            for (const l of lots.filter((x) => x.title.trim())) {
                await addLot(id, {
                    ...l,
                    startPrice: num(l.startPrice), reservePrice: num(l.reservePrice),
                    minDecrement: num(l.minDecrement), bidBufferAmount: num(l.bidBufferAmount),
                    maxSealPct: num(l.maxSealPct), quantity: num(l.quantity),
                    dutchStepSec: num(l.dutchStepSec), dutchStepAmount: num(l.dutchStepAmount),
                });
            }
            if (supplierIds.length) await addSuppliers(id, supplierIds.map((sid) => ({ supplierId: sid })));
            if (launch) await scheduleAuction(id);
            toast.success(launch ? "Auction created & scheduled" : "Auction draft saved");
            router.push(`/buyer/auctions/${id}`);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || "Failed to create auction");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                <h1 className="text-2xl font-extrabold text-[#1e293b]">New Auction</h1>
            </div>

            {/* Header config */}
            <Card>
                <CardHeader><CardTitle className="text-base">Global Rules (Header)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div><Label>Auction Name *</Label><Input value={header.name} onChange={(e) => setH("name", e.target.value)} placeholder="CPU-2024-Q3" /></div>
                    <div><Label>Reference Code</Label><Input value={header.referenceCode} onChange={(e) => setH("referenceCode", e.target.value)} /></div>
                    <div>
                        <Label>Event Type</Label>
                        <Select value={header.eventType} onValueChange={(v) => setH("eventType", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div><Label>Base Currency</Label><Input value={header.baseCurrency} onChange={(e) => setH("baseCurrency", e.target.value)} /></div>
                    <div><Label>Global Baseline / TCO Budget</Label><Input type="number" value={header.globalBaseline} onChange={(e) => setH("globalBaseline", e.target.value)} /></div>
                    <div><Label>Stagger Interval (sec)</Label><Input type="number" value={header.staggerIntervalSec} onChange={(e) => setH("staggerIntervalSec", e.target.value)} /></div>
                    <div>
                        <Label>Masking</Label>
                        <Select value={header.maskingRule} onValueChange={(v) => setH("maskingRule", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="MASKED">Masked (Bidder N)</SelectItem><SelectItem value="OPEN">Open</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Default Visibility</Label>
                        <Select value={header.defaultVisibility} onValueChange={(v) => setH("defaultVisibility", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="RANK_ONLY">Rank only</SelectItem><SelectItem value="FULL">Show lead price</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2"><Label>Description</Label><Textarea value={header.description} onChange={(e) => setH("description", e.target.value)} /></div>
                </CardContent>
            </Card>

            {/* EMD */}
            <Card>
                <CardHeader><CardTitle className="text-base">EMD (Earnest Money Deposit)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 items-end">
                    <div className="flex items-center gap-3">
                        <Switch checked={header.emdRequired} onCheckedChange={(v) => setH("emdRequired", v)} />
                        <Label>EMD Required</Label>
                    </div>
                    <div />
                    {header.emdRequired && <>
                        <div>
                            <Label>Value Type</Label>
                            <Select value={header.emdValueType} onValueChange={(v) => setH("emdValueType", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="PERCENT">% of value</SelectItem><SelectItem value="FIXED">Fixed amount</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div><Label>EMD Value</Label><Input type="number" value={header.emdValue} onChange={(e) => setH("emdValue", e.target.value)} /></div>
                        <div>
                            <Label>Verification</Label>
                            <Select value={header.emdVerificationMode} onValueChange={(v) => setH("emdVerificationMode", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="MANUAL">Manual (admin approves)</SelectItem><SelectItem value="AUTO">Auto (gateway)</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </>}
                </CardContent>
            </Card>

            {/* Lots */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Lots</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setLots((l) => [...l, emptyLot()])} className="gap-1"><Plus className="h-4 w-4" /> Add Lot</Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {lots.map((l, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-3 relative">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-600">Lot {i + 1}</span>
                                {lots.length > 1 && <Button variant="ghost" size="icon" onClick={() => setLots((ls) => ls.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-2"><Label>Title</Label><Input value={l.title} onChange={(e) => setLot(i, "title", e.target.value)} placeholder="50,000 Microprocessors" /></div>
                                <div><Label>Quantity</Label><Input type="number" value={l.quantity} onChange={(e) => setLot(i, "quantity", e.target.value)} /></div>
                                <div><Label>UoM</Label><Input value={l.uom} onChange={(e) => setLot(i, "uom", e.target.value)} /></div>
                                <div><Label>Start Price</Label><Input type="number" value={l.startPrice} onChange={(e) => setLot(i, "startPrice", e.target.value)} /></div>
                                <div><Label>Reserve (hidden)</Label><Input type="number" value={l.reservePrice} onChange={(e) => setLot(i, "reservePrice", e.target.value)} /></div>
                                <div><Label>Min Decrement</Label><Input type="number" value={l.minDecrement} onChange={(e) => setLot(i, "minDecrement", e.target.value)} /></div>
                                <div>
                                    <Label>Decrement Type</Label>
                                    <Select value={l.decrementType} onValueChange={(v) => setLot(i, "decrementType", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="ABSOLUTE">Absolute</SelectItem><SelectItem value="PERCENTAGE">Percentage</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Bid Buffer</Label><Input type="number" value={l.bidBufferAmount} onChange={(e) => setLot(i, "bidBufferAmount", e.target.value)} /></div>
                                <div><Label>Max Seal %</Label><Input type="number" value={l.maxSealPct} onChange={(e) => setLot(i, "maxSealPct", e.target.value)} /></div>
                                <div><Label>Duration (sec)</Label><Input type="number" value={l.initialDurationSec} onChange={(e) => setLot(i, "initialDurationSec", e.target.value)} /></div>
                                <div><Label>Soft-Close Window (s)</Label><Input type="number" value={l.softCloseWindowSec} onChange={(e) => setLot(i, "softCloseWindowSec", e.target.value)} /></div>
                                <div><Label>Extension (s)</Label><Input type="number" value={l.extensionSec} onChange={(e) => setLot(i, "extensionSec", e.target.value)} /></div>
                                <div><Label>Max Extensions</Label><Input type="number" value={l.maxExtensions} onChange={(e) => setLot(i, "maxExtensions", e.target.value)} /></div>
                                <div>
                                    <Label>Extension Type</Label>
                                    <Select value={l.extensionType} onValueChange={(v) => setLot(i, "extensionType", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="ADD">Add time</SelectItem><SelectItem value="RESET">Reset clock</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Visibility</Label>
                                    <Select value={l.visibilityMode} onValueChange={(v) => setLot(i, "visibilityMode", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="RANK_ONLY">Rank only</SelectItem><SelectItem value="FULL">Show lead</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                {header.eventType === "DUTCH" && <>
                                    <div><Label>Dutch Drop Every (s)</Label><Input type="number" value={l.dutchStepSec} onChange={(e) => setLot(i, "dutchStepSec", e.target.value)} /></div>
                                    <div><Label>Dutch Price Step</Label><Input type="number" value={l.dutchStepAmount} onChange={(e) => setLot(i, "dutchStepAmount", e.target.value)} /></div>
                                </>}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Suppliers */}
            <Card>
                <CardHeader><CardTitle className="text-base">Supplier Whitelist</CardTitle></CardHeader>
                <CardContent>
                    <Label className="mb-1 block">Authorised suppliers</Label>
                    <SupplierMultiSelect value={supplierIds} onChange={setSupplierIds} />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pb-8">
                <Button variant="outline" disabled={saving} onClick={() => submit(false)}>Save Draft</Button>
                <Button disabled={saving} onClick={() => submit(true)} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Create & Schedule
                </Button>
            </div>
        </div>
    );
}
