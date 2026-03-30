"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TabsProps {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    className?: string;
    children: React.ReactNode;
}

const TabsContext = React.createContext<{
    activeTab: string;
    setActiveTab: (value: string) => void;
} | null>(null);

export function Tabs({ defaultValue, value, onValueChange, className, children }: TabsProps) {
    const [internalValue, setInternalValue] = React.useState(defaultValue || value || "");

    // Use controlled value if provided, otherwise use internal state
    const activeTab = value !== undefined ? value : internalValue;

    const setActiveTab = (newValue: string) => {
        if (onValueChange) {
            onValueChange(newValue);
        } else {
            setInternalValue(newValue);
        }
    };

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={cn(className)}>{children}</div>
        </TabsContext.Provider>
    );
}

export function TabsList({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div
            role="tablist"
            className={cn(
                "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
                className
            )}
        >
            {children}
        </div>
    );
}

export function TabsTrigger({ value, className, children, ...props }: { value: string, className?: string, children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsTrigger must be used within Tabs");

    const isActive = context.activeTab === value;

    return (
        <button
            role="tab"
            aria-selected={isActive}
            data-state={isActive ? "active" : "inactive"}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive && "bg-background text-foreground shadow-sm",
                className
            )}
            onClick={() => context.setActiveTab(value)}
            {...props}
        >
            {children}
        </button>
    );
}

export function TabsContent({ value, className, children }: { value: string, className?: string, children: React.ReactNode }) {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsContent must be used within Tabs");

    if (context.activeTab !== value) return null;

    return (
        <div
            role="tabpanel"
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
        >
            {children}
        </div>
    );
}
