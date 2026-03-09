'use client';

import { useAuthStore } from '@/store/auth-store';
import { ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAdmin, isLoading, user } = useAuthStore();

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#0A0F1C]">
                <Loader2 className="w-8 h-8 text-cyan-primary animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0A0F1C] p-8 text-center gap-8">
                <div className="w-24 h-24 rounded-full bg-red-400/10 flex items-center justify-center border border-red-400/20">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-3 max-w-md">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Unauthorized</h1>
                    <p className="text-text-muted">
                        This area is reserved for Circuito AI Administrators only. If you are an administrator, please ensure you are logged in with your official account.
                    </p>
                </div>
                <Link href="/" className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                    Back to Safety
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0F1C] text-white">
            <header className="h-20 border-b border-white/5 flex items-center px-8 bg-[#0D121F]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-ai/20 flex items-center justify-center border border-purple-ai/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                        <ShieldAlert className="w-5 h-5 text-purple-ai" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight uppercase">Admin Console</h1>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest opacity-60">Verification Control System</p>
                    </div>
                </div>
                <nav className="ml-12 flex items-center gap-8">
                    <Link href="/admin" className="text-[11px] font-black uppercase tracking-widest text-cyan-primary">Verification Flow</Link>
                    <Link href="/" className="text-[11px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors">Return to Site</Link>
                </nav>
                <div className="ml-auto flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[11px] font-bold text-white leading-none">{user?.email}</p>
                            <p className="text-[9px] font-black text-purple-ai uppercase tracking-tighter mt-1">Super Admin</p>
                        </div>
                        {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                            <img
                                src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                                className="w-10 h-10 rounded-full border border-white/10 object-cover"
                                alt="Admin"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full border border-white/10 bg-purple-ai/20 flex items-center justify-center text-purple-ai font-black text-xs uppercase">
                                {user?.email?.[0] || 'A'}
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <main className="p-8 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
}
