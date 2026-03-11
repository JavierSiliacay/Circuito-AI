'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
    MessageSquare,
    Send,
    User,
    Bot,
    Loader2,
    Search,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    user_id: string;
    sender_id: string;
    content: string;
    is_ai_response: boolean;
    created_at: string;
}

interface ChatPreview {
    user_id: string;
    user_email: string;
    user_full_name: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
}

export function AdminChatManager() {
    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchChats = async () => {
            // This is a simplified query. In a real app we'd want the latest message per user.
            const { data: messages, error } = await supabase
                .from('admin_user_messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) return;

            // Group by user and get unique users
            const userChats: Record<string, ChatPreview> = {};

            // We need to fetch profiles to get names/emails
            const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
            const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p]) || []);

            messages.forEach(msg => {
                if (!userChats[msg.user_id]) {
                    const profile = profileMap[msg.user_id];
                    userChats[msg.user_id] = {
                        user_id: msg.user_id,
                        user_email: profile?.email || 'Unknown',
                        user_full_name: profile?.full_name || 'User',
                        last_message: msg.content,
                        last_message_time: msg.created_at,
                        unread_count: 0 // Simplification
                    };
                }
            });

            setChats(Object.values(userChats));
            setIsLoading(false);
        };

        fetchChats();

        // Real-time subscription for new messages globally (for admin)
        const channel = supabase
            .channel('admin_chats')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'admin_user_messages'
            }, (payload) => {
                const newMsg = payload.new as Message;

                // Update messages if this user is selected
                if (newMsg.user_id === selectedUserId) {
                    setMessages(prev => [...prev, newMsg]);
                }

                // Update chat list preview
                setChats(prev => {
                    const existing = prev.find(c => c.user_id === newMsg.user_id);
                    if (existing) {
                        return [
                            {
                                ...existing,
                                last_message: newMsg.content,
                                last_message_time: newMsg.created_at
                            },
                            ...prev.filter(c => c.user_id !== newMsg.user_id)
                        ];
                    } else {
                        // Ideally fetch profile here too
                        return [{
                            user_id: newMsg.user_id,
                            user_email: 'New Message',
                            user_full_name: 'Recent User',
                            last_message: newMsg.content,
                            last_message_time: newMsg.created_at,
                            unread_count: 1
                        }, ...prev];
                    }
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedUserId]);

    useEffect(() => {
        if (!selectedUserId) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('admin_user_messages')
                .select('*')
                .eq('user_id', selectedUserId)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setMessages(data);
            }
        };

        fetchMessages();
    }, [selectedUserId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !selectedUserId || isSending) return;

        const content = input.trim();
        setInput('');
        setIsSending(true);

        const { data: { user } } = await supabase.auth.getUser();

        try {
            const { error } = await supabase
                .from('admin_user_messages')
                .insert({
                    user_id: selectedUserId,
                    sender_id: user?.id,
                    content: content,
                    is_ai_response: false
                });

            if (error) console.error('Failed to send admin message:', error);
        } catch (err) {
            console.error('Admin chat error:', err);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[700px] bg-[#0D121F] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
            {/* Sidebar: Chat List */}
            <div className="md:col-span-4 border-r border-white/5 flex flex-col">
                <div className="p-6 border-b border-white/5 space-y-4">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-cyan-primary" />
                        Communications
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-xs text-white focus:outline-none focus:border-cyan-primary/50 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 opacity-20">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="p-10 text-center opacity-30">
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">No Active Threads</p>
                        </div>
                    ) : (
                        chats.map((chat) => (
                            <button
                                key={chat.user_id}
                                onClick={() => setSelectedUserId(chat.user_id)}
                                className={`w-full p-4 flex items-start gap-3 hover:bg-white/5 transition-all text-left border-b border-white/5 ${selectedUserId === chat.user_id ? 'bg-white/5 border-l-2 border-l-cyan-primary' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-[10px] font-black uppercase border border-white/10">
                                    {chat.user_full_name?.[0] || chat.user_email?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-black text-white truncate uppercase tracking-tight">{chat.user_full_name}</p>
                                        <p className="text-[8px] font-bold text-text-muted uppercase tracking-tighter">
                                            {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-text-muted truncate leading-relaxed">
                                        {chat.last_message}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main: Active Chat */}
            <div className="md:col-span-8 flex flex-col relative">
                {selectedUserId ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-cyan-primary/20 flex items-center justify-center border border-cyan-primary/30">
                                    <User className="w-5 h-5 text-cyan-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-tight">
                                        {chats.find(c => c.user_id === selectedUserId)?.user_full_name}
                                    </p>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                        {chats.find(c => c.user_id === selectedUserId)?.user_email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">User Connection Stable</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
                        >
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_id === selectedUserId ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className={`max-w-[70%] space-y-2 ${msg.sender_id === selectedUserId ? 'items-start' : 'items-end'}`}>
                                        <div className={`p-4 rounded-[24px] text-sm leading-relaxed ${msg.sender_id === selectedUserId
                                                ? 'bg-white/5 text-white border border-white/10 rounded-tl-none'
                                                : msg.is_ai_response
                                                    ? 'bg-purple-ai/20 border border-purple-ai/30 text-white rounded-tr-none'
                                                    : 'bg-cyan-primary text-black font-medium rounded-tr-none shadow-lg shadow-cyan-primary/10'
                                            }`}>
                                            {msg.is_ai_response && (
                                                <div className="flex items-center gap-1.5 mb-2 opacity-60">
                                                    <Bot className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">AI Agent Fallback Active</span>
                                                </div>
                                            )}
                                            <p>{msg.content}</p>
                                        </div>
                                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-1">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-6 border-top border-white/5 bg-white/[0.02]">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type admin response..."
                                    className="w-full h-14 bg-[#0A0F1C] border border-white/10 rounded-2xl pl-6 pr-16 text-sm text-white focus:outline-none focus:border-cyan-primary/50 transition-all font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isSending}
                                    className="absolute right-3 top-3 h-8 px-4 rounded-xl bg-cyan-primary flex items-center justify-center text-black hover:bg-cyan-primary/80 transition-all disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Send</span>
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="w-20 h-20 rounded-[32px] bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                            <MessageSquare className="w-8 h-8 text-text-muted" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Communications Command Center</h3>
                            <p className="text-xs text-text-muted max-w-[280px] leading-relaxed">
                                Select a diagnostic thread from the left to start communicating with the operator.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 group cursor-default">
                            <Clock className="w-4 h-4 text-cyan-primary group-hover:animate-spin" />
                            <span className="text-[10px] font-bold text-cyan-primary uppercase tracking-widest">Waiting for Input...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
