'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import {
    ShieldCheck,
    X,
    Check,
    User,
    Clock,
    FileText,
    ExternalLink,
    AlertCircle,
    Activity,
    Monitor,
    Trash2,
    Ban,
    MessageSquare,
    ShieldAlert,
    RotateCcw,
    Search,
    StickyNote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    category: 'student' | 'enthusiast' | 'mechanic';
    verification_status: 'pending' | 'verified' | 'rejected' | 'banned' | 'deleted';
    has_ai_access: boolean;
    has_diag_access: boolean;
    document_url: string | null;
    warning_message: string | null;
    internal_notes: string | null;
    created_at: string;
}

export default function AdminPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [notesInput, setNotesInput] = useState('');

    const fetchProfiles = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setProfiles(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleUpdateAccess = async (profileId: string, updates: Partial<Profile>) => {
        setUpdating(profileId);
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profileId);

        if (error) {
            console.error('Update failed:', error);
            alert(`Error: ${error.message}`);
        } else {
            setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...updates } : p));
        }
        setUpdating(null);
    };

    const handleApprove = async (profile: Profile) => {
        // Default Logic based on category
        const updates: Partial<Profile> = {
            verification_status: 'verified',
            has_ai_access: profile.category === 'student',
            has_diag_access: profile.category === 'mechanic' || profile.category === 'enthusiast'
        };

        // If it's the "Both" document case, admin might manually adjust
        handleUpdateAccess(profile.id, updates);
    };

    const handleReject = async (profileId: string) => {
        const reason = window.prompt('Optional: Enter rejection reason (shows to user):', 'Your request has been rejected because you did not comply with the specific requirements or you are not qualified.');
        if (reason !== null) {
            handleUpdateAccess(profileId, {
                verification_status: 'rejected',
                has_ai_access: false,
                has_diag_access: false,
                warning_message: reason
            });
        }
    };

    const handleBan = async (profileId: string) => {
        const reason = window.prompt('Enter reason for BAN (shows to user):', 'Your access has been permanently revoked due to safety protocol violations.');
        if (reason !== null) {
            handleUpdateAccess(profileId, {
                verification_status: 'banned',
                has_ai_access: false,
                has_diag_access: false,
                warning_message: reason
            });
        }
    };

    const handleUnban = async (profileId: string) => {
        if (window.confirm('Restore access for this user?')) {
            handleUpdateAccess(profileId, { verification_status: 'verified', warning_message: null });
        }
    };

    const handleWarn = async (profileId: string) => {
        const msg = window.prompt('Enter warning message to show to the user:');
        if (msg !== null) {
            handleUpdateAccess(profileId, { warning_message: msg });
        }
    };

    const handleDeleteAccount = async (profileId: string) => {
        const reason = window.prompt('Enter reason for deletion/deactivation:', 'This account has been terminated and deleted from our active records.');
        if (reason !== null) {
            handleUpdateAccess(profileId, {
                verification_status: 'deleted',
                has_ai_access: false,
                has_diag_access: false,
                warning_message: reason
            });
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedProfile) return;
        await handleUpdateAccess(selectedProfile.id, { internal_notes: notesInput });
        setIsNotesModalOpen(false);
    };

    const filteredProfiles = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-12">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 rounded-[24px] bg-white/5 border border-white/5 space-y-2">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Pending Approvals</p>
                    <p className="text-3xl font-black text-white">{profiles.filter(p => p.verification_status === 'pending').length}</p>
                </div>
                <div className="p-6 rounded-[24px] bg-white/5 border border-white/5 space-y-2">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Verified Students</p>
                    <p className="text-3xl font-black text-cyan-primary">{profiles.filter(p => p.category === 'student' && p.verification_status === 'verified').length}</p>
                </div>
                <div className="p-6 rounded-[24px] bg-white/5 border border-white/5 space-y-2">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Verified Mechanics</p>
                    <p className="text-3xl font-black text-purple-ai">{profiles.filter(p => (p.category === 'mechanic' || p.category === 'enthusiast') && p.verification_status === 'verified').length}</p>
                </div>
                <div className="p-6 rounded-[24px] bg-white/5 border border-white/5 space-y-2">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Registrations</p>
                    <p className="text-3xl font-black text-white">{profiles.length}</p>
                </div>
            </div>

            {/* Verification Queue Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Clock className="w-6 h-6 text-cyan-primary" />
                        Verification Queue
                    </h2>
                    <button
                        onClick={fetchProfiles}
                        className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5"
                    >
                        <Activity className="w-4 h-4 text-text-muted" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence>
                        {profiles.filter(p => p.verification_status === 'pending').map((profile) => (
                            <motion.div
                                key={profile.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#0D121F] border border-white/10 rounded-[28px] p-6 flex flex-wrap items-center gap-8 group hover:border-cyan-primary/30 transition-all shadow-xl"
                            >
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} className="w-12 h-12 rounded-full border border-white/10 object-cover" alt="User" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-text-muted font-black text-sm uppercase">
                                            {profile.full_name?.[0] || profile.email?.[0] || 'U'}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-black text-white">{profile.full_name}</p>
                                        <p className="text-xs text-text-muted">{profile.email}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 w-full md:w-40">
                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Category</p>
                                    <p className={`text-xs font-bold uppercase tracking-tight ${profile.category === 'student' ? 'text-cyan-primary' : 'text-purple-ai'}`}>
                                        {profile.category}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Supporting Document</p>
                                    <a
                                        href={profile.document_url || '#'}
                                        target="_blank"
                                        className="flex items-center gap-2 text-xs font-bold text-white hover:text-cyan-primary transition-colors bg-white/5 p-2 rounded-xl group"
                                    >
                                        <FileText className="w-4 h-4 text-text-muted group-hover:text-cyan-primary" />
                                        View Attachment
                                        <ExternalLink className="w-3 h-3 ml-auto opacity-30" />
                                    </a>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => handleReject(profile.id)}
                                        className="h-12 w-12 flex items-center justify-center rounded-full bg-red-400/5 border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-all active:scale-95"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleApprove(profile)}
                                        className="h-12 px-8 flex items-center justify-center gap-2 rounded-full bg-green-500 text-black font-black text-xs uppercase tracking-widest hover:bg-cyan-primary transition-all active:scale-95 shadow-lg shadow-green-500/20"
                                    >
                                        <Check className="w-4 h-4" />
                                        Approve
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {profiles.filter(p => p.verification_status === 'pending').length === 0 && (
                        <div className="py-20 text-center space-y-4 bg-white/5 border border-white/5 border-dashed rounded-[32px] opacity-40">
                            <ShieldCheck className="w-12 h-12 mx-auto text-text-muted" />
                            <p className="text-xs font-black uppercase tracking-widest text-text-muted">Queue is Currently Empty</p>
                        </div>
                    )}
                </div>
            </div>

            {/* User Permissions Management */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <Monitor className="w-6 h-6 text-purple-ai" />
                    Platform Access Control
                </h2>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-cyan-primary/50 transition-all"
                    />
                </div>
            </div>

            <div className="bg-[#0D121F] border border-white/5 rounded-[32px] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest">User ID / Identity</th>
                            <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest">AI Agent Access</th>
                            <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest">Diagnostic Access</th>
                            <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest">Status</th>
                            <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-widest">Administrative Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredProfiles.filter(p => p.verification_status !== 'pending').map((profile) => (
                            <tr key={profile.id} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-white leading-none">{profile.full_name}</p>
                                            <p className="text-[10px] text-text-muted mt-1">{profile.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <button
                                        onClick={() => {
                                            const action = profile.has_ai_access ? 'Revoke' : 'Grant';
                                            if (window.confirm(`${action} AI Agent access for ${profile.full_name}?`)) {
                                                handleUpdateAccess(profile.id, { has_ai_access: !profile.has_ai_access });
                                            }
                                        }}
                                        disabled={updating === profile.id || profile.verification_status === 'banned'}
                                        className={`p-2 rounded-xl border transition-all ${profile.has_ai_access ? 'bg-cyan-primary/10 border-cyan-primary/20 text-cyan-primary' : 'bg-white/5 border-white/5 text-text-muted'} ${(updating === profile.id || profile.verification_status === 'banned') ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        {updating === profile.id ? (
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : profile.has_ai_access ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <X className="w-4 h-4" />
                                        )}
                                    </button>
                                </td>
                                <td className="p-5">
                                    <button
                                        onClick={() => {
                                            const action = profile.has_diag_access ? 'Revoke' : 'Grant';
                                            if (window.confirm(`${action} Diagnostic access for ${profile.full_name}?`)) {
                                                handleUpdateAccess(profile.id, { has_diag_access: !profile.has_diag_access });
                                            }
                                        }}
                                        disabled={updating === profile.id || profile.verification_status === 'banned'}
                                        className={`p-2 rounded-xl border transition-all ${profile.has_diag_access ? 'bg-purple-ai/10 border-purple-ai/20 text-purple-ai' : 'bg-white/5 border-white/5 text-text-muted'} ${(updating === profile.id || profile.verification_status === 'banned') ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        {updating === profile.id ? (
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : profile.has_diag_access ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <X className="w-4 h-4" />
                                        )}
                                    </button>
                                </td>
                                <td className="p-5">
                                    <div className="flex flex-col gap-1.5">
                                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-center ${profile.verification_status === 'verified' ? 'bg-green-success/10 text-green-success' :
                                            profile.verification_status === 'banned' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
                                                profile.verification_status === 'deleted' ? 'bg-white/10 text-white/40' :
                                                    'bg-red-500/10 text-red-500'
                                            }`}>
                                            {profile.verification_status}
                                        </span>
                                        {profile.warning_message && profile.verification_status === 'verified' && (
                                            <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter opacity-80 flex items-center gap-1">
                                                <AlertCircle className="w-2.5 h-2.5" />
                                                Warning Sent
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2">
                                        {(profile.verification_status === 'verified' || profile.verification_status === 'rejected') && (
                                            <button
                                                onClick={() => handleWarn(profile.id)}
                                                title="Warn User"
                                                className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20 transition-all"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </button>
                                        )}

                                        {(profile.verification_status === 'banned' || profile.verification_status === 'deleted') ? (
                                            <button
                                                onClick={() => handleUnban(profile.id)}
                                                title="Restore User"
                                                className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 transition-all"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleBan(profile.id)}
                                                title="Ban User"
                                                className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        )}

                                        {profile.verification_status !== 'deleted' && (
                                            <button
                                                onClick={() => handleDeleteAccount(profile.id)}
                                                title="Mark as Deleted"
                                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                setSelectedProfile(profile);
                                                setNotesInput(profile.internal_notes || '');
                                                setIsNotesModalOpen(true);
                                            }}
                                            title="Admin Notes"
                                            className={`p-2 rounded-lg border transition-all ${profile.internal_notes ? 'bg-cyan-primary/20 border-cyan-primary/30 text-cyan-primary' : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'}`}
                                        >
                                            <StickyNote className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredProfiles.filter(p => p.verification_status !== 'pending').length === 0 && (
                    <div className="py-20 text-center text-text-muted">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">No users found matching "{searchTerm}"</p>
                    </div>
                )}
            </div>

            {/* Notes Modal */}
            <AnimatePresence>
                {isNotesModalOpen && selectedProfile && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsNotesModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-[#0D121F] border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                        <StickyNote className="w-6 h-6 text-cyan-primary" />
                                        Internal Notes
                                    </h3>
                                    <button
                                        onClick={() => setIsNotesModalOpen(false)}
                                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-text-muted" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm font-black text-white">{selectedProfile?.full_name}</p>
                                        <p className="text-xs text-text-muted">{selectedProfile?.email}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Administrative Remarks</label>
                                        <textarea
                                            value={notesInput}
                                            onChange={(e) => setNotesInput(e.target.value)}
                                            placeholder="Add internal notes about this user (only visible to admins)..."
                                            className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-cyan-primary/50 transition-all resize-none custom-scrollbar"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsNotesModalOpen(false)}
                                        className="flex-1 h-12 rounded-2xl bg-white/5 text-text-primary font-bold text-sm hover:bg-white/10 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveNotes}
                                        disabled={updating === selectedProfile?.id}
                                        className="flex-[2] h-12 rounded-2xl bg-cyan-primary text-black font-black text-xs uppercase tracking-widest hover:bg-cyan-primary/80 transition-all disabled:opacity-50"
                                    >
                                        {updating === selectedProfile?.id ? 'Saving...' : 'Save Notes'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
