"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface Handlers {
    onBid?: (p: any) => void;
    onTimer?: (p: any) => void;
    onCascade?: (p: any) => void;
    onLotClosed?: (p: any) => void;
    onAuctionClosed?: (p: any) => void;
    onPriceDrop?: (p: any) => void;
    /** Called on every poll tick when the socket is NOT connected (REST fallback). */
    poll?: () => void;
    pollIntervalMs?: number;
}

/**
 * Connects to the auction Socket.io room and forwards events to handlers.
 * If the socket cannot connect (e.g. serverless backend), it transparently
 * falls back to periodic REST polling via the `poll` handler.
 */
export function useAuctionSocket(auctionId: string | undefined, handlers: Handlers) {
    const [connected, setConnected] = useState(false);
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        if (!auctionId || typeof window === "undefined") return;
        const token = localStorage.getItem("token");
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

        let pollTimer: any = null;
        let pingTimer: any = null;
        const interval = handlersRef.current.pollIntervalMs || 2000;

        const startPolling = () => {
            if (pollTimer) return;
            pollTimer = setInterval(() => handlersRef.current.poll?.(), interval);
        };
        const stopPolling = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };

        const socket = io(base, {
            path: "/socket.io",
            auth: { token },
            transports: ["websocket", "polling"],
            reconnectionAttempts: 3,
            timeout: 4000,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
            stopPolling();
            socket.emit("auction:join", { auctionId });
            // latency probe
            pingTimer = setInterval(() => {
                const t0 = Date.now();
                socket.emit("latency:ping", t0, () => setLatencyMs(Date.now() - t0));
            }, 5000);
        });

        const fail = () => { setConnected(false); startPolling(); };
        socket.on("connect_error", fail);
        socket.on("disconnect", fail);

        socket.on("bid:new", (p) => handlersRef.current.onBid?.(p));
        socket.on("timer:extended", (p) => handlersRef.current.onTimer?.(p));
        socket.on("lots:cascaded", (p) => handlersRef.current.onCascade?.(p));
        socket.on("lot:closed", (p) => handlersRef.current.onLotClosed?.(p));
        socket.on("auction:closed", (p) => handlersRef.current.onAuctionClosed?.(p));
        socket.on("price:drop", (p) => handlersRef.current.onPriceDrop?.(p));

        // Safety net: if we don't connect quickly, poll meanwhile.
        const connectGuard = setTimeout(() => { if (!socket.connected) startPolling(); }, 4500);

        return () => {
            clearTimeout(connectGuard);
            if (pingTimer) clearInterval(pingTimer);
            stopPolling();
            socket.emit("auction:leave", { auctionId });
            socket.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auctionId]);

    const bidViaSocket = useCallback((lotId: string, amount: number, latency?: number) => {
        return new Promise<any>((resolve) => {
            const s = socketRef.current;
            if (!s || !s.connected) return resolve({ ok: false, error: "not-connected" });
            s.emit("bid", { auctionId, lotId, amount, latencyMs: latency }, (ack: any) => resolve(ack));
        });
    }, [auctionId]);

    return { connected, latencyMs, bidViaSocket };
}
