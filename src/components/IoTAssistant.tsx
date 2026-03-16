'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquare, 
    X, 
    Terminal, 
    Cpu, 
    Zap, 
    ShieldAlert, 
    ChevronRight,
    Send,
    Bot,
    Trash2,
    Maximize2,
    Minimize2,
    Sparkles
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSerialStore } from '@/store/serial-store';
import { useIDEStore } from '@/store/ide-store';
import { CircuitoLogo } from '@/components/ui/logo';

const MarkdownRenderer = ({ content }: { content: string }) => {
    // Splits by bold (**), italic (*), and inline code (`)
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={i} className="text-text-primary italic">{part.slice(1, -1)}</em>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return (
                        <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-primary font-mono text-[10px]">
                            {part.slice(1, -1)}
                        </code>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

export function IoTAssistant() {
    const pathname = usePathname();
    const [hasMounted, setHasMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
        { role: 'assistant', content: "I'm your **IoT Debug Specialist**. Connect a device and I'll help you analyze live logs or fix errors!" }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    
    const { devices, activeDeviceId, serialOutput, clearOutput, init } = useSerialStore();
    const activeDevice = devices.find(d => d.id === activeDeviceId);
    const monitorScrollRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { 
        isCompiling, 
        isUploading, 
        device: ideDevice, 
        agentTaskStatus, 
        activeFileId,
        editorContent 
    } = useIDEStore();

    // Initial store setup
    useEffect(() => {
        init();
        setHasMounted(true);
    }, [init]);

    // Only show on specific routes
    const isVisible = ['/flash', '/devices', '/dashboard'].includes(pathname);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior
            });
        }
    };

    // Auto-scroll chat when history or typing state changes
    useEffect(() => {
        scrollToBottom(isTyping ? 'auto' : 'smooth');
    }, [chatHistory, isTyping]);

    // Auto-scroll monitor
    useEffect(() => {
        if (monitorScrollRef.current) {
            monitorScrollRef.current.scrollTop = monitorScrollRef.current.scrollHeight;
        }
    }, [serialOutput]);

    if (!hasMounted || !isVisible) return null;

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!message.trim() || isTyping) return;

        const userMsg = message.trim();
        setMessage('');
        const newHistory = [...chatHistory, { role: 'user' as const, content: userMsg }];
        setChatHistory(newHistory);
        setIsTyping(true);
        setIsThinking(true);

        try {
            const telemetry = serialOutput.slice(-50).join('\n');
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newHistory,
                    mode: 'debug_assistant',
                    context: {
                        telemetry: `[LATEST SERIAL LOGS]\n${telemetry}`,
                        board: activeDevice?.name || ideDevice?.board || 'Unknown',
                        deviceType: activeDevice?.type || 'serial',
                        appState: {
                            currentRoute: pathname,
                            isCompiling,
                            isUploading: isUploading || ideDevice?.status === 'flashing',
                            agentStatus: agentTaskStatus,
                            activeFile: activeFileId,
                            codeSummary: editorContent ? editorContent.slice(0, 500) + '...' : 'No code open'
                        }
                    }
                })
            });

            if (!response.ok) throw new Error('Failed to reach AI');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantResponse = '';
            let sseBuffer = '';

            const assistantMsgIndex = newHistory.length;
            // Don't add the message box until we have tokens, let the loader handle the "thinking" phase
            
            if (reader) {
                let firstToken = true;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    sseBuffer += decoder.decode(value, { stream: true });
                    const lines = sseBuffer.split('\n');
                    sseBuffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;
                        
                        try {
                            const dataStr = trimmed.slice(6);
                            if (dataStr === '[DONE]') continue;
                            const data = JSON.parse(dataStr);

                            if (data.type === 'token') {
                                if (firstToken) {
                                    setIsThinking(false);
                                    firstToken = false;
                                }
                                
                                assistantResponse += data.content;
                                
                                // Stream update: either add the message or update it
                                setChatHistory(prev => {
                                    const updated = [...prev];
                                    if (updated.length <= assistantMsgIndex) {
                                        return [...updated, { role: 'assistant', content: assistantResponse + '▋' }];
                                    } else {
                                        updated[assistantMsgIndex] = { role: 'assistant', content: assistantResponse + '▋' };
                                        return updated;
                                    }
                                });
                            }
                        } catch (e) {
                            // Partial JSON
                        }
                    }
                }
                // Final cleanup: remove cursor
                setChatHistory(prev => {
                    const updated = [...prev];
                    if (updated[assistantMsgIndex]) {
                        updated[assistantMsgIndex] = { role: 'assistant', content: assistantResponse };
                    }
                    return updated;
                });
            }
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: "⚠️ Sorry, I lost connection to my autonomous core." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`mb-4 overflow-hidden rounded-[24px] border border-white/10 bg-[#0A0F1C]/95 backdrop-blur-2xl shadow-2xl flex flex-col transition-all duration-300 
                            ${isExpanded 
                                ? 'w-[500px] h-[750px] max-h-[calc(100vh-100px)]' 
                                : 'w-[400px] h-[600px] max-h-[calc(100vh-140px)]'
                            } max-w-[calc(100vw-48px)]`}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-primary/10 flex items-center justify-center">
                                    <CircuitoLogo className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        Circuito Debugger
                                        {isTyping && <Sparkles className="w-3 h-3 text-cyan-primary animate-pulse" />}
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1 h-1 rounded-full ${activeDevice ? 'bg-green-success' : 'bg-red-500'} animate-pulse`} />
                                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                                            {activeDevice ? `${activeDevice.name} Active` : 'No Device Linked'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2 hover:bg-white/5 rounded-lg text-text-muted transition-colors"
                                >
                                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/5 rounded-lg text-text-muted transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Mixed Content */}
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* Live Monitor Section */}
                            <div className="h-[180px] border-b border-white/5 bg-black/40 relative shrink-0 group">
                                <div className="absolute top-2 left-4 flex items-center gap-2 z-10 pointer-events-none">
                                    <Terminal className="w-3 h-3 text-cyan-primary" />
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Live Telemetry</span>
                                </div>
                                <button 
                                    onClick={clearOutput}
                                    className="absolute top-2 right-4 p-1 rounded hover:bg-white/10 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    title="Clear Logs"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                                <div 
                                    ref={monitorScrollRef}
                                    className="h-full overflow-y-auto p-4 pt-8 font-mono text-[10px] space-y-0.5 custom-scrollbar"
                                >
                                    {serialOutput.length === 0 ? (
                                        <p className="text-text-muted/30 italic">Silent... waiting for hardware pulse.</p>
                                    ) : (
                                        serialOutput.map((line, i) => (
                                            <div key={i} className={`whitespace-pre-wrap break-all ${
                                                line.toLowerCase().includes('error') ? 'text-red-400 font-bold' : 
                                                line.toLowerCase().includes('warning') ? 'text-yellow-400' : 
                                                'text-text-muted/80'
                                            }`}>
                                                <span className="opacity-30">[{new Date().toLocaleTimeString([], { hour12: false })}]</span> {line.replace(/\[.*\]\s*/, '')}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Chat Section */}
                            <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-gradient-to-b from-transparent to-white/[0.02]">
                                <div 
                                    ref={chatContainerRef}
                                    className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                                >
                                    {chatHistory.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2.5'}`}>
                                            {m.role === 'assistant' && (
                                                <div className="w-8 h-8 rounded-lg bg-cyan-primary/10 border border-cyan-primary/20 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                                    <CircuitoLogo className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                                                m.role === 'user' 
                                                ? 'bg-cyan-primary/10 border border-cyan-primary/20 text-white rounded-br-sm' 
                                                : 'bg-white/5 border border-white/10 text-text-secondary rounded-bl-sm'
                                            }`}>
                                                {m.content.split('\n').map((line, j) => (
                                                    <p key={j} className={j > 0 ? 'mt-1.5' : ''}>
                                                        <MarkdownRenderer content={line} />
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {isThinking && (
                                        <div className="flex justify-start items-start gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-cyan-primary/10 border border-cyan-primary/20 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                                <CircuitoLogo className="w-5 h-5" />
                                            </div>
                                            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl rounded-bl-sm">
                                                <div className="flex gap-1.5 items-center">
                                                    <div className="w-1.5 h-1.5 bg-cyan-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-cyan-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-cyan-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Scroll Anchor */}
                                    <div className="h-2 w-full shrink-0" />
                                </div>

                                {/* Input Bar */}
                                <div className="p-4 bg-[#0A0F1C]/80 backdrop-blur-md border-t border-white/5 shrink-0">
                                    <form onSubmit={handleSend} className="relative group">
                                        <div className="absolute inset-0 bg-cyan-primary/5 rounded-xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Ask about these logs..."
                                            className="relative w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-[11px] text-white placeholder:text-text-muted/60 focus:outline-none focus:border-cyan-primary/40 focus:bg-white/[0.08] transition-all"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!message.trim() || isTyping}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-primary text-[#0A0F1C] rounded-lg disabled:opacity-30 disabled:grayscale transition-all hover:bg-cyan-hover shadow-lg hover:shadow-cyan-primary/20"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </button>
                                    </form>
                                    <div className="mt-2.5 flex items-center justify-between px-1">
                                         <div className="flex items-center gap-1.5">
                                             <Sparkles className="w-2.5 h-2.5 text-cyan-primary/40" />
                                             <p className="text-[8px] text-text-muted/30 font-bold uppercase tracking-widest">Circuito Debugger</p>
                                         </div>
                                         <button 
                                            onClick={() => setChatHistory([{ role: 'assistant', content: "History cleared. Waiting for telemetry..." }])}
                                            className="text-[8px] text-text-muted/40 hover:text-white font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                                          >
                                            <Trash2 className="w-2 h-2" /> Reset
                                          </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                    isOpen 
                    ? 'bg-white/10 border border-white/20 text-white' 
                    : 'bg-cyan-primary border-4 border-[#0A0F1C] text-[#0A0F1C] shadow-[0_0_40px_rgba(34,211,238,0.4)]'
                }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : (
                    <div className="relative">
                        <CircuitoLogo className="w-7 h-7" />
                        {activeDevice && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0F1C]" />
                        )}
                        {serialOutput.some(l => l.toLowerCase().includes('error')) && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0A0F1C] animate-ping" />
                        )}
                    </div>
                )}
            </motion.button>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(34, 211, 238, 0.2);
                }
            `}</style>
        </div>
    );
}
