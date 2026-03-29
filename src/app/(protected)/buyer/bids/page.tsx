"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Construction } from "lucide-react";

export default function BuyerBidsPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-8 p-4 bg-[#f8fafc] min-h-screen">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart className="h-6 w-6 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Bid Analysis</h1>
                </div>
                <p className="text-muted-foreground ml-11">Compare and analyze supplier responses side-by-side.</p>
            </div>

            <Card className="border-2 border-dashed border-slate-200 bg-white/50">
                <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Construction className="h-10 w-10 text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-700 mb-2">Coming Soon</h2>
                    <p className="text-slate-500 max-w-md">
                        The Bid Analysis module is under development. It will provide advanced comparison matrices and automated scoring for supplier bids.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
