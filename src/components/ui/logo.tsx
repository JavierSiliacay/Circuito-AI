'use client';

import { motion } from 'framer-motion';

export function CircuitoLogo({ className = "w-10 h-10", glow = true }: { className?: string; glow?: boolean }) {
    return (
        <div className={`relative ${className} group cursor-pointer`}>
            {/* Ultra-Premium Background Glow */}
            {glow && (
                <div className="absolute inset-0 -m-2">
                    <motion.div
                        animate={{
                            opacity: [0.1, 0.3, 0.1],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-full h-full bg-cyan-primary/20 blur-xl rounded-full"
                    />
                </div>
            )}

            <div className="relative z-10 w-full h-full">
                <img
                    src="/brand/master-logo.png"
                    alt="Circuito AI"
                    className="w-full h-full object-contain mix-blend-screen"
                />
            </div>
        </div>
    );
}
