"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Loader2, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { getAwards, createContract, Award } from "@/lib/api/sourcing";

const fmt = (n: number | null | undefined, cur = "INR") =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur || "INR", maximumFractionDigits: 0 }).format(Number(n));

export default function BuyerAwardsPage() {
    const router = useRouter();
    const [awards, setAwards] = useState<Award[]>([]);
    const [loading, setLoading] = useState(true);
    const [sel, setSel] = useState<Award | null>(null);
    const [form, setForm] = useState({ title: "", startDate: "", endDate: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try { setAwards(await getAwards()); }
            catch { toast.error("Failed to load awards"); }
            finally { setLoading(false); }
        })();
    }, []);

    const openContract = (a: Award) => {
        setSel(a);
        setForm({ title: `${a.event_name} — ${a.supplier_name || "Supplier " + a.supplier_id}`, startDate: "", endDate: "" });
    };

    const submit = async () => {
        if (!sel) return;
        setSaving(true);
        try {
            await createContract({
                title: form.title, supplierId: sel.supplier_id, value: sel.value,
                currency: sel.currency, sourceType: sel.kind, sourceId: sel.source_id,
                startDate: form.startDate || undefined, endDate: form.endDate || undefined, status: "DRAFT",
            });
            toast.success("Contract created (draft)");
            setSel(null);
            router.push("/buyer/contracts");
        } catch (e: any) { toast.error(e?.response?.data?.error || "Failed to create contract"); }
        finally { setSaving(false); }
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg"><Trophy className="h-6 w-6 text-violet-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Award Decisions</h1>
                    <p className="text-muted-foreground">Awarded suppliers across RFPs and auctions.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                        awards.length === 0 ? <div className="py-24 text-center text-muted-foreground">No awards yet. Award an RFP or auction to see it here.</div> : (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Type</TableHead><TableHead>Event</TableHead><TableHead>Supplier</TableHead>
                                    <TableHead>Value</TableHead><TableHead>Allocation</TableHead><TableHead>Awarded</TableHead><TableHead /></TableRow></TableHeader>
                                <TableBody>
                                    {awards.map((a) => (
                                        <TableRow key={`${a.kind}-${a.id}`}>
                                            <TableCell><Badge variant="outline">{a.kind}</Badge></TableCell>
                                            <TableCell className="font-medium">{a.event_name}</TableCell>
                                            <TableCell>{a.supplier_name || (a.supplier_id ? `Supplier ${a.supplier_id}` : "—")}</TableCell>
                                            <TableCell className="font-mono">{fmt(a.value, a.currency)}</TableCell>
                                            <TableCell>{a.allocation_pct != null ? `${a.allocation_pct}%` : "—"}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" className="gap-1" onClick={() => openContract(a)}>
                                                    <FileSignature className="h-4 w-4" /> Create Contract
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                </CardContent>
            </Card>

            <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create Contract from Award</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                        <div className="text-sm text-muted-foreground">Supplier: {sel?.supplier_name || sel?.supplier_id} · Value: {fmt(sel?.value, sel?.currency)} · Source: {sel?.kind}</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                            <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSel(null)}>Cancel</Button>
                        <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
