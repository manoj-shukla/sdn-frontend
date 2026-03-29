"use client";

import * as React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ActionMenu({
    children,
    items,
}: {
    children: React.ReactNode;
    items: { label: string; onClick?: () => void; className?: string; "data-testid"?: string }[];
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {children}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {items.map((item, index) => (
                    <DropdownMenuItem
                        key={index}
                        onClick={item.onClick}
                        className={cn("cursor-pointer", item.className)}
                        data-testid={item["data-testid"]}
                    >
                        {item.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
