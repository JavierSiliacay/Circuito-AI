'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Key, Globe, Layout, Smartphone, Cpu, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { MAINTENANCE_CONFIG } from '@/lib/maintenance-config';

/**
 * Circuito AI — Global Maintenance Mode Wrapper
 * When enabled, displays a full-screen notice with authorized credentials bypass.
 */
export default function MaintenanceMode({ children }: { children: React.ReactNode }) {
    const [isBypassed, setIsBypassed] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Initial session check
    useEffect(() => {
        const checkBypass = () => {
            const savedBypass = localStorage.getItem(MAINTENANCE_CONFIG.sessionKey);
            if (savedBypass === 'true') {
                setIsBypassed(true);
            }
            setIsLoading(false);
        };
        checkBypass();
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (
            username === MAINTENANCE_CONFIG.auth.username &&
            password === MAINTENANCE_CONFIG.auth.password
        ) {
            localStorage.setItem(MAINTENANCE_CONFIG.sessionKey, 'true');
            setIsBypassed(true);
        } else {
            setError('Invalid credentials. Access denied.');
            setPassword('');
        }
    };

    // If maintenance mode is disabled OR the user has bypassed it, show the application
    if (!MAINTENANCE_CONFIG.isEnabled || isBypassed) {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-[#0A0F1C] flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-cyan-primary/20 border-t-cyan-primary animate-spin rounded-full" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[99999] bg-[#0A0F1C] text-text-primary overflow-hidden font-inter selection:bg-cyan-primary/30">
            {/* Background Decor */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-purple-ai/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
                <AnimatePresence mode="wait">
                    {!showLogin ? (
                        <motion.div
                            key="maintenance-view"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="max-w-2xl w-full"
                        >
                            <div className="relative mb-12 group">
                                <div className="absolute inset-0 bg-cyan-primary/20 blur-[80px] rounded-full group-hover:bg-cyan-primary/30 transition-all duration-700" />
                                <div className="w-32 h-32 flex items-center justify-center mx-auto relative z-10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                                    <img src="/brand/master-logo.png" alt="Circuito AI" className="w-full h-full object-contain mix-blend-screen" />
                                </div>
                                <div className="absolute -bottom-2 right-1/2 translate-x-[60px] w-12 h-12 rounded-2xl bg-[#161F36] border border-white/10 flex items-center justify-center shadow-2xl z-20">
                                    <ShieldAlert className="w-6 h-6 text-yellow-500 animate-pulse" />
                                </div>
                            </div>

                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter leading-tight"
                            >
                                Circuito AI<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-primary via-blue-400 to-purple-ai">
                                    currently under maintenance.
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-text-muted mb-12 max-w-lg mx-auto leading-relaxed font-medium"
                            >
                                We're upgrading our hardware intelligence core to provide a more powerful architecting experience.
                                Estimated time for link restoration: <span className="text-cyan-primary font-bold">3-4 days</span>.
                                <br />
                                <span className="inline-block mt-4 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] border-t border-white/5 pt-4">
                                    - Javier G. Siliacay / The Creator
                                </span>
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col items-center gap-5 mb-16"
                            >
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                    <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                                        <CheckCircle2 className="w-5 h-5 text-green-success" />
                                        <span className="text-sm font-bold text-white/80 tracking-tight uppercase">Database Secure</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                                        <CheckCircle2 className="w-5 h-5 text-green-success" />
                                        <span className="text-sm font-bold text-white/80 tracking-tight uppercase">Assets Safe</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowLogin(true)}
                                    className="inline-flex items-center gap-2.5 text-[11px] font-black tracking-[0.2em] text-text-muted/60 hover:text-cyan-primary uppercase transition-all group pt-2"
                                >
                                    <Lock className="w-4 h-4 transition-transform group-hover:scale-110" />
                                    AUTHORIZED ACCESS OVERRIDE
                                </button>
                            </motion.div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="login-view"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#161F36]/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 w-full max-w-md shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                        >
                            <div className="text-center mb-10">
                                <div className="w-16 h-16 bg-cyan-primary/10 rounded-2xl flex items-center justify-center border border-cyan-primary/20 mx-auto mb-6">
                                    <Lock className="w-8 h-8 text-cyan-primary" />
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Bypass System</h2>
                                <p className="text-[12px] text-text-muted font-bold tracking-widest uppercase mt-2">Enter Authorized Credentials</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-1">Username</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted group-focus-within:text-cyan-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="System identifier"
                                            required
                                            className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 outline-none text-white placeholder:text-white/10 focus:border-cyan-primary/50 focus:shadow-[0_0_20px_rgba(0,217,255,0.05)] transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-1">Access Key</label>
                                    <div className="relative group">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted group-focus-within:text-cyan-primary transition-colors" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••••••"
                                            required
                                            className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 outline-none text-white placeholder:text-white/10 focus:border-cyan-primary/50 focus:shadow-[0_0_20px_rgba(0,217,255,0.05)] transition-all"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-[12px] font-bold text-red-400 bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20 text-center"
                                    >
                                        {error}
                                    </motion.p>
                                )}

                                <div className="flex flex-col gap-4 pt-4">
                                    <button
                                        type="submit"
                                        className="w-full h-14 bg-gradient-to-br from-cyan-primary to-blue-600 hover:scale-105 active:scale-95 text-[#0A0F1C] font-black tracking-widest uppercase transition-all rounded-2xl shadow-lg shadow-cyan-primary/20"
                                    >
                                        ESTABLISH UPLINK
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowLogin(false)}
                                        className="w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-text-muted hover:text-white font-bold tracking-widest uppercase transition-all rounded-2xl"
                                    >
                                        Return to Surface
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer status */}
                <div className="fixed bottom-10 left-0 right-0 pointer-events-none">
                    <div className="flex justify-center gap-8 text-[10px] font-black text-white/20 tracking-[0.4em] uppercase">
                        <span className="flex items-center gap-2"><Globe className="w-3 h-3" /> Global Shield</span>
                        <span className="flex items-center gap-2"><Cpu className="w-3 h-3" /> Link Processing</span>
                        <span className="flex items-center gap-2"><Layout className="w-3 h-3" /> UI Re-mapping</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
