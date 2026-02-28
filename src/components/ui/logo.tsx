'use client';

import { motion } from 'framer-motion';

export function CircuitoLogo({ className = "w-10 h-10", glow = true }: { className?: string; glow?: boolean }) {
    return (
        <div className={`relative ${className} group cursor-pointer`}>
            {/* Ultra-Premium Background Glow */}
            {glow && (
                <div className="absolute inset-0 -m-4">
                    <motion.div
                        animate={{
                            opacity: [0.15, 0.45, 0.15],
                            scale: [0.95, 1.05, 0.95],
                            filter: ["blur(12px)", "blur(20px)", "blur(12px)"]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-full h-full bg-cyan-primary/30 rounded-full"
                    />
                </div>
            )}

            <div className="relative z-10 w-full h-full transform transition-transform group-hover:scale-110 duration-500">
                <img
                    src="/brand/circuito-ai-logo.png"
                    alt="Circuito AI"
                    className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                />
            </div>
        </div>
    );
}
