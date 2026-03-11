'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { MessageSquare, X, Send, User, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    sender_id: string;
    content: string;
    is_ai_response: boolean;
    created_at: string;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const { user, isAdmin, profile } = useAuthStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 1. Core safety check
    if (!isMounted || isAdmin || !user) return null;

    // 2. Logic to determine status
    const isApproved = profile?.verification_status === 'verified';
    const isPending = profile?.verification_status === 'pending';
    const isForbidden = profile?.verification_status === 'rejected' || profile?.verification_status === 'banned' || profile?.verification_status === 'deleted';

    // 3. Completely hide if banned, rejected, or have no status (and not pending)
    if (isForbidden || (!isApproved && !isPending)) return null;

    useEffect(() => {
        if (!isOpen || !isApproved || !user?.id) return;

        // Fetch initial messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('admin_user_messages')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setMessages(data);
            }
        };

        fetchMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel(`chat:${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'admin_user_messages',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                const newMsg = payload.new as Message;
                setMessages(prev => {
                    // Prevent duplicates
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, user?.id, isApproved]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending || !isApproved) return;

        const content = input.trim();
        setInput('');
        setIsSending(true);

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                console.error('Chat error:', await response.text());
            }
        } catch (err) {
            console.error('Chat error:', err);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-20 right-0 w-[380px] h-[500px] bg-[#0D121F] border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-cyan-primary/20 flex items-center justify-center border border-cyan-primary/30">
                                    <Bot className="w-5 h-5 text-cyan-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Support</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest text-left">
                                            {isApproved ? 'Online' : 'Pending Approval'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {!isApproved ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6 bg-white/[0.01]">
                                    <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-black text-white uppercase tracking-tight leading-relaxed">Verification Required</p>
                                        <p className="text-xs text-text-muted leading-relaxed">
                                            Chat support will be available once your account has been approved by the administrator.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                                    >
                                        Okay
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Messages Area */}
                                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                        {messages.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
                                                <MessageSquare className="w-8 h-8 text-cyan-primary" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted leading-relaxed">
                                                    Start a conversation with our support team.
                                                </p>
                                            </div>
                                        )}
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-4 rounded-[20px] text-xs leading-relaxed ${msg.sender_id === user.id ? 'bg-cyan-primary text-black font-medium rounded-tr-none' :
                                                        msg.is_ai_response ? 'bg-purple-ai/20 border border-purple-ai/30 text-white rounded-tl-none' :
                                                            'bg-white/5 text-white border border-white/10 rounded-tl-none'
                                                    }`}>
                                                    {msg.is_ai_response && (
                                                        <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                                            <Bot className="w-3 h-3" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">AI Agent</span>
                                                        </div>
                                                    )}
                                                    <p>{msg.content}</p>
                                                    <p className="text-[8px] mt-2 opacity-40 font-bold uppercase tracking-widest">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {isSending && (
                                            <div className="flex justify-end pr-2">
                                                <div className="bg-cyan-primary/20 p-2.5 rounded-full">
                                                    <Loader2 className="w-3 h-3 text-cyan-primary animate-spin" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Form */}
                                    <form onSubmit={handleSend} className="p-6 border-t border-white/5 bg-white/5">
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder="Type your inquiry..."
                                                className="w-full h-11 bg-[#0A0F1C] border border-white/5 rounded-2xl pl-4 pr-12 text-xs text-white focus:outline-none focus:border-cyan-primary/40 transition-all font-medium placeholder:text-white/10"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!input.trim() || isSending}
                                                className="absolute right-1.5 top-1.5 h-8 w-8 rounded-xl bg-cyan-primary flex items-center justify-center text-black hover:bg-cyan-primary/80 transition-all disabled:opacity-30 active:scale-90"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 hover:scale-105 ${isOpen ? 'bg-white/10 text-white rotate-90 border border-white/20' : 'bg-cyan-primary text-black shadow-cyan-primary/20'
                    }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </button>
        </div>
    );
}
