'use client';

import { motion } from 'framer-motion';

export function BrandBot({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <div className={`relative ${className} flex items-center justify-center`}>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                {/* Robot Head Shape */}
                <rect
                    x="4"
                    y="6"
                    width="16"
                    height="12"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {/* Antennas */}
                <path
                    d="M9 6V3M15 6V3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {/* Glowing Eyes */}
                <motion.circle
                    cx="9"
                    cy="12"
                    r="1.5"
                    fill="#00D9FF"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.circle
                    cx="15"
                    cy="12"
                    r="1.5"
                    fill="#00D9FF"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />

                {/* Circuit Trace Mouth */}
                <path
                    d="M8 15H16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="opacity-40"
                />

                {/* Sparkle/AI indicator */}
                <motion.path
                    d="M19 5L21 7M21 5L19 7"
                    stroke="#A855F7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            </svg>
        </div>
    );
}
