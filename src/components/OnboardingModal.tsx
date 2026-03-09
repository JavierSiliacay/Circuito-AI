'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Upload, Check, GraduationCap,
    Wrench, Car, Loader2, FileText,
    AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

export default function OnboardingModal() {
    const { user, profile, checkAuth } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [category, setCategory] = useState<'student' | 'enthusiast' | 'mechanic' | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Only show if user is logged in but profile hasn't been completed
    const needsOnboarding = user && (!profile?.category || profile.verification_status === null);

    if (!needsOnboarding) return null;

    const handleUpload = async () => {
        if (!category || !file) {
            setError('Please select a category and upload a document.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // 1. Upload file to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `verifications/${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('verification-docs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('verification-docs')
                .getPublicUrl(filePath);

            // 3. Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    category,
                    document_url: publicUrl,
                    verification_status: 'pending'
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(async () => {
                await checkAuth(); // Refetch profile to close modal
            }, 2000);

        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.message || 'Verification submission failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="w-full max-w-lg bg-[#0D121F] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                >
                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-4">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                                    Welcome to Circuito AI
                                </h2>
                                <div className="w-10 h-10 rounded-xl bg-cyan-primary/10 flex items-center justify-center border border-cyan-primary/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                                    <img src="/brand/master-logo.png" className="w-7 h-7 object-contain mix-blend-screen" alt="Logo" />
                                </div>
                            </div>
                            <p className="text-sm text-text-muted text-center">
                                Complete your verification to access specialized platform features.
                            </p>
                        </div>

                        {profile?.verification_status === 'rejected' ? (
                            <div className="py-8 flex flex-col items-center justify-center text-center gap-6">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
                                    <X className="w-8 h-8 text-red-500" />
                                </div>
                                <div className="space-y-4">
                                    <p className="text-lg font-black text-white uppercase tracking-tight">Registration Rejected</p>
                                    <p className="text-sm text-text-muted leading-relaxed">
                                        You didn't provide the required data or the admin didn't approve your registration request.
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        // Reset verification status in DB to allow re-submission
                                        await supabase
                                            .from('profiles')
                                            .update({ verification_status: null, category: null, document_url: null })
                                            .eq('id', user.id);
                                        await checkAuth();
                                    }}
                                    className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : success ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-green-success/10 flex items-center justify-center">
                                    <Check className="w-8 h-8 text-green-success" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-white uppercase">Submission Received</p>
                                    <p className="text-sm text-text-muted">An admin will review your document shortly.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Category Selection */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Select your category</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { id: 'student', label: 'USTP-COT Student', icon: GraduationCap, desc: 'Requires Certificate of Registration (COR)' },
                                            { id: 'enthusiast', label: 'Automotive Enthusiast', icon: Car, desc: 'Requires proof of automotive background' },
                                            { id: 'mechanic', label: 'Professional Mechanic', icon: Wrench, desc: 'Requires license or workshop ID' }
                                        ].map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setCategory(cat.id as any)}
                                                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${category === cat.id
                                                    ? 'bg-cyan-primary/10 border-cyan-primary text-white shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                                                    : 'bg-white/5 border-white/5 text-text-muted hover:border-white/20'}`}
                                            >
                                                <div className={`p-2 rounded-xl ${category === cat.id ? 'bg-cyan-primary text-black' : 'bg-white/5 text-white'}`}>
                                                    <cat.icon className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-sm uppercase tracking-tight">{cat.label}</p>
                                                    <p className="text-[10px] opacity-60 leading-tight">{cat.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Upload supporting document</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="verification-doc"
                                            className="hidden"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            accept=".pdf,.jpg,.jpeg,.png"
                                        />
                                        <label
                                            htmlFor="verification-doc"
                                            className={`flex items-center justify-between p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${file
                                                ? 'bg-green-success/5 border-green-success/20 text-green-success'
                                                : 'bg-white/5 border-white/10 text-text-muted hover:border-cyan-primary/40 hover:bg-cyan-primary/5'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {file ? <FileText className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                                <span className="text-xs font-bold truncate max-w-[200px]">
                                                    {file ? file.name : 'Select PDF or Image'}
                                                </span>
                                            </div>
                                            {file && <Check className="w-4 h-4" />}
                                        </label>
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 p-3 rounded-xl bg-red-400/10 border border-red-400/20">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <p className="text-[11px] font-bold">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleUpload}
                                    disabled={!category || !file || uploading}
                                    className="w-full py-4 rounded-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-primary transition-all shadow-xl shadow-white/5 disabled:opacity-30 flex items-center justify-center gap-2 group"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Verification'}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
