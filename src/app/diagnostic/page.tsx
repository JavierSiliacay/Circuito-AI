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
    Clock,
    Gauge,
    Thermometer,
    ArrowUpRight,
    Fuel,
    Droplets,
    Wind,
    Battery,
    Navigation
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
import { MAINTENANCE_CONFIG } from '@/lib/maintenance-config';

const baudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';

export default function DiagnosticPage() {
    const { user, profile, isLoading } = useAuthStore();
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
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const handleOpenReport = () => {
        const activeDevice = devices.find(d => d.id === useSerialStore.getState().activeDeviceId);

        const reportSnapshot = {
            activeDevice: activeDevice ? { name: activeDevice.name, type: activeDevice.type } : null,
            liveReadings,
            diagnosticHistory,
            serialOutput: serialOutput.filter(line => line.includes('[SCAN]') || line.includes('> 0') || line.includes('41')).slice(-12),
            generatedAt: new Date().toLocaleString()
        };

        localStorage.setItem('circuito_diagnostic_snapshot', JSON.stringify(reportSnapshot));
        window.open('/diagnostic/report', '_blank');
    };

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
        setConnectionError(null);
        try {
            const id = await connectDevice();
            if (id) {
                await openSerial(id, baudRate);
            }
        } catch (err: any) {
            console.error('Diagnostic connection failed:', err);
            setConnectionError(err.message || 'Serial connection failed. Check if port is in use.');
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

    // 0. TEMPORARY BYPASS (Vercel/Auth Outage)
    if (!MAINTENANCE_CONFIG.isAuthBypassEnabled && !isLoading && (!user || !profile?.has_diag_access)) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0D121F] p-8 text-center gap-8">
                <div className="w-24 h-24 rounded-full bg-red-400/10 flex items-center justify-center border border-red-400/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-3 max-w-md">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Access Denied</h1>
                    <p className="text-text-muted leading-relaxed">
                        The Diagnostic Station is a restricted zone. To access professional vehicle telemetry and AI-assisted troubleshooting, you must request an access upgrade and provide proof that you are a mechanic, automotive enthusiast, or automotive student.
                    </p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    {!user ? (
                        <button
                            onClick={() => window.location.href = '/'}
                            className="py-4 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-cyan-primary transition-all shadow-xl shadow-white/5"
                        >
                            Log in to Proceed
                        </button>
                    ) : (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                            <p className="text-[11px] font-bold text-white uppercase opacity-60">
                                Current Status: {profile?.verification_status?.toUpperCase() || 'NOT SUBMITTED'}
                            </p>
                            <div className="space-y-3 w-full">
                                <button
                                    onClick={async () => {
                                        if (profile?.verification_status === 'pending') return;
                                        useAuthStore.getState().setUpgradeModal(true, 'mechanic');
                                    }}
                                    disabled={profile?.verification_status === 'pending'}
                                    className="w-full py-3 rounded-xl bg-cyan-primary/10 border border-cyan-primary/20 text-cyan-primary font-black text-[10px] uppercase tracking-widest hover:bg-cyan-primary/20 transition-all shadow-[0_0_15px_rgba(34,211,238,0.05)] disabled:opacity-50"
                                >
                                    {profile?.verification_status === 'pending' ? 'Verification in Progress' : 'Submit Proof for Approval'}
                                </button>

                                {profile?.verification_status === 'pending' && (
                                    <button
                                        onClick={async () => {
                                            if (!window.confirm('Are you sure you want to cancel your verification request?')) return;

                                            const { error } = await supabase
                                                .from('profiles')
                                                .update({
                                                    verification_status: 'cancelled',
                                                    pending_category: null,
                                                    pending_document_url: null
                                                })
                                                .eq('id', user.id);

                                            if (!error) {
                                                await useAuthStore.getState().checkAuth();
                                                alert('Your request has been successfully cancelled.');
                                            }
                                        }}
                                        className="w-full py-2 text-[9px] font-black text-red-500/50 uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
                                    >
                                        Withdraw Submission
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    <Link href="/" className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] hover:text-white transition-colors">
                        Return to Hub
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none print:bg-white print:h-auto print:overflow-visible print:block">
            {/* NO-PRINT DASHBOARD WRAPPER */}
            <div className="flex-1 flex flex-col min-h-0 print:hidden print-hidden-wrapper">
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
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <TerminalIcon className="w-3.5 h-3.5 text-cyan-primary" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Telemetry Stream</span>
                                </div>
                                {liveReadings['VEHICLE_INFO_02'] && (
                                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-cyan-primary/10 border border-cyan-primary/20">
                                        <div className="w-1 h-1 rounded-full bg-cyan-primary animate-pulse" />
                                        <span className="text-[9px] font-black text-cyan-primary uppercase tracking-widest leading-none">
                                            Vehicle ID: {String(liveReadings['VEHICLE_INFO_02'].value)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        try {
                                            await performFullScan();
                                            handleOpenReport();
                                        } catch (err) {
                                            console.error('Auto-scan failed:', err);
                                        }
                                    }}
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
                                    className="border-b border-white/5 bg-gradient-to-r from-cyan-500/[0.04] via-transparent to-transparent overflow-hidden"
                                >
                                    <div className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {Object.entries(liveReadings).length === 0 ? (
                                            <div className="col-span-full py-4 flex flex-col items-center justify-center gap-3 border border-dashed border-white/5 rounded-[24px] bg-white/[0.02]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-cyan-primary animate-ping" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-primary/60">Initializing ECU Link</span>
                                                </div>
                                                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest italic opacity-40">Polling high-speed CAN traffic...</span>
                                            </div>
                                        ) : (
                                            Object.entries(liveReadings)
                                                .filter(([key]) => !key.startsWith('VEHICLE_INFO_'))
                                                .map(([key, data]) => {
                                                    const isRPM = key === '0C';
                                                    const isVoltage = key === 'VOLTAGE' || key === '42';
                                                    const isSpeed = key === '0D';
                                                    const isTemp = key === '05' || key === '46' || key === '5C';
                                                    const val = Number(data.value);

                                                    if (isRPM) {
                                                        const percentage = Math.min((val / 8000) * 100, 100);
                                                        const rotation = (percentage * 2.4) - 120; // -120 to +120 degrees

                                                        return (
                                                            <motion.div
                                                                key={key}
                                                                layout
                                                                className="relative col-span-2 row-span-2 overflow-hidden bg-[#0D121F] border border-cyan-primary/40 shadow-[0_0_40px_rgba(34,211,238,0.15)] rounded-[32px] p-6 flex flex-col items-center justify-center group"
                                                            >
                                                                {/* Circular Gauge Background */}
                                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08)_0%,transparent_70%)]" />

                                                                <div className="relative w-40 h-40 flex items-center justify-center">
                                                                    {/* Gauge Outer Ring */}
                                                                    <svg className="absolute inset-0 w-full h-full -rotate-[210deg]" viewBox="0 0 100 100">
                                                                        <circle
                                                                            cx="50" cy="50" r="45"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            strokeWidth="2"
                                                                            strokeDasharray="210 280"
                                                                            className="text-white/5"
                                                                        />
                                                                        {/* Progress Arc */}
                                                                        <motion.circle
                                                                            cx="50" cy="50" r="45"
                                                                            fill="none"
                                                                            stroke="url(#gaugeGradient)"
                                                                            strokeWidth="4"
                                                                            strokeDasharray={`${(percentage / 100) * 210} 280`}
                                                                            strokeLinecap="round"
                                                                            initial={{ strokeDasharray: "0 280" }}
                                                                            animate={{ strokeDasharray: `${(percentage / 100) * 210} 280` }}
                                                                            transition={{ type: "spring", stiffness: 50, damping: 15 }}
                                                                        />
                                                                        <defs>
                                                                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                                                <stop offset="0%" stopColor="#22D3EE" />
                                                                                <stop offset="70%" stopColor="#22D3EE" />
                                                                                <stop offset="100%" stopColor="#EF4444" />
                                                                            </linearGradient>
                                                                        </defs>
                                                                    </svg>

                                                                    {/* Needle */}
                                                                    <motion.div
                                                                        className="absolute w-1 h-20 origin-bottom bg-gradient-to-t from-cyan-primary to-transparent rounded-full shadow-[0_0_10px_#22D3EE]"
                                                                        style={{ bottom: '50%', left: 'calc(50% - 2px)' }}
                                                                        animate={{ rotate: rotation }}
                                                                        transition={{ type: "spring", stiffness: 60, damping: 12 }}
                                                                    />

                                                                    {/* Center Cap */}
                                                                    <div className="absolute w-4 h-4 rounded-full bg-[#0D121F] border-2 border-cyan-primary z-20 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />

                                                                    {/* Reading Text */}
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                                                                        <span className="text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                                                            {data.value}
                                                                        </span>
                                                                        <span className="text-[10px] font-black text-cyan-primary uppercase tracking-[0.2em] opacity-80">RPM</span>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-4 flex flex-col items-center gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <Gauge className="w-3 h-3 text-cyan-primary" />
                                                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{data.label}</span>
                                                                    </div>
                                                                    {val > 6000 && (
                                                                        <motion.span
                                                                            initial={{ opacity: 0 }}
                                                                            animate={{ opacity: [0, 1, 0] }}
                                                                            transition={{ repeat: Infinity, duration: 0.5 }}
                                                                            className="text-[9px] font-black text-red-500 uppercase"
                                                                        >
                                                                            Over-Rev Warning
                                                                        </motion.span>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    }

                                                    return (
                                                        <motion.div
                                                            key={key}
                                                            layout
                                                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                                            className={`relative overflow-hidden bg-[#0D121F] border ${isRPM ? 'border-cyan-primary/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'border-white/5'} rounded-[24px] p-4 flex flex-col gap-1.5 hover:border-cyan-primary/50 transition-all group`}
                                                        >
                                                            {/* Background Accent */}
                                                            <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-[0.05] pointer-events-none ${isRPM ? 'bg-cyan-primary' : isTemp ? 'bg-red-500' : 'bg-white'}`} />

                                                            <div className="flex items-center justify-between relative z-10">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`p-1.5 rounded-lg ${isRPM ? 'bg-cyan-primary/10 text-cyan-primary' : 'bg-white/5 text-text-muted'} group-hover:scale-110 transition-transform`}>
                                                                        {isRPM ? <Gauge className="w-3.5 h-3.5" /> :
                                                                            isTemp || key === '46' ? <Thermometer className="w-3.5 h-3.5" /> :
                                                                                isVoltage ? <Battery className="w-3.5 h-3.5" /> :
                                                                                    isSpeed ? <Navigation className="w-3.5 h-3.5" /> :
                                                                                        key === '2F' || key === 'FUEL_LEVEL' ? <Fuel className="w-3.5 h-3.5" /> :
                                                                                            key === '10' || key === '0F' || key === 'INTAKE_TEMP' ? <Wind className="w-3.5 h-3.5" /> :
                                                                                                key === 'A6' || key === '1F' || key.includes('DISTANCE') ? <Clock className="w-3.5 h-3.5" /> :
                                                                                                    key === '5C' || key.includes('OIL') ? <Droplets className="w-3.5 h-3.5" /> :
                                                                                                        key === '04' || key === '43' ? <Cpu className="w-3.5 h-3.5" /> :
                                                                                                            key === '0E' ? <Zap className="w-3.5 h-3.5" /> :
                                                                                                                <Activity className="w-3.5 h-3.5" />}
                                                                    </div>
                                                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest group-hover:text-white transition-colors">{data.label}</span>
                                                                </div>
                                                                <ArrowUpRight className="w-3 h-3 text-white/10 group-hover:text-cyan-primary transition-colors" />
                                                            </div>

                                                            <div className="flex items-baseline gap-1.5 mt-1 relative z-10">
                                                                <span className={`text-2xl font-black tracking-tighter tabular-nums ${isRPM ? 'text-cyan-primary' : 'text-white'}`}>
                                                                    {data.value}
                                                                </span>
                                                                <span className="text-[10px] font-black text-text-muted uppercase opacity-60">{data.unit}</span>
                                                            </div>

                                                            {/* Dynamic Progress Bar */}
                                                            <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden relative z-10">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{
                                                                        width: isRPM ? `${Math.min((val / 7000) * 100, 100)}%` :
                                                                            isSpeed ? `${Math.min((val / 220) * 100, 100)}%` :
                                                                                isTemp ? `${Math.min((val / 120) * 100, 100)}%` : '40%'
                                                                    }}
                                                                    className={`h-full shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all ${isTemp && val > 100 ? 'bg-red-500' : 'bg-cyan-primary'
                                                                        }`}
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })
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
                                            <p className="text-sm text-text-muted max-w-md mx-auto">Establish a serial connection to start streaming vehicle telemetry or activate your custom Arduino Ghost Sniffer.</p>
                                        </div>
                                        <button
                                            onClick={handleSerialConnect} // 👈 Direct connect
                                            className="px-8 py-3 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-cyan-primary transition-all shadow-xl shadow-white/5 transform hover:scale-105 active:scale-95"
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
                                                                        onClick={handleOpenReport}
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
                                                                    {hasMounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
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
                                                    onClick={handleOpenReport}
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
            </div>

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
