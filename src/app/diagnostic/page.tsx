'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    Terminal as TerminalIcon,
    Sparkles,
    Usb,
    Zap,
    Activity,
    Cpu,
    ShieldAlert,
    ChevronLeft,
    Trash2,
    RotateCcw,
    LayoutDashboard,
    Maximize2,
    Settings,
    LogOut,
    Send,
    Copy,
    Check
} from 'lucide-react';
import { useSerialStore } from '@/store/serial-store';
import { useIDEStore } from '@/store/ide-store';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { CircuitoLogo } from '@/components/ui/logo';

const baudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export default function DiagnosticPage() {
    const {
        isSupported,
        devices,
        serialOutput,
        init,
        connectDevice,
        openSerial,
        clearOutput,
        analyzeDiagnostic,
        diagnosticHistory,
        isAnalyzing,
    } = useSerialStore();

    const { baudRate, setBaudRate, isBridgeConnected, localProjectPath } = useIDEStore();
    const terminalEndRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [panelWidth, setPanelWidth] = useState(450);
    const isResizing = useRef(false);
    const [trafficLoad, setTrafficLoad] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        init();
    }, [init]);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }

        // Simulate traffic load based on message frequency
        if (serialOutput.length > 0) {
            setTrafficLoad(Math.min(100, (serialOutput.length % 50) * 2));
        }
    }, [serialOutput]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
    }, [diagnosticHistory]);

    const activeDevice = devices.find((d) => d.status === 'reading');

    const handleConnect = async () => {
        try {
            const id = await connectDevice();
            if (id) {
                await openSerial(id, baudRate);
            }
        } catch (err) {
            console.error('Diagnostic connection failed:', err);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isAnalyzing) return;

        const msg = inputValue;
        setInputValue('');
        await analyzeDiagnostic(msg);
    };

    const handleCopy = async () => {
        if (serialOutput.length === 0) return;
        const text = serialOutput.join('\n');
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Resizing logic for the side panel
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 300), 800);
            setPanelWidth(newWidth);
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };

        const startResizing = () => {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        // This is a bit of a hack to expose the function
        (window as any).startDiagnosticResizing = (e: React.MouseEvent) => {
            e.preventDefault();
            isResizing.current = true;
            document.body.style.cursor = 'col-resize';
            startResizing();
        };
    }, []);

    return (
        <div className="h-screen w-screen bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none">
            {/* ≡ƒÆÄ BACKGROUND GRID EFFECT */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />

            {/* ≡ƒ¢╕ TOP HUD BAR */}
            <header className="h-16 border-b border-white/10 bg-[#0A0F1C]/80 backdrop-blur-2xl flex items-center px-6 gap-6 z-50 shadow-2xl">
                <Link href="/" className="flex items-center gap-3 group transition-all">
                    <CircuitoLogo className="w-9 h-9 transition-transform group-hover:scale-105" />
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-black tracking-widest uppercase text-white">Diagnostic Station</h1>
                        <p className="text-[10px] text-cyan-primary font-bold opacity-80 uppercase tracking-tighter">Automotive AI Specialist</p>
                    </div>
                </Link>

                <div className="h-8 w-[1px] bg-white/10 mx-2 hidden sm:block" />

                {/* Neural Link Status */}
                <div className="hidden lg:flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isBridgeConnected ? 'bg-purple-ai/10 border-purple-ai/30 text-purple-ai' : 'bg-white/5 border-white/10 text-text-muted'}`}>
                        <Zap className={`w-3.5 h-3.5 ${isBridgeConnected ? 'animate-pulse' : 'opacity-30'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isBridgeConnected ? `NEURAL LINK: ${localProjectPath?.split(/[\\/]/).pop()}` : 'NEURAL LINK OFFLINE'}
                        </span>
                    </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${activeDevice ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-text-muted'}`}>
                        <Usb className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {activeDevice ? `CONNECTED: ${activeDevice.name}` : 'NO HARDWARE DETECTED'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-400">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Load: {trafficLoad}%</span>
                    </div>
                </div>

                {/* Center Controls */}
                <div className="ml-auto flex items-center gap-3">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Serial Sync:</span>
                    <Select
                        value={baudRate.toString()}
                        onValueChange={(val) => setBaudRate(Number(val))}
                    >
                        <SelectTrigger className="h-9 w-32 bg-white/5 border-white/10 text-[11px] font-bold rounded-xl hover:bg-white/10 transition-all">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A0F1C] border-white/10">
                            {baudRates.map((rate) => (
                                <SelectItem key={rate} value={rate.toString()} className="text-[11px] focus:bg-cyan-primary/20">
                                    {rate} Baud
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {!activeDevice ? (
                        <button
                            onClick={handleConnect}
                            className="h-10 px-5 rounded-xl bg-cyan-primary text-[#0A0F1C] font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-cyan-hover transition-all shadow-lg shadow-cyan-primary/20 active:scale-95"
                        >
                            <Zap className="w-4 h-4 fill-current" />
                            Initialize Link
                        </button>
                    ) : (
                        <button
                            onClick={() => useSerialStore.getState().disconnectDevice(activeDevice.id)}
                            className="h-10 px-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-500/20 transition-all active:scale-95"
                        >
                            <LogOut className="w-4 h-4" />
                            Terminate
                        </button>
                    )}

                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${isSidebarOpen ? 'bg-cyan-primary/10 border-cyan-primary/30 text-cyan-primary' : 'bg-white/5 border-white/10 text-text-muted'}`}
                        title={isSidebarOpen ? "Hide Specialist" : "Show Specialist"}
                    >
                        <Sparkles className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative min-h-0">
                {/* ≡ƒôƒ THE GIANT TERMINAL AREA */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#020617] border-r border-white/5 shadow-inner relative">
                    <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <TerminalIcon className="w-3.5 h-3.5 text-cyan-primary" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Telemetry Stream</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => analyzeDiagnostic("Please analyze these recent readings.")}
                                disabled={isAnalyzing || serialOutput.length === 0}
                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-primary/10 border border-cyan-primary/20 text-[9px] font-black text-cyan-primary uppercase tracking-widest hover:bg-cyan-primary/20 transition-all disabled:opacity-30"
                            >
                                <Sparkles className="w-3 h-3" />
                                Sync to AI
                            </button>
                            <button
                                onClick={handleCopy}
                                disabled={serialOutput.length === 0}
                                className="p-1.5 text-text-muted hover:text-cyan-primary transition-colors disabled:opacity-30"
                                title="Copy Telemetry"
                            >
                                {isCopied ? <Check className="w-4 h-4 text-green-success" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={clearOutput}
                                className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                                title="Purge Buffer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                className="p-1.5 text-text-muted hover:text-white transition-colors"
                                title="Expand View"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 font-mono min-h-0">
                        <div className="p-6 space-y-1">
                            {!activeDevice ? (
                                <div className="h-full flex flex-col items-center justify-center py-40 text-center gap-6">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group animate-pulse">
                                        <Cpu className="w-10 h-10 text-white/20 group-hover:text-cyan-primary transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-black text-white uppercase tracking-tighter">Hardware Sync Required</p>
                                        <p className="text-sm text-text-muted max-w-md mx-auto">Establish a serial connection to start streaming vehicle telemetry and activate the AI Diagnostic Specialist.</p>
                                    </div>
                                    <button
                                        onClick={handleConnect}
                                        className="px-8 py-3 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-cyan-primary transition-all shadow-xl shadow-white/5 transform hover:scale-105"
                                    >
                                        Connect Hardware Now
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 text-[10px] font-black text-cyan-primary mb-4 opacity-100 select-none">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-primary animate-ping" />
                                        STREAMING AT {activeDevice.baudRate} BAUD / PROTOCOL: ISO 15765-4 (CAN)
                                    </div>
                                    <div className="select-text">
                                        {serialOutput.slice(-150).map((line, i) => (
                                            <div key={i} className="text-[13px] leading-relaxed group flex gap-4">
                                                <span className="opacity-20 text-[10px] w-12 font-bold tabular-nums group-hover:opacity-100 transition-opacity select-none">{(i + 1).toString().padStart(4, '0')}</span>
                                                <span className={`${line.includes('ERR') || line.includes('ΓÜá∩╕Å') ? 'text-red-400 font-bold' : 'text-cyan-primary/90'}`}>
                                                    {line}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div ref={terminalEndRef} />
                                </>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Terminal Footer Info */}
                    <div className="h-8 border-t border-white/5 bg-white/[0.02] flex items-center px-4 gap-6">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-primary" />
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">RX Link: Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">TX Link: Ready</span>
                        </div>
                        <div className="ml-auto text-[9px] font-black text-text-muted uppercase tracking-widest">
                            Buffer: {serialOutput.length} / 800 Lines
                        </div>
                    </div>
                </div>

                {/* ≡ƒñû AI SPECIALIST PANEL (SIDEBAR) */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <>
                            {/* Resize handle */}
                            <div
                                onMouseDown={(e) => (window as any).startDiagnosticResizing(e)}
                                className="w-1 cursor-col-resize bg-transparent hover:bg-cyan-primary/30 active:bg-cyan-primary/50 transition-colors shrink-0 z-30"
                            />
                            <motion.aside
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: panelWidth, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                style={{ width: panelWidth }}
                                className="shrink-0 flex flex-col min-h-0 h-full bg-[#0A0F1C] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 relative overflow-hidden"
                            >
                                {/* Glassy Background Effect */}
                                <div className="absolute inset-0 bg-gradient-to-b from-cyan-primary/5 to-transparent pointer-events-none opacity-50" />

                                <div className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-white/[0.02] relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Sparkles className="w-4 h-4 text-cyan-primary" />
                                            <div className="absolute inset-0 bg-cyan-primary blur-md opacity-30" />
                                        </div>
                                        <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Circuito Diagnostic</h3>
                                    </div>
                                    {isAnalyzing && (
                                        <div className="flex gap-1 items-baseline">
                                            <span className="text-[9px] font-black text-cyan-primary/60 uppercase tracking-tighter mr-2">Analyzing</span>
                                            <span className="w-1 h-1 bg-cyan-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1 h-1 bg-cyan-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1 h-1 bg-cyan-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    )}
                                </div>

                                <ScrollArea className="flex-1 relative z-10 min-h-0">
                                    <div className="p-6 space-y-8">
                                        {diagnosticHistory.length === 0 ? (
                                            <div className="py-20 text-center space-y-6 opacity-40">
                                                <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                    <Sparkles className="w-10 h-10 text-white/50" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-sm font-black text-white uppercase tracking-widest leading-none">Diagnostic Link Offline</p>
                                                    <p className="text-[11px] text-text-muted max-w-[220px] mx-auto italic">Waiting for telemetry session to initiate AI Copilot...</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <AnimatePresence initial={false} mode="popLayout">
                                                {diagnosticHistory.map((msg, idx) => (
                                                    <motion.div
                                                        key={msg.id}
                                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-6`}
                                                    >
                                                        <div className={`max-w-[90%] p-5 rounded-3xl text-[13px] font-medium leading-[1.6] shadow-2xl relative group ${msg.role === 'user'
                                                            ? 'bg-cyan-primary/10 border border-cyan-primary/20 text-cyan-primary rounded-br-none'
                                                            : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                                                            }`}>

                                                            {msg.role === 'assistant' && (
                                                                <div className="absolute -left-6 -top-2 w-6 h-6 flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform">
                                                                    <CircuitoLogo className="w-10 h-10" />
                                                                </div>
                                                            )}

                                                            <div className="prose prose-invert prose-sm max-w-none">
                                                                {msg.role === 'assistant' && (msg.content === '' || msg.content === '▮') && isAnalyzing ? (
                                                                    <div className="flex items-center gap-2 py-1">
                                                                        <span className="text-cyan-primary font-bold tracking-tight">Circuito is analyzing</span>
                                                                        <div className="flex gap-1 items-baseline">
                                                                            <span className="w-1 h-1 bg-cyan-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                                            <span className="w-1 h-1 bg-cyan-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                                            <span className="w-1 h-1 bg-cyan-primary rounded-full animate-bounce" />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    msg.content.split('\n').map((line, i) => {
                                                                        if (line.startsWith('###')) {
                                                                            return <h4 key={i} className="text-white font-black uppercase text-[11px] tracking-widest mt-2 mb-3">{line.replace('###', '')}</h4>;
                                                                        }
                                                                        if (line.startsWith('*')) {
                                                                            return <span key={i} className="block text-cyan-primary/80 italic my-1 font-bold">{line.replace(/\*/g, '')}</span>;
                                                                        }
                                                                        return <p key={i} className={`mb-3 last:mb-0 ${line.startsWith('-') ? 'pl-4 relative before:content-[""] before:absolute before:left-0 before:top-2.5 before:w-1.5 before:h-[2px] before:bg-cyan-primary' : ''}`}>
                                                                            {line.replace(/^- /, '')}
                                                                        </p>;
                                                                    })
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className={`flex items-center gap-1.5 mt-2.5 px-3 opacity-40 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                                                {msg.role === 'user' ? 'Technician' : 'Specialist'}
                                                            </span>
                                                            <span className="w-1 h-1 rounded-full bg-white/20" />
                                                            <span className="text-[9px] font-bold text-text-muted tabular-nums">
                                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        )}
                                        <div ref={chatEndRef} className="h-8" />
                                    </div>
                                </ScrollArea>

                                <div className="p-6 border-t border-white/10 bg-[#0A0F1C] relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                                    <form onSubmit={handleSendMessage} className="relative mb-4 group">
                                        <div className="absolute inset-0 bg-cyan-primary/5 blur-xl group-focus-within:bg-cyan-primary/10 transition-colors pointer-events-none" />
                                        <input
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="Consult Specialist..."
                                            className="w-full bg-[#020617] border border-white/10 rounded-2xl px-5 py-4 text-xs text-white placeholder:text-text-muted focus:border-cyan-primary/50 focus:ring-1 focus:ring-cyan-primary/20 focus:outline-none transition-all pr-14 relative z-10 shadow-inner"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputValue.trim() || isAnalyzing}
                                            className="absolute right-2.5 top-2.5 w-9 h-9 rounded-xl bg-cyan-primary text-[#0A0F1C] flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale z-20 shadow-lg shadow-cyan-primary/20"
                                        >
                                            <Send className="w-4 h-4 fill-current" />
                                        </button>
                                    </form>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => analyzeDiagnostic()}
                                            disabled={isAnalyzing || serialOutput.length === 0}
                                            className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group ${isAnalyzing || serialOutput.length === 0
                                                ? 'bg-white/5 border border-white/5 text-text-muted'
                                                : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                                                }`}
                                        >
                                            <Activity className="w-3.5 h-3.5" />
                                            System Scan
                                        </button>
                                        <Link
                                            href="/ide"
                                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-text-muted hover:text-white hover:bg-white/10 transition-all group"
                                            title="Switch to Developer Mode"
                                        >
                                            <LayoutDashboard className="w-4 h-4 group-hover:text-cyan-primary transition-colors" />
                                        </Link>
                                    </div>
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
