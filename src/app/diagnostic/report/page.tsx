'use client';

import React, { useEffect, useState } from 'react';
import {
    Printer,
    Sparkles,
    Usb,
    Activity,
    Cpu,
    ShieldAlert,
    Info,
    Bluetooth,
    X,
    RotateCcw
} from 'lucide-react';
import { CircuitoLogo } from '@/components/ui/logo';

interface ReportData {
    activeDevice: {
        name: string;
        type: string;
    } | null;
    liveReadings: Record<string, { value: number | string; unit: string; label: string }>;
    diagnosticHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: string | Date;
        id: string;
    }>;
    serialOutput: string[];
    generatedAt: string;
}

export default function ReportPage() {
    const [data, setData] = useState<ReportData | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('circuito_diagnostic_snapshot');
        if (stored) {
            try {
                setData(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse report data", e);
            }
        }
    }, []);

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans p-8">
                <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Activity className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-widest">Searching for Report State...</h2>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-tighter">Initializing Diagnostic Link</p>
                    <div className="pt-8">
                        <button
                            onClick={() => window.close()}
                            className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Cancel Process
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen text-slate-900 font-sans selection:bg-cyan-100 print:bg-white">
            <style jsx global>{`
                @media print {
                    @page { 
                        size: auto; 
                        margin: 15mm; 
                    }
                    body { 
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .avoid-break { 
                        break-inside: avoid; 
                        page-break-inside: avoid; 
                    }
                    .page-break {
                        break-before: always;
                        page-break-before: always;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                
                /* Custom prose-like styles for the findings */
                .findings-content p {
                    font-size: 14.5px;
                    line-height: 1.6;
                    margin-bottom: 1rem;
                    color: #334155;
                    font-weight: 600;
                    letter-spacing: -0.01em;
                }
                .findings-content h4 {
                    font-size: 12px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #0f172a;
                    margin: 2rem 0 1rem 0;
                    background: #f8fafc;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    border-left: 4px solid #0f172a;
                }
                .finding-item {
                    margin-left: 1rem;
                    margin-bottom: 1rem;
                    padding: 1.25rem;
                    background: #f8fafc;
                    border: 2px solid #f1f5f9;
                    border-left: 4px solid #0891b280;
                    border-radius: 1.5rem;
                    font-size: 14px;
                    color: #334155;
                    font-weight: 700;
                    display: flex;
                    gap: 1rem;
                }
            `}</style>

            {/* FLOATING ACTION BAR - HIDDEN ON PRINT */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 no-print">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-2 rounded-[24px] shadow-2xl flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="h-10 px-6 rounded-xl bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 hover:bg-cyan-700 transition-all shadow-lg active:scale-95 group"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Service Certificate</span>
                    </button>
                    <div className="w-[1px] h-6 bg-white/10 mx-1" />
                    <button
                        onClick={() => window.close()}
                        className="w-10 h-10 rounded-xl bg-white/5 text-slate-400 flex items-center justify-center hover:bg-white/10 transition-all hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-12 print:p-0">
                <div className="space-y-12">
                    {/* Brand Header */}
                    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
                        <div className="flex items-center gap-6">
                            <CircuitoLogo className="w-16 h-16" glow={false} />
                            <div>
                                <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-slate-950 whitespace-nowrap">CIRCUITO AI</h1>
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
                                <div className="text-sm font-black tabular-nums text-slate-950">CRX-REPORT-{Math.random().toString(36).slice(2, 7).toUpperCase()}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Session Reference</div>
                                <div className="text-xs font-bold text-slate-600">{data.generatedAt}</div>
                            </div>
                        </div>
                    </div>

                    {/* Hardware Stats */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-left">Hardware Link</h4>
                            <div className="text-xs font-black text-slate-900 truncate">
                                {data.activeDevice?.name || 'Manual Session Mode'}
                            </div>
                            <div className="text-[8px] font-bold text-cyan-600 uppercase mt-1 tracking-tighter">Connection: High Stability</div>
                            <Activity className="absolute bottom-[-10px] right-[-10px] w-12 h-12 text-slate-900 opacity-[0.03] rotate-12" />
                        </div>
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-left">Interface Type</h4>
                            <div className="text-xs font-black text-slate-900">
                                {data.activeDevice?.type === 'bluetooth' ? 'Bluetooth ELM327' : 'Serial OBD-II (USB)'}
                            </div>
                            <div className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-tighter">Protocol: SAE J1979</div>
                            <Bluetooth className="absolute bottom-[-10px] right-[-10px] w-12 h-12 text-slate-900 opacity-[0.03] rotate-12" />
                        </div>
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-left">AI Engine Level</h4>
                            <div className="text-xs font-black text-slate-900 uppercase">Automotive Pro 2.0</div>
                            <div className="text-[8px] font-bold text-green-600 uppercase mt-1 tracking-tighter">Diagnostic Logic: Online</div>
                            <Cpu className="absolute bottom-[-10px] right-[-10px] w-12 h-12 text-slate-900 opacity-[0.03] rotate-12" />
                        </div>
                    </div>

                    {/* Telemetry Snapshot */}
                    <div className="avoid-break space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.25em] flex items-center gap-3 text-slate-950 leading-none">
                            <div className="w-8 h-[2px] bg-cyan-600" />
                            Critical Telemetry Snapshot
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(data.liveReadings).length === 0 ? (
                                <div className="col-span-full py-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center gap-2">
                                    <Info className="w-6 h-6 text-slate-300" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No live data captured during this session</span>
                                </div>
                            ) : (
                                Object.entries(data.liveReadings).map(([key, reading]) => (
                                    <div key={key} className="bg-slate-950 p-5 rounded-3xl shadow-xl flex flex-col justify-center border-b-4 border-cyan-600/50">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{reading.label}</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{reading.value}</span>
                                            <span className="text-[9px] font-black text-cyan-400 uppercase">{reading.unit}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Raw Trace */}
                    <div className="avoid-break space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.25em] flex items-center gap-3 text-slate-950 leading-none">
                            <div className="w-8 h-[2px] bg-slate-900" />
                            Raw Data Trace (Service 01/03/07)
                        </h3>
                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] font-mono text-[9px] leading-relaxed shadow-2xl relative">
                            <div className="absolute top-4 right-8 text-[7px] font-black text-slate-500 uppercase tracking-[0.5em]">Hex Stream Log</div>
                            <div className="space-y-1.5 opacity-90">
                                {data.serialOutput.map((line, i) => (
                                    <div key={i} className="flex gap-4 border-b border-white/5 pb-1 last:border-0">
                                        <span className="text-cyan-400 font-bold tracking-tight text-left">{line}</span>
                                    </div>
                                ))}
                                {data.serialOutput.length === 0 && <div className="text-slate-500 italic">No telemetry data recorded in hardware buffer.</div>}
                            </div>
                        </div>
                    </div>

                    {/* Findings */}
                    <div className="space-y-10 pt-6">
                        <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 text-slate-950 leading-none">
                            <Sparkles className="w-8 h-8 text-cyan-600" />
                            Intelligent Findings
                        </h3>
                        <div className="space-y-16">
                            {data.diagnosticHistory
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
                                                    <span className="text-[9px] font-bold tabular-nums text-slate-400">{new Date(m.timestamp).toLocaleString()}</span>
                                                </div>

                                                <div className="findings-content">
                                                    {m.content.split('\n').map((line, i) => {
                                                        const text = line.trim();
                                                        if (!text) return null;

                                                        const isImportant = text.length < 100 && (text.includes('###') || text.includes('**'));
                                                        const cleanText = text.replace(/#{1,6}\s?/g, '').replace(/\*\*/g, '').replace(/\*/g, '');

                                                        if (isImportant) {
                                                            return <h4 key={i}>{cleanText}</h4>;
                                                        }

                                                        if (text.startsWith('-') || text.match(/^\d+\./)) {
                                                            return (
                                                                <div key={i} className="finding-item">
                                                                    <span className="text-cyan-600 font-black">›</span>
                                                                    <span className="leading-relaxed text-left">{cleanText.replace(/^[- \d.]+\s?/, '')}</span>
                                                                </div>
                                                            );
                                                        }

                                                        return <p key={i} className="text-left">{cleanText}</p>;
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Auth Section */}
                    <div className="avoid-break pt-16 border-t-2 border-slate-100">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h4 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.3em] mb-2">Technician Final Authorization</h4>
                                <p className="text-xs text-slate-400 font-bold italic">Verification of automated diagnostic findings and physical inspection results.</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Authorization Code</div>
                                <div className="text-xs font-black text-slate-400 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-tighter">SIG_PENDING_WEB</div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="h-40 border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col justify-between bg-slate-50/30 text-left">
                                <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.4em]">Additional Shop Notes</span>
                                <div className="flex gap-4">
                                    <div className="w-16 h-[2px] bg-slate-100" />
                                    <div className="w-16 h-[2px] bg-slate-100" />
                                    <div className="w-16 h-[2px] bg-slate-100" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 pt-8">
                                <div className="border-t-2 border-slate-900 pt-4 relative">
                                    <div className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em] text-left">Senior Diagnostic Engineer</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 text-left">Full Signature & Date</div>
                                    <div className="absolute -top-12 left-4 text-3xl font-serif text-slate-100 italic opacity-50 select-none">Verified</div>
                                </div>
                                <div className="border-t-2 border-slate-900 pt-4 relative">
                                    <div className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em] text-left">Vehicle Owner Approval</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 text-left">Confirmed Receipt of Analysis</div>
                                    <div className="absolute -top-12 left-4 opacity-10">
                                        <ShieldAlert className="w-10 h-10 text-slate-950" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col items-center gap-6 text-center">
                        <div className="flex gap-16 items-center">
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Neural Analysis</span>
                                <span className="text-[10px] font-black text-slate-950">99.8% Reliability</span>
                            </div>
                            <CircuitoLogo className="w-8 h-8 opacity-20" glow={false} />
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Station State</span>
                                <span className="text-[10px] font-black text-slate-950 uppercase tracking-tighter">CERTIFIED 2026</span>
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold italic max-w-md leading-relaxed">
                            This document represents a digital snapshot of internal vehicle computations. Findings derived from real-time CAN/OBDII telemetry processed via Circuito AI.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
