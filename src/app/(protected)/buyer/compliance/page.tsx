"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Loader2, Search, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";
import { getComplianceOverview, ComplianceOverview, ComplianceRow } from "@/lib/api/supplierCompliance";

const RISK: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
    unknown: "bg-slate-100 text-slate-600 border-slate-200",
};
const COMPLIANCE: Record<string, string> = {
    COMPLIANT: "bg-green-100 text-green-700 border-green-200",
    REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
    AT_RISK: "bg-red-100 text-red-700 border-red-200",
};

export default function BuyerCompliancePage() {
    const router = useRouter();
    const [data, setData] = useState<ComplianceOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");

    useEffect(() => {
        (async () => {
            try { setData(await getComplianceOverview()); }
            catch { toast.error("Failed to load compliance overview"); }
            finally { setLoading(false); }
        })();
    }, []);

    const rows: ComplianceRow[] = useMemo(() => {
        const list = data?.suppliers || [];
        return list.filter((r) => {
            const matchFilter = filter === "ALL" || r.compliance === filter;
            const matchSearch = !search || `${r.name} ${r.country}`.toLowerCase().includes(search.toLowerCase());
            return matchFilter && matchSearch;
        });
    }, [data, search, filter]);

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    const k = data?.kpis;

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><Shield className="h-6 w-6 text-red-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Risk & Compliance</h1>
                    <p className="text-muted-foreground">Supplier risk levels, document and certification compliance.</p>
                </div>
            </div>

            {k && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Suppliers</div><div className="text-2xl font-bold">{k.totalSuppliers}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">High Risk</div><div className="text-2xl font-bold text-red-600">{k.highRisk}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">At Risk</div><div className="text-2xl font-bold text-red-600">{k.atRisk}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Needs Review</div><div className="text-2xl font-bold text-amber-600">{k.needsReview}</div></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending Verifications</div><div className="text-2xl font-bold">{k.pendingVerifications}</div></CardContent></Card>
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Search supplier or country…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="AT_RISK">At Risk</SelectItem>
                        <SelectItem value="REVIEW">Needs Review</SelectItem>
                        <SelectItem value="COMPLIANT">Compliant</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    {rows.length === 0 ? <div className="py-24 text-center text-muted-foreground">No suppliers match.</div> : (
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Supplier</TableHead><TableHead>Country</TableHead><TableHead>Risk</TableHead>
                                <TableHead>Documents</TableHead><TableHead>Certifications</TableHead><TableHead>Compliance</TableHead><TableHead /></TableRow></TableHeader>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow key={r.supplierId} className="cursor-pointer" onClick={() => router.push(`/buyer/suppliers/${r.supplierId}`)}>
                                        <TableCell className="font-medium">{r.name}
                                            {r.issues.length > 0 && <div className="text-xs text-amber-600 mt-0.5">{r.issues.join(" · ")}</div>}
                                        </TableCell>
                                        <TableCell>{r.country}</TableCell>
                                        <TableCell><Badge variant="outline" className={RISK[String(r.riskLevel).toLowerCase()] || RISK.unknown}>{r.riskLevel}</Badge></TableCell>
                                        <TableCell className="text-sm">{r.documents.total} total{r.documents.expired ? <span className="text-red-600"> · {r.documents.expired} expired</span> : ""}{r.documents.pending ? <span className="text-amber-600"> · {r.documents.pending} pending</span> : ""}</TableCell>
                                        <TableCell className="text-sm">{r.certifications.total} total{r.certifications.expired ? <span className="text-red-600"> · {r.certifications.expired} expired</span> : ""}{r.certifications.expiring ? <span className="text-amber-600"> · {r.certifications.expiring} expiring</span> : ""}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={COMPLIANCE[r.compliance]}>
                                                {r.compliance === "COMPLIANT" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                                                {r.compliance.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right"><Eye className="h-4 w-4 text-muted-foreground inline" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
