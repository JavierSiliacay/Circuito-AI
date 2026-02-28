'use client';

import { useEffect } from 'react';
import {
    AlertTriangle,
    Terminal as TerminalIcon,
    FileOutput,
    Trash2,
    ChevronUp,
    ChevronDown,
    X,
    Usb,
    RotateCcw,
} from 'lucide-react';
import { useIDEStore } from '@/store/ide-store';
import { useSerialStore } from '@/store/serial-store';
import { resetBoardForFlash } from '@/lib/web-serial';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';

const tabs = [
    { id: 'problems' as const, label: 'PROBLEMS', icon: AlertTriangle },
    { id: 'output' as const, label: 'OUTPUT', icon: FileOutput },
    { id: 'serial' as const, label: 'SERIAL MONITOR', icon: TerminalIcon },
    { id: 'terminal' as const, label: 'TERMINAL', icon: TerminalIcon },
];

const baudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export default function BottomPanel() {
    const {
        bottomPanelTab,
        setBottomPanelTab,
        isBottomPanelOpen,
        toggleBottomPanel,
        baudRate,
        setBaudRate,
        outputContent,
        addOutput,
    } = useIDEStore();

    const {
        isSupported,
        devices,
        serialOutput,
        init,
        connectDevice,
        openSerial,
        clearOutput,
    } = useSerialStore();

    useEffect(() => {
        init();
    }, [init]);

    const activeDevice = devices.find((d) => d.status === 'reading');
    const hasConnectedDevice = devices.some((d) => d.status === 'connected' || d.status === 'reading');

    const handleConnectSerial = async () => {
        try {
            const id = await connectDevice();
            if (id) {
                await openSerial(id, baudRate);
            }
        } catch (err) {
            console.error('Serial connection failed:', err);
        }
    };

    return (
        <div className="border-t border-border-dim bg-surface-1 flex flex-col">
            {/* Tab bar */}
            <div className="h-9 flex items-center border-b border-border-dim px-2 gap-0.5">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (bottomPanelTab === tab.id && isBottomPanelOpen) {
                                toggleBottomPanel();
                            } else {
                                setBottomPanelTab(tab.id);
                                if (!isBottomPanelOpen) toggleBottomPanel();
                            }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium tracking-wide rounded-sm transition-all ${bottomPanelTab === tab.id && isBottomPanelOpen
                            ? 'text-text-primary bg-white/5'
                            : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}

                {/* Serial monitor extras */}
                {bottomPanelTab === 'serial' && isBottomPanelOpen && (
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[11px] text-text-muted">Baud Rate:</span>
                        <Select
                            value={baudRate.toString()}
                            onValueChange={(val) => setBaudRate(Number(val))}
                        >
                            <SelectTrigger className="h-6 w-24 text-[11px] bg-surface-3 border-border-dim">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface-3 border-border-dim">
                                {baudRates.map((rate) => (
                                    <SelectItem key={rate} value={rate.toString()} className="text-[11px]">
                                        {rate}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <button
                            onClick={async () => {
                                if (activeDevice?.port) {
                                    addOutput(`[HARDWARE] Manually resetting ${activeDevice.name}...`);
                                    await resetBoardForFlash(activeDevice.port);
                                }
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-cyan-primary hover:bg-cyan-primary/10 rounded transition-all border border-cyan-primary/30"
                            title="Hardware Reset"
                        >
                            <RotateCcw className="w-3 h-3" />
                            RESET BOARD
                        </button>
                    </div>
                )}

                <div className="ml-auto flex items-center gap-1">
                    <button
                        onClick={() => clearOutput()}
                        className="p-1 text-text-muted hover:text-text-secondary transition-colors"
                        title="Clear output"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={toggleBottomPanel}
                        className="p-1 text-text-muted hover:text-text-secondary transition-colors"
                    >
                        {isBottomPanelOpen ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronUp className="w-3.5 h-3.5" />
                        )}
                    </button>
                    <button
                        onClick={() => { if (isBottomPanelOpen) toggleBottomPanel(); }}
                        className="p-1 text-text-muted hover:text-text-secondary transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Panel content */}
            <AnimatePresence>
                {isBottomPanelOpen && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 180 }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <ScrollArea className="h-[180px] bg-surface-2">
                            <div className="p-3 font-mono text-xs">
                                {bottomPanelTab === 'serial' && (
                                    <div className="space-y-0.5">
                                        {!activeDevice ? (
                                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                                <Usb className="w-8 h-8 text-text-muted" />
                                                <p className="text-text-muted text-center">
                                                    No serial device connected.
                                                </p>
                                                {isSupported && (
                                                    <button
                                                        onClick={handleConnectSerial}
                                                        className="text-cyan-primary hover:text-cyan-hover text-xs transition-colors"
                                                    >
                                                        Click to connect a device →
                                                    </button>
                                                )}
                                                {!isSupported && (
                                                    <p className="text-orange-warning text-[10px]">
                                                        Web Serial API not supported. Use Chrome or Edge.
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-text-muted mb-2">
                                                    --- Connected to {activeDevice.name} at {activeDevice.baudRate} baud ---
                                                </div>
                                                {serialOutput.length === 0 ? (
                                                    <div className="text-text-muted italic">
                                                        Waiting for data...
                                                    </div>
                                                ) : (
                                                    serialOutput.slice(-100).map((line, i) => (
                                                        <div
                                                            key={i}
                                                            className="text-text-secondary"
                                                        >
                                                            {line}
                                                        </div>
                                                    ))
                                                )}
                                                <div className="h-1 w-2 bg-cyan-primary animate-pulse inline-block" />
                                            </>
                                        )}
                                    </div>
                                )}

                                {bottomPanelTab === 'problems' && (
                                    <div className="text-text-muted italic">
                                        No problems detected in workspace.
                                    </div>
                                )}

                                {bottomPanelTab === 'output' && (
                                    <div className="space-y-0.5">
                                        {outputContent.length === 0 ? (
                                            <div className="text-text-muted italic">
                                                No build output yet. Click Verify or Upload to compile.
                                            </div>
                                        ) : (
                                            outputContent.map((line, i) => (
                                                <div key={i} className="text-text-secondary">
                                                    {line}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {bottomPanelTab === 'terminal' && (
                                    <div className="space-y-0.5">
                                        <div className="text-text-secondary">
                                            <span className="text-cyan-primary">user@circuito</span>
                                            <span className="text-text-muted">:</span>
                                            <span className="text-purple-ai">~/project</span>
                                            <span className="text-text-muted">$</span>
                                        </div>
                                        <div className="h-1 w-2 bg-cyan-primary animate-pulse inline-block" />
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
