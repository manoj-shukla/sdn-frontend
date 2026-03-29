"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { GripVertical } from "lucide-react";

import { useAuthStore } from "@/lib/store/auth-store";

interface DraggableDevToolProps {
    title: string;
    children: React.ReactNode;
    defaultPosition?: { x: number; y: number };
}

export function DraggableDevTool({ title, children, defaultPosition }: DraggableDevToolProps) {
    const { user } = useAuthStore();
    const searchParams = useSearchParams();
    const modeParam = searchParams.get("mode");
    const [isSandbox, setIsSandbox] = useState(false);

    // Persist sandbox mode
    useEffect(() => {
        if (typeof window === "undefined") return;

        if (modeParam === "sandbox") {
            setIsSandbox(true);
            localStorage.setItem("sandbox-mode", "true");
        } else if (modeParam === "off") {
            setIsSandbox(false);
            localStorage.removeItem("sandbox-mode");
        } else {
            // Check storage if no param
            const stored = localStorage.getItem("sandbox-mode") === "true";
            setIsSandbox(stored);
        }
    }, [modeParam]);

    // Default to center-left if no position is provided
    const [position, setPosition] = useState<{ x: number; y: number }>(
        defaultPosition || { x: 16, y: 300 }
    );
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);

    // Load saved position on mount and handle layout
    useEffect(() => {
        if (typeof window === "undefined") return;

        const storageKey = `dev-tool-pos-bottom-${title}`; // New key for bottom-based pos
        const saved = localStorage.getItem(storageKey);

        const boxWidth = 224; // w-56
        const boxHeight = 160;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let targetPos: { x: number; y: number };

        // For very small screens, always bottom-left
        if (screenWidth < 400) {
            targetPos = { x: 8, y: 16 };
        } else if (saved) {
            try {
                targetPos = JSON.parse(saved);
            } catch (e) {
                targetPos = defaultPosition || { x: 16, y: 16 };
            }
        } else if (defaultPosition) {
            targetPos = defaultPosition;
        } else {
            targetPos = { x: 16, y: 16 };
        }

        // AGGRESSIVE CLAMPING: Box must be 100% visible
        const safeX = Math.max(8, Math.min(targetPos.x, screenWidth - boxWidth - 8));
        const safeY = Math.max(8, Math.min(targetPos.y, screenHeight - boxHeight - 8));

        const finalPos = { x: safeX, y: safeY };
        setPosition(finalPos);

        if (!saved && screenWidth >= 400) {
            localStorage.setItem(storageKey, JSON.stringify(finalPos));
        }
    }, [title, defaultPosition]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent text selection
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        startPosRef.current = { ...position };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragStartRef.current || !startPosRef.current) return;

            const dx = e.clientX - dragStartRef.current.x;
            // For bottom positioning, moving mouse down (increasing e.clientY) 
            // decreases the bottom value (y).
            const dy = dragStartRef.current.y - e.clientY;

            const newPos = {
                x: startPosRef.current.x + dx,
                y: startPosRef.current.y + dy
            };

            setPosition(newPos);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                // Save position
                localStorage.setItem(`dev-tool-pos-bottom-${title}`, JSON.stringify(position));
            }
        };

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, position, title]);

    // Strict server-side control:
    // Only show if user has the flag enabled from backend
    // Since internal users might have 'ADMIN' role instead of strictly 'BUYER', 
    // we rely on the `isSandboxActive` flag which is securely passed from the backend.
    if (!user?.isSandboxActive) return null;

    return (
        <div
            data-testid="sandbox-tool"
            className="fixed bg-background border p-4 rounded-lg shadow-2xl z-[9999] text-xs w-56 max-w-[calc(100vw-16px)] flex flex-col gap-2 ring-1 ring-border/50 transition-shadow duration-200 overflow-hidden"
            style={{
                left: `${position.x}px`,
                bottom: `${position.y}px`,
                boxShadow: isDragging ? "0 25px 50px -12px rgba(0, 0, 0, 0.4)" : undefined,
            }}
        >
            <div
                className="font-bold border-b pb-2 mb-1 bg-muted/50 -mx-4 -mt-4 p-2 rounded-t-lg flex items-center justify-between cursor-grab active:cursor-grabbing select-none group"
                onMouseDown={handleMouseDown}
                title="Drag to move"
            >
                <span className="text-foreground/80">{title}</span>
                <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            {children}
        </div>
    );
}
