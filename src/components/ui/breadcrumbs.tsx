"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
    const pathname = usePathname();
    // Simple Breadcrumbs logic
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center text-sm text-muted-foreground">
            <ol className="flex items-center gap-2">
                <li>
                    <Link href="/" className="flex items-center hover:text-foreground transition-colors">
                        <Home className="h-4 w-4" />
                    </Link>
                </li>
                {segments.map((segment, index) => {
                    const href = `/${segments.slice(0, index + 1).join("/")}`;
                    const isLast = index === segments.length - 1;

                    return (
                        <li key={index} className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                            {isLast ? (
                                <span className="capitalize font-medium text-foreground">{segment}</span>
                            ) : (
                                <Link
                                    href={href}
                                    className="capitalize hover:text-foreground transition-colors"
                                >
                                    {segment}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
