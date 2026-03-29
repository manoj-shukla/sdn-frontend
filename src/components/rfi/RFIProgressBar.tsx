"use client";

import { cn } from "@/lib/utils";

interface Props {
    percent: number;
    showLabel?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function RFIProgressBar({ percent, showLabel = true, size = "md", className }: Props) {
    const clamped = Math.min(100, Math.max(0, percent));
    const color =
        clamped === 100
            ? "bg-green-500"
            : clamped >= 50
            ? "bg-blue-500"
            : "bg-amber-500";

    const heights: Record<string, string> = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className={cn("flex-1 bg-slate-200 rounded-full overflow-hidden", heights[size])}>
                <div
                    className={cn("h-full rounded-full transition-all duration-300", color)}
                    style={{ width: `${clamped}%` }}
                />
            </div>
            {showLabel && (
                <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                    {clamped}%
                </span>
            )}
        </div>
    );
}
