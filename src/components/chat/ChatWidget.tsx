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
    const { user, isAdmin } = useAuthStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Don't show for admins (they have their own dashboard chat)
    if (isAdmin) return null;
    if (!user) return null;

    useEffect(() => {
        if (!isOpen) return;

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
                setMessages(prev => [...prev, payload.new as Message]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, user.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending) return;

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
                console.error('Failed to send message');
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
                        className="absolute bottom-20 right-0 w-[400px] h-[600px] bg-[#0D121F] border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-cyan-primary/20 flex items-center justify-center border border-cyan-primary/30">
                                    <User className="w-5 h-5 text-cyan-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Admin Support</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Active Thread</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                    <MessageSquare className="w-12 h-12 text-white/5" />
                                    <p className="text-xs text-text-muted font-medium">
                                        Ask the admin anything. If they are offline, our AI will step in to help.
                                    </p>
                                </div>
                            )}
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] p-4 rounded-[20px] text-sm ${msg.sender_id === user.id
                                        ? 'bg-cyan-primary text-black font-medium rounded-tr-none'
                                        : msg.is_ai_response
                                            ? 'bg-purple-ai/20 border border-purple-ai/30 text-white rounded-tl-none'
                                            : 'bg-white/1 accounts-list-item text-white border border-white/10 rounded-tl-none'
                                        }`}>
                                        {msg.is_ai_response && (
                                            <div className="flex items-center gap-1.5 mb-2 opacity-60">
                                                <Bot className="w-3 h-3" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">AI Assistant</span>
                                            </div>
                                        )}
                                        <p className="leading-relaxed">{msg.content}</p>
                                        <p className="text-[9px] mt-2 opacity-40 font-bold uppercase tracking-wider">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {isSending && (
                                <div className="flex justify-end">
                                    <div className="bg-cyan-primary/20 p-3 rounded-full">
                                        <Loader2 className="w-4 h-4 text-cyan-primary animate-spin" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-6 border-t border-white/10 bg-white/5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full h-12 bg-[#0D121F] border border-white/10 rounded-2xl pl-4 pr-12 text-sm text-white focus:outline-none focus:border-cyan-primary/50 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isSending}
                                    className="absolute right-2 top-2 h-8 w-8 rounded-xl bg-cyan-primary flex items-center justify-center text-black hover:bg-cyan-primary/80 transition-all disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isOpen ? 'bg-white/10 text-white rotate-90' : 'bg-cyan-primary text-black'
                    }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </button>
        </div>
    );
}
