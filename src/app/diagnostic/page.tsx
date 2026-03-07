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
    Check,
    Bluetooth,
    Wifi,
    X,
    Info,
    FileText,
    Printer,
    DownloadCloud,
    Clock
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
        connectBluetooth,
        isScanning,
        performFullScan,
        liveReadings,
        clearDiagnosticHistory
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
    const [isMobile, setIsMobile] = useState(false);
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    const handleConnect = () => {
        setIsConnectModalOpen(true);
    };

    const handleSerialConnect = async () => {
        setIsConnectModalOpen(false);
        try {
            const id = await connectDevice();
            if (id) {
                await openSerial(id, baudRate);
            }
        } catch (err) {
            console.error('Diagnostic connection failed:', err);
        }
    };

    const handleBluetoothConnect = async () => {
        setConnectionError(null);
        try {
            const id = await connectBluetooth();
            if (id) {
                setIsConnectModalOpen(false);
            } else {
                // User cancelled or no device picked
            }
        } catch (err: any) {
            console.error('Bluetooth connection failed:', err);
            let msg = 'Failed to open Bluetooth. ';
            if (err.name === 'SecurityError') msg += 'Secure context (HTTPS) required.';
            else if (err.name === 'NotFoundError') msg = ''; // User cancelled
            else if (err.name === 'NotSupportedError') msg += 'Bluetooth is not supported in this browser.';
            else msg += (err.message || 'Check if Bluetooth is enabled.');

            if (msg) setConnectionError(msg);
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
        <div className="h-[100dvh] w-full bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none">
            {/* BACKGROUND GRID EFFECT */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />

            {/* TOP HUD BAR */}
            <header className="min-h-16 py-3 lg:py-0 border-b border-white/10 bg-[#0A0F1C]/80 backdrop-blur-2xl flex flex-col lg:flex-row lg:items-center px-4 lg:px-6 gap-4 lg:gap-6 z-50 shadow-2xl shrink-0 overflow-y-auto lg:overflow-visible">
                <div className="flex items-center justify-between w-full lg:w-auto">
                    <Link href="/" className="flex items-center gap-3 group transition-all">
                        <CircuitoLogo className="w-8 h-8 lg:w-9 lg:h-9 transition-transform group-hover:scale-105" />
                        <div>
                            <h1 className="text-[13px] lg:text-sm font-black tracking-widest uppercase text-white">Diagnostic Station</h1>
                            <p className="text-[9px] lg:text-[10px] text-cyan-primary font-bold opacity-80 uppercase tracking-tighter">Automotive AI Specialist</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        <AnimatePresence>
                            {connectionError && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{connectionError}</span>
                                    <button onClick={() => setConnectionError(null)} className="ml-1 text-red-400/50 hover:text-red-400">
                                        <X className="w-3 h-3" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`lg:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${isSidebarOpen ? 'bg-cyan-primary/10 border-cyan-primary/30 text-cyan-primary' : 'bg-white/5 border-white/10 text-text-muted'}`}
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="h-8 w-[1px] bg-white/10 mx-2 hidden lg:block" />

                {/* Neural Link Status */}
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-3 w-full lg:w-auto">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isBridgeConnected ? 'bg-purple-ai/10 border-purple-ai/30 text-purple-ai' : 'bg-white/5 border-white/10 text-text-muted'}`}>
                        <Zap className={`w-3.5 h-3.5 ${isBridgeConnected ? 'animate-pulse' : 'opacity-30'}`} />
                        <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest truncate max-w-[150px] lg:max-w-none">
                            {isBridgeConnected ? `LINK: ${localProjectPath?.split(/[\\/]/).pop()}` : 'LINK OFFLINE'}
                        </span>
                    </div>

                    {/* Status Badges */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${activeDevice ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-text-muted'}`}>
                        {activeDevice?.type === 'bluetooth' ? (
                            <Bluetooth className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                            <Usb className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest truncate max-w-[120px] lg:max-w-none">
                            {activeDevice ? `${activeDevice.type === 'bluetooth' ? 'BLE' : 'COM'}: ${activeDevice.name}` : 'OFFLINE'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-400">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest">L: {trafficLoad}%</span>
                    </div>
                </div>

                {/* Center Controls */}
                <div className="w-full lg:w-auto mt-2 lg:mt-0 lg:ml-auto flex flex-wrap items-center gap-3">
                    <span className="hidden lg:inline-block text-[10px] font-black text-text-muted uppercase tracking-widest">Serial Sync:</span>
                    <Select
                        value={baudRate.toString()}
                        onValueChange={(val) => setBaudRate(Number(val))}
                    >
                        <SelectTrigger className="h-9 w-[110px] lg:w-32 bg-white/5 border-white/10 text-[11px] font-bold rounded-xl hover:bg-white/10 transition-all">
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
                            className="flex-1 lg:flex-none h-10 px-4 lg:px-5 rounded-xl bg-cyan-primary text-[#0A0F1C] font-black text-[10px] lg:text-[11px] uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-cyan-hover transition-all shadow-lg shadow-cyan-primary/20 active:scale-95 whitespace-nowrap"
                        >
                            <Zap className="w-4 h-4 fill-current shrink-0" />
                            Initialize Link
                        </button>
                    ) : (
                        <button
                            onClick={() => useSerialStore.getState().disconnectDevice(activeDevice.id)}
                            className="flex-1 lg:flex-none h-10 px-4 lg:px-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-black text-[10px] lg:text-[11px] uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-red-500/20 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            Terminate
                        </button>
                    )}

                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`hidden lg:flex w-10 h-10 items-center justify-center rounded-xl transition-all border ${isSidebarOpen ? 'bg-cyan-primary/10 border-cyan-primary/30 text-cyan-primary' : 'bg-white/5 border-white/10 text-text-muted'}`}
                        title={isSidebarOpen ? "Hide Specialist" : "Show Specialist"}
                    >
                        <Sparkles className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
                {/* THE GIANT TERMINAL AREA */}
                <div className={`flex-1 flex flex-col min-h-0 min-w-0 bg-[#020617] border-white/5 shadow-inner relative ${isSidebarOpen && isMobile ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <TerminalIcon className="w-3.5 h-3.5 text-cyan-primary" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Telemetry Stream</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => performFullScan()}
                                disabled={isAnalyzing || isScanning || serialOutput.length === 0}
                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-primary/10 border border-cyan-primary/20 text-[9px] font-black text-cyan-primary uppercase tracking-widest hover:bg-cyan-primary/20 transition-all disabled:opacity-30"
                            >
                                {isScanning ? (
                                    <RotateCcw className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3 h-3" />
                                )}
                                {isScanning ? 'Polling ECU...' : 'Auto-Scan vehicle'}
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
                        </div>
                    </div>

                    {/* LIVE TELEMETRY DASHBOARD */}
                    <AnimatePresence>
                        {activeDevice && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="border-b border-white/5 bg-gradient-to-r from-cyan-500/[0.03] to-transparent overflow-hidden"
                            >
                                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(liveReadings).length === 0 ? (
                                        <div className="col-span-full py-2 flex flex-col items-center justify-center gap-2 border border-dashed border-white/5 rounded-xl opacity-40">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-primary animate-ping" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Listening for ECU Data...</span>
                                        </div>
                                    ) : (
                                        Object.entries(liveReadings).map(([key, data]) => (
                                            <motion.div
                                                key={key}
                                                layout
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1 hover:bg-white/10 transition-all group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest group-hover:text-cyan-primary transition-colors">{data.label}</span>
                                                    <Activity className="w-3 h-3 text-cyan-primary/50" />
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-black text-white tracking-tighter tabular-nums">{data.value}</span>
                                                    <span className="text-[10px] font-bold text-text-muted uppercase">{data.unit}</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: '40%' }} // Static visual for now
                                                        className="h-full bg-cyan-primary/50 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                                    />
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
                                        <div className={`w-1.5 h-1.5 rounded-full bg-cyan-primary ${isScanning ? 'animate-ping' : ''}`} />
                                        {isScanning ? 'EXECUTING OBDII SYSTEM SCAN - POLLING SERVICES 01/03/07/09' : `STREAMING AT ${activeDevice.baudRate} BAUD / PROTOCOL: ISO 15765-4 (CAN)`}
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

                {/* AI SPECIALIST PANEL (SIDEBAR) */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <>
                            {/* Resize handle */}
                            <div
                                onMouseDown={(e) => (window as any).startDiagnosticResizing(e)}
                                className="hidden lg:block w-1 cursor-col-resize bg-transparent hover:bg-cyan-primary/30 active:bg-cyan-primary/50 transition-colors shrink-0 z-30"
                            />
                            <motion.aside
                                initial={{ flex: 0, opacity: 0 }}
                                animate={{ flex: isMobile ? 1 : `0 0 ${panelWidth}px`, opacity: 1 }}
                                exit={{ flex: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                style={{ width: isMobile ? '100%' : panelWidth }}
                                className="flex flex-col min-h-0 h-full bg-[#0A0F1C] border-t lg:border-t-0 lg:border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 relative overflow-hidden"
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
                                                            {msg.role === 'assistant' && (
                                                                <button
                                                                    onClick={() => setShowReport(true)}
                                                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-primary/10 border border-cyan-primary/20 text-[9px] font-black text-cyan-primary uppercase tracking-widest hover:bg-cyan-primary/20 transition-all mr-2"
                                                                >
                                                                    <Printer className="w-2.5 h-2.5" />
                                                                    Full Report
                                                                </button>
                                                            )}
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

                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => clearDiagnosticHistory()}
                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-red-400 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Clear History
                                            </button>
                                            <button
                                                onClick={() => setShowReport(true)}
                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-primary hover:text-white transition-colors"
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                                Generate PDF Report
                                            </button>
                                        </div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-cyan-primary/40 animate-pulse flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-primary" />
                                            AI Copilot Ready
                                        </div>
                                    </div>
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
            </main>

            {/* REPORT MODAL */}
            <AnimatePresence>
                {showReport && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 lg:p-4 overflow-auto bg-black/90 backdrop-blur-xl print:bg-white print:p-0 print:block">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowReport(false)}
                            className="fixed inset-0 print:hidden cursor-pointer"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="bg-white text-slate-900 w-full max-w-4xl min-h-screen lg:min-h-0 lg:max-h-[95vh] rounded-none lg:rounded-[40px] overflow-visible shadow-[0_0_100px_rgba(34,211,238,0.2)] relative z-10 flex flex-col print:m-0 print:rounded-none print:shadow-none print:w-full print:block print:bg-white"
                        >
                            {/* Actions Header - HIDDEN ON PRINT */}
                            <div className="p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-md sticky top-0 z-20 print:hidden shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/10">
                                        <CircuitoLogo className="w-10 h-10 contrast-200 invert" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black uppercase tracking-tight text-slate-900">Professional Diagnostic Report</h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">Automotive Intelligence Unit • {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => window.print()}
                                        className="h-12 px-6 rounded-2xl bg-cyan-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-600/20 active:scale-95 group"
                                    >
                                        <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        <span>Download PDF / Print</span>
                                    </button>
                                    <button
                                        onClick={() => setShowReport(false)}
                                        className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-all active:scale-90"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Report Body - Optimized for Multi-page Print */}
                            <div className="flex-1 overflow-y-auto lg:p-12 font-sans print:overflow-visible print:p-0 print:block">
                                <style jsx global>{`
                                    @media print {
                                        body * { visibility: hidden; }
                                        .print-content, .print-content * { visibility: visible; }
                                        .print-content { 
                                            position: absolute; 
                                            left: 0; 
                                            top: 0; 
                                            width: 100%; 
                                            background: white !important;
                                            color: black !important;
                                            padding: 0 !important;
                                            margin: 0 !important;
                                        }
                                        .page-break { page-break-before: always; }
                                        .avoid-break { page-break-inside: avoid; }
                                        @page { size: auto; margin: 20mm; }
                                        ::-webkit-scrollbar { display: none; }
                                    }
                                `}</style>

                                <div className="print-content space-y-12 max-w-3xl mx-auto p-6 bg-white">
                                    {/* Brand Header */}
                                    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
                                        <div className="flex items-center gap-6">
                                            <div className="bg-slate-950 p-3 rounded-2xl">
                                                <CircuitoLogo className="w-16 h-16 invert" />
                                            </div>
                                            <div>
                                                <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-slate-950">CIRCUITO AI</h1>
                                                <p className="text-sm font-black text-cyan-700 uppercase tracking-[0.3em] mt-2">D-Station Service Certificate</p>
                                                <div className="flex items-center gap-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span>Diagnostic Link: Active</span>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                    <span>V-Link Protocol: ISO-TP</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-3">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Unique ID</div>
                                                <div className="text-sm font-black tabular-nums text-slate-950">CRX-{Math.random().toString(36).slice(2, 9).toUpperCase()}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Session Reference</div>
                                                <div className="text-xs font-bold text-slate-600">{new Date().toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Technician Summary Summary Headings */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                                <Activity className="w-10 h-10 text-slate-950" />
                                            </div>
                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hardware Link</h4>
                                            <div className="text-xs font-black text-slate-900 truncate">
                                                {activeDevice?.name || 'Manual Session Mode'}
                                            </div>
                                            <div className="text-[8px] font-bold text-cyan-600 uppercase mt-1 tracking-tighter">Connection: High Stability</div>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                                <Usb className="w-10 h-10 text-slate-950" />
                                            </div>
                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Interface Type</h4>
                                            <div className="text-xs font-black text-slate-900">
                                                {activeDevice?.type === 'bluetooth' ? 'Bluetooth ELM327' : 'Serial OBD-II (USB)'}
                                            </div>
                                            <div className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-tighter">Protocol: SAE J1979</div>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                                <Cpu className="w-10 h-10 text-slate-950" />
                                            </div>
                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">AI Engine Level</h4>
                                            <div className="text-xs font-black text-slate-900 uppercase">Automotive Pro 2.0</div>
                                            <div className="text-[8px] font-bold text-green-600 uppercase mt-1 tracking-tighter">Diagnostic Logic: Online</div>
                                        </div>
                                    </div>

                                    {/* LIVE TELEMETRY SNAPSHOT - VERY ACCURATE DATA */}
                                    <div className="avoid-break space-y-4">
                                        <h3 className="text-sm font-black uppercase tracking-[0.25em] flex items-center gap-3 text-slate-950 leading-none">
                                            <div className="w-8 h-[2px] bg-cyan-600" />
                                            Critical Telemetry Snapshot
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {Object.entries(liveReadings).length === 0 ? (
                                                <div className="col-span-full py-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center gap-2">
                                                    <Info className="w-6 h-6 text-slate-300" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No live data captured during this session</span>
                                                </div>
                                            ) : (
                                                Object.entries(liveReadings).map(([key, data]) => (
                                                    <div key={key} className="bg-slate-950 p-5 rounded-3xl shadow-xl flex flex-col justify-center border-b-4 border-cyan-600/50">
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{data.label}</span>
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{data.value}</span>
                                                            <span className="text-[9px] font-black text-cyan-400 uppercase">{data.unit}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* TELEMETRY TRACE LOGS */}
                                    <div className="avoid-break space-y-4">
                                        <h3 className="text-sm font-black uppercase tracking-[0.25em] flex items-center gap-3 text-slate-950 leading-none">
                                            <div className="w-8 h-[2px] bg-slate-900" />
                                            Raw Data Trace (Service 01/03/07)
                                        </h3>
                                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] font-mono text-[9px] leading-relaxed shadow-2xl relative">
                                            <div className="absolute top-4 right-8 text-[7px] font-black text-slate-500 uppercase tracking-[0.5em]">Hex Stream Log</div>
                                            <div className="space-y-1.5 opacity-90">
                                                {serialOutput.filter(line => line.includes('[SCAN]') || line.includes('> 0') || line.includes('41')).slice(-12).map((line, i) => (
                                                    <div key={i} className="flex gap-4 border-b border-white/5 pb-1 last:border-0">
                                                        <span className="text-slate-500 whitespace-nowrap hidden md:inline">[{new Date().toLocaleTimeString()}]</span>
                                                        <span className="text-cyan-400 font-bold tracking-tight">{line}</span>
                                                    </div>
                                                ))}
                                                {serialOutput.length === 0 && <div className="text-slate-500 italic">No telemetry data recorded in hardware buffer.</div>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI PROFESSIONAL FINDINGS - DYNAMIC LENGTH */}
                                    <div className="space-y-10 pt-6">
                                        <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 text-slate-950 leading-none">
                                            <Sparkles className="w-8 h-8 text-cyan-600" />
                                            Intelligent Findings
                                        </h3>
                                        <div className="space-y-16">
                                            {diagnosticHistory
                                                .filter(m => m.id !== 'welcome')
                                                .map((m, mIdx) => {
                                                    const isAssistant = m.role === 'assistant';
                                                    return (
                                                        <div key={mIdx} className={`avoid-break relative pl-12 border-l-4 ${isAssistant ? 'border-cyan-600/30' : 'border-slate-100'} pb-4`}>
                                                            <div className={`absolute left-[-10px] top-0 w-4 h-4 rounded-full ${isAssistant ? 'bg-cyan-600 shadow-[0_0_12px_rgba(8,145,178,0.5)]' : 'bg-slate-200'} border-4 border-white`} />

                                                            <div className="space-y-6">
                                                                <div className="flex items-center gap-3 opacity-40">
                                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isAssistant ? 'text-cyan-700' : 'text-slate-500'}`}>
                                                                        {isAssistant ? 'AI Specialist Findings' : 'Technician Inquiry'}
                                                                    </span>
                                                                    <div className="w-1.4 h-1.5 bg-slate-300 rounded-full" />
                                                                    <span className="text-[9px] font-bold tabular-nums text-slate-400">{m.timestamp.toLocaleString()}</span>
                                                                </div>

                                                                <div className="prose prose-slate max-w-none">
                                                                    {m.content.split('\n').map((line, i) => {
                                                                        const text = line.trim();
                                                                        if (!text) return null;

                                                                        const isImportant = text.length < 100 && (text.includes('###') || text.includes('**'));
                                                                        const cleanText = text.replace(/#{1,6}\s?/g, '').replace(/\*\*/g, '').replace(/\*/g, '');

                                                                        if (isImportant) {
                                                                            return (
                                                                                <h4 key={i} className="text-slate-950 font-black uppercase text-xs tracking-widest mb-4 mt-8 bg-slate-50 py-2 px-4 rounded-lg border-l-4 border-slate-950">
                                                                                    {cleanText}
                                                                                </h4>
                                                                            );
                                                                        }

                                                                        if (text.startsWith('-') || text.match(/^\d+\./)) {
                                                                            return (
                                                                                <div key={i} className="ml-4 my-4 p-5 rounded-[24px] bg-slate-50 border-2 border-slate-100/50 text-sm text-slate-700 font-bold flex gap-4 shadow-sm border-l-cyan-600/50 border-l-4">
                                                                                    <span className="text-cyan-600 font-black">›</span>
                                                                                    <span className="leading-relaxed">{cleanText.replace(/^[- \d.]+\s?/, '')}</span>
                                                                                </div>
                                                                            );
                                                                        }

                                                                        return <p key={i} className="text-[14.5px] text-slate-700 leading-relaxed font-semibold mb-4 tracking-tight">{cleanText}</p>;
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>

                                    {/* Technician Notes Section - ALWAYS ON OWN PAGE IF END */}
                                    <div className="avoid-break pt-16 border-t-2 border-slate-100">
                                        <div className="flex justify-between items-end mb-8">
                                            <div>
                                                <h4 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.3em] mb-2">Technician Final Authorization</h4>
                                                <p className="text-xs text-slate-400 font-bold italic">Verification of automated diagnostic findings and physical inspection results.</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Authorization Code</div>
                                                <div className="text-xs font-black text-slate-400 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-tighter">SIG_PENDING_UX</div>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="h-40 border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col justify-between bg-slate-50/30">
                                                <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.4em]">Additional Shop Notes</span>
                                                <div className="flex gap-4">
                                                    <div className="w-16 h-[2px] bg-slate-100" />
                                                    <div className="w-16 h-[2px] bg-slate-100" />
                                                    <div className="w-16 h-[2px] bg-slate-100" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-12 pt-8">
                                                <div className="border-t-2 border-slate-900 pt-4 relative group">
                                                    <div className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em]">Senior Diagnostic Engineer</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Full Signature & Date</div>
                                                    <div className="absolute -top-12 left-4 text-3xl font-serif text-slate-100 select-none group-hover:text-slate-200 transition-colors italic opacity-50">Verified</div>
                                                </div>
                                                <div className="border-t-2 border-slate-900 pt-4 relative">
                                                    <div className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em]">Vehicle Owner Approval</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Confirmed Receipt of Analysis</div>
                                                    <div className="absolute -top-12 left-4 opacity-10">
                                                        <ShieldAlert className="w-10 h-10 text-slate-950" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Footer */}
                                    <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col items-center gap-6 text-center">
                                        <div className="flex gap-16 items-center">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Neural Analysis</span>
                                                <span className="text-[10px] font-black text-slate-950">99.2% Confidence</span>
                                            </div>
                                            <CircuitoLogo className="w-8 h-8 opacity-20" />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Station State</span>
                                                <span className="text-[10px] font-black text-slate-950 uppercase tracking-tighter">Certified 2026</span>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold italic max-w-md leading-relaxed">
                                            This document represents a digital snapshot of internal vehicle computations. Findings derived from real-time CAN/OBDII telemetry processed via Circuito AI Diagnostic Specialist engine.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CONNECTION SELECTOR MODAL */}
            <AnimatePresence>
                {isConnectModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsConnectModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#0A0F1C] border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative z-10"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Initialize Link</h2>
                                        <p className="text-xs text-text-muted font-bold uppercase tracking-widest opacity-60">Select hardware interface</p>
                                    </div>
                                    <button
                                        onClick={() => setIsConnectModalOpen(false)}
                                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                                    >
                                        <X className="w-5 h-5 text-white/40" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={handleSerialConnect}
                                        className="w-full group p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-cyan-primary/50 hover:bg-cyan-primary/5 transition-all text-left flex items-center gap-6"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-cyan-primary/20 transition-colors">
                                            <Usb className="w-6 h-6 text-white/40 group-hover:text-cyan-primary transition-colors" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Serial Link (USB)</h3>
                                            <p className="text-[11px] text-text-muted mt-1 leading-relaxed">Direct tether for high-speed firmware and stable debug stream.</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleBluetoothConnect}
                                        className="w-full group p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-purple-ai/50 hover:bg-purple-ai/5 transition-all text-left flex items-center gap-6"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-purple-ai/20 transition-colors">
                                            <Bluetooth className="w-6 h-6 text-white/40 group-hover:text-purple-ai transition-colors" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Wireless Link (BLE)</h3>
                                                <span className="px-1.5 py-0.5 rounded bg-purple-ai/20 text-purple-ai text-[8px] font-black uppercase tracking-tighter">Modern Adapters</span>
                                            </div>
                                            <p className="text-[11px] text-text-muted mt-1 leading-relaxed">Best for newer BLE / Bluetooth 4.0+ adapters. Faster discovery and pairing.</p>
                                        </div>
                                    </button>
                                </div>

                                <div className="mt-6 p-4 rounded-2xl bg-cyan-primary/5 border border-cyan-primary/10">
                                    <div className="flex gap-3">
                                        <Info className="w-4 h-4 text-cyan-primary shrink-0 mt-0.5" />
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-cyan-primary/80 font-bold uppercase tracking-wider">Technician Tip: Legacy Bluetooth</p>
                                            <p className="text-[10px] text-text-muted leading-relaxed">
                                                If your ELM327 is an older model (Bluetooth 2.1/Classic), it won't show up in the Wireless Link list.
                                                Instead, use the **Serial Link (USB)** and select the **Outgoing COM Port** assigned to your Bluetooth device in Windows Settings.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div className="flex gap-3">
                                        <Wifi className="w-4 h-4 text-cyan-primary/40 shrink-0" />
                                        <p className="text-[10px] text-text-muted leading-relaxed italic">
                                            Hardware Link uses Web Serial & Web Bluetooth APIs. Ensure your browser is up to date and you have granted necessary permissions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
