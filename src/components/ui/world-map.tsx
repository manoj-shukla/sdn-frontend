"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function WorldMap({ className }: { className?: string }) {
    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            <div className="absolute inset-0 mix-blend-multiply opacity-5">
                <Image
                    src="/images/solid-map.png"
                    alt="World Map"
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            <svg
                viewBox="0 0 1000 500"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 h-full w-full pointer-events-none z-0"
                style={{ filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))" }}
            >
                {/* Animated Dots/Connections 
                    Assuming standard Equirectangular projection roughly mapped to 1000x500
                    NY: ~290, 160
                    London: ~500, 130
                    Tokyo: ~850, 170
                */}

                {/* Dot 1: North America */}
                <motion.circle
                    cx="290"
                    cy="160"
                    r="3"
                    className="fill-white"
                    animate={{
                        r: [3, 8, 3],
                        opacity: [0.5, 1, 0.5],
                        filter: ["drop-shadow(0 0 2px rgba(255,255,255,0.8))", "drop-shadow(0 0 6px rgba(255,255,255,1))", "drop-shadow(0 0 2px rgba(255,255,255,0.8))"]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Dot 2: Europe */}
                <motion.circle
                    cx="500"
                    cy="130"
                    r="3"
                    className="fill-white"
                    animate={{
                        r: [3, 6, 3],
                        opacity: [0.5, 1, 0.5],
                        filter: ["drop-shadow(0 0 2px rgba(255,255,255,0.8))", "drop-shadow(0 0 6px rgba(255,255,255,1))", "drop-shadow(0 0 2px rgba(255,255,255,0.8))"]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                    }}
                />

                {/* Dot 3: Asia */}
                <motion.circle
                    cx="850"
                    cy="170"
                    r="3"
                    className="fill-white"
                    animate={{
                        r: [3, 7, 3],
                        opacity: [0.5, 1, 0.5],
                        filter: ["drop-shadow(0 0 2px rgba(255,255,255,0.8))", "drop-shadow(0 0 6px rgba(255,255,255,1))", "drop-shadow(0 0 2px rgba(255,255,255,0.8))"]
                    }}
                    transition={{
                        duration: 3.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                    }}
                />

                {/* Connecting lines - Shiny Silver/Grey */}
                <motion.path
                    d="M290 160 Q 395 80 500 130"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    animate={{
                        strokeDashoffset: [0, -8],
                        opacity: [0.2, 0.6, 0.2]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
                <motion.path
                    d="M500 130 Q 675 100 850 170"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    animate={{
                        strokeDashoffset: [0, -8],
                        opacity: [0.2, 0.6, 0.2]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 1.5
                    }}
                />

            </svg>
        </div>
    );
}
