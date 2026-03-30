"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import { TemplateBuilder } from "@/components/rfi/TemplateBuilder";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { RFITemplate } from "@/types/rfi";

export default function BuyerRFITemplateEditPage() {
    const { id } = useParams<{ id: string }>();
    const [template, setTemplate] = useState<RFITemplate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get(`/api/rfi/templates/${id}`) as any;
                setTemplate(res);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load template");
            } finally {
                setLoading(false);
            }
        };
        fetchTemplate();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!template) {
        return (
            <div className="flex items-center justify-center py-32">
                <p className="text-muted-foreground">Template not found.</p>
            </div>
        );
    }

    return <TemplateBuilder mode="edit" initial={template} />;
}
