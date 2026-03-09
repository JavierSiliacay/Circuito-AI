'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShieldCheck, Mail, Ban, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

export default function AuthOverlay() {
    const { user, profile, isLoading, signOut, clearWarning } = useAuthStore();

    // 1. Loading state handled by Providers/Layout usually, but safe to check here
    if (isLoading) return null;

    // 2. Handle Banned Users
    if (user && profile?.verification_status === 'banned') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0A0F1C] p-4">
                <div className="absolute inset-0 bg-red-500/5 blur-[120px]" />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-md bg-[#0D121F] border border-red-500/20 rounded-[40px] p-10 text-center space-y-8 shadow-[0_0_50px_rgba(239,68,68,0.1)]"
                >
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mx-auto">
                        <Ban className="w-10 h-10 text-red-500" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Account Banned</h2>
                        <p className="text-sm text-text-muted leading-relaxed">
                            Your access to Circuito AI has been permanently revoked by an administrator due to a violation of our safety protocols or terms of service.
                        </p>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="w-full py-4 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-white/5"
                    >
                        Sign Out
                    </button>
                </motion.div>
            </div>
        );
    }

    // 3. Handle Warning Messages
    if (user && profile?.warning_message) {
        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-full max-w-md bg-[#0D121F] border border-yellow-500/30 rounded-[32px] p-8 space-y-6 shadow-2xl"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                            <AlertTriangle className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">System Warning</h3>
                            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Administrative Notice</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-sm text-text-muted leading-relaxed italic">
                            "{profile.warning_message}"
                        </p>
                    </div>

                    <p className="text-[11px] text-text-muted/60 text-center px-4">
                        Please acknowledge this notice to continue using the platform. Further violations may result in account restriction.
                    </p>

                    <button
                        onClick={() => clearWarning()}
                        className="w-full py-4 rounded-full bg-yellow-500 text-black font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Acknowledge Notice
                    </button>
                </motion.div>
            </div>
        );
    }

    // 4. Handle Not Logged In (Default Login Screen)
    if (user) return null;

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            }
        });
        if (error) console.error('Login failed:', error);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0A0F1C]/95 backdrop-blur-2xl p-4 overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-primary/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg bg-[#0D121F] border border-white/10 rounded-[40px] p-8 md:p-12 relative z-10 shadow-2xl overflow-hidden group"
            >
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-700">
                    <Sparkles className="w-32 h-32 text-cyan-primary" />
                </div>

                <div className="space-y-10">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-[20px] bg-cyan-primary/10 flex items-center justify-center border border-cyan-primary/20 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                            <img src="/brand/master-logo.png" className="w-10 h-10 object-contain mix-blend-screen" alt="Logo" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                                Circuito AI
                            </h2>
                            <p className="text-sm text-text-muted leading-relaxed max-w-sm mx-auto">
                                Sign in to access Circuito AI's neural engine, specialized diagnostic tools, and cloud-synced hardware projects.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={signInWithGoogle}
                            className="w-full h-14 flex items-center justify-center gap-4 rounded-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-primary transition-all shadow-xl shadow-white/5 group active:scale-95"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </button>

                        <div className="flex items-center justify-center gap-2 py-4">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-success/60" />
                            <span className="text-[10px] font-black text-text-muted/60 uppercase tracking-widest">
                                Encrypted & Identity Verified
                            </span>
                        </div>
                    </div>

                    <p className="text-[10px] text-center text-text-muted/40 font-medium px-4">
                        By signing in, you agree to comply with professional diagnostic safety protocols and hardware development standards.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
