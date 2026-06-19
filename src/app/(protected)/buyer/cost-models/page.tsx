"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Loader2, Copy, FileBox, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { listCostModels, cloneCostModel, CostModel } from "@/lib/api/costModels";

export default function CostModelsPage() {
    const router = useRouter();
    const [models, setModels] = useState<CostModel[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try { setLoading(true); setModels(await listCostModels()); }
        catch { toast.error("Failed to load cost models"); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const clone = async (id: string) => {
        try { const m = await cloneCostModel(id); toast.success("Template cloned"); router.push(`/buyer/cost-models/${m.model_id}`); }
        catch { toast.error("Clone failed"); }
    };

    const templates = models.filter((m) => m.is_template);
    const mine = models.filter((m) => !m.is_template);

    const Grid = ({ items, template }: { items: CostModel[]; template?: boolean }) => (
        <div className="grid grid-cols-3 gap-4">
            {items.map((m) => (
                <Card key={m.model_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="p-2 bg-indigo-100 rounded-lg"><FileBox className="h-5 w-5 text-indigo-600" /></div>
                            {template && <Badge variant="outline" className="bg-slate-100">Template</Badge>}
                        </div>
                        <div>
                            <div className="font-semibold text-slate-800">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.category}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{m.variable_count ?? 0} variables · {m.formula_count ?? 0} formulas</div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => router.push(`/buyer/cost-models/${m.model_id}`)}>
                                <Calculator className="h-4 w-4" /> Open
                            </Button>
                            {template && <Button size="sm" variant="ghost" onClick={() => clone(m.model_id)}><Copy className="h-4 w-4" /></Button>}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg"><Calculator className="h-6 w-6 text-indigo-600" /></div>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b]">Should-Cost Models</h1>
                    <p className="text-muted-foreground">Build cost models and benchmark supplier quotes.</p>
                </div>
            </div>

            {loading ? <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
                <>
                    {mine.length > 0 && <>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">My Models</h2>
                        <Grid items={mine} />
                    </>}
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">Templates <ArrowRight className="h-3 w-3" /> <span className="font-normal normal-case text-muted-foreground">clone to customise</span></h2>
                    <Grid items={templates} template />
                </>
            )}
        </div>
    );
}
