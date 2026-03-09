'use client';

import Link from 'next/link';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthCodeError() {
    return (
        <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[#0D121F] border border-white/10 rounded-[40px] p-10 text-center shadow-2xl relative overflow-hidden"
            >
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20" />

                <div className="space-y-8 relative z-10">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mx-auto">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Auth Link Invalid</h1>
                        <p className="text-text-muted text-sm leading-relaxed">
                            The authentication link has expired or is invalid. This can happen if the link was already used or if your session timed out.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="w-full h-14 flex items-center justify-center gap-2 rounded-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-primary transition-all active:scale-95 shadow-xl"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Return to Sign In
                    </Link>

                    <p className="text-[10px] text-text-muted/40 font-bold uppercase tracking-widest leading-loose">
                        If the issue persists, try clearing your browser cookies and signing in again.
                    </p>
                </div>
            </motion.div>

            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 blur-[100px] rounded-full" />
            </div>
        </div>
    );
}
