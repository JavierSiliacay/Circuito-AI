'use client';

import { motion } from 'framer-motion';

export function BrandZap({ className = "w-4 h-4", glow = true }: { className?: string; glow?: boolean }) {
    return (
        <div className={`relative ${className} flex items-center justify-center`}>
            {glow && (
                <div className="absolute inset-0 bg-cyan-primary/40 blur-sm rounded-full animate-pulse-slow" />
            )}
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative z-10 w-full h-full"
            >
                <motion.path
                    d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                    stroke="url(#zap-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
                <defs>
                    <linearGradient id="zap-gradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#00D9FF" />
                        <stop offset="1" stopColor="#A855F7" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}
