'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Upload,
    Cpu,
    CircuitBoard,
    CheckCircle2,
    XCircle,
    MonitorSmartphone,
    Bot,
    Usb,
    AlertTriangle,
    ChevronRight,
    Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import IDENavbar from '@/components/ide/navbar';
import Link from 'next/link';
import { BrandZap } from '@/components/ui/brand-zap';
import { isWebSerialSupported, requestPort } from '@/lib/web-serial';
import { getInstalledBoardsList, BoardDefinition } from '@/lib/board-manager';
import BoardManager from '@/components/board-manager';
import { flashEsp32 } from '@/lib/esp-flash';

interface FlashLog {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
}

export default function FlashPage() {
    const [installedBoards, setInstalledBoards] = useState<BoardDefinition[]>([]);
    const [selectedBoard, setSelectedBoard] = useState<BoardDefinition | null>(null);
    const [isBoardManagerOpen, setIsBoardManagerOpen] = useState(false);
    const [connectedPort, setConnectedPort] = useState<SerialPort | null>(null);
    const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
    const [isFlashing, setIsFlashing] = useState(false);
    const [flashProgress, setFlashProgress] = useState(0);
    const [flashStage, setFlashStage] = useState('');
    const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
    const [flashLogs, setFlashLogs] = useState<FlashLog[]>([]);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isSupported = isWebSerialSupported();

    useEffect(() => {
        const boards = getInstalledBoardsList();
        setInstalledBoards(boards);
        if (boards.length > 0 && !selectedBoard) {
            const esp32 = boards.find(b => b.id === 'esp32-devkit-v1');
            setSelectedBoard(esp32 || boards[0]);
        }
    }, [isBoardManagerOpen]);

    const addLog = (message: string, type: FlashLog['type'] = 'info') => {
        const now = new Date();
        const timestamp = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        setFlashLogs((prev) => [...prev, { message, type, timestamp }]);
    };

    // Connect to a real serial port
    const handleConnect = async () => {
        try {
            const device = await requestPort();
            if (device) {
                setConnectedPort(device.port);
                setConnectedDeviceName(device.name);
                addLog(`Device connected: ${device.name}`, 'success');
                if (device.vendorId) {
                    addLog(`VID: 0x${device.vendorId.toString(16).toUpperCase()}, PID: 0x${(device.productId || 0).toString(16).toUpperCase()}`, 'info');
                }
            }
        } catch (err) {
            addLog(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
    };

    const handleDisconnect = async () => {
        if (connectedPort) {
            try {
                await connectedPort.close();
            } catch {
                // Already closed
            }
            setConnectedPort(null);
            setConnectedDeviceName(null);
            addLog('Device disconnected', 'info');
        }
    };

    // Real file upload
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.name.endsWith('.bin') || file.name.endsWith('.hex') || file.name.endsWith('.ino') || file.name.endsWith('.uf2'))) {
            setFirmwareFile(file);
            addLog(`Firmware file selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
        } else if (file) {
            addLog(`Unsupported file type: ${file.name}. Use .bin, .hex, .uf2, or .ino files.`, 'error');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.bin') || file.name.endsWith('.hex') || file.name.endsWith('.uf2'))) {
            setFirmwareFile(file);
            addLog(`Firmware file dropped: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
        } else if (file) {
            addLog(`Unsupported file: ${file.name}`, 'error');
        }
    };

    // Flash firmware via Web Serial
    const startFlash = async () => {
        if (!connectedPort || !firmwareFile) return;

        setIsFlashing(true);
        setFlashProgress(0);
        setTimeElapsed(0);
        setFlashStage('Connecting...');

        addLog('Starting flash process...', 'info');

        try {
            // Read the firmware file
            const buffer = await firmwareFile.arrayBuffer();
            const data = new Uint8Array(buffer);

            addLog(`Firmware size: ${data.length} bytes`, 'info');
            addLog(`Target board: ${selectedBoard?.name || 'Unknown'}`, 'info');

            // Open port for flashing
            if (!connectedPort.readable) {
                await connectedPort.open({ baudRate: 115200 });
            }

            addLog('Port opened at 115200 baud', 'success');
            setFlashStage('Writing firmware...');

            if (selectedBoard?.architecture === 'esp32') {
                addLog('ESP32 detected. Using ESPTool.js injection...', 'info');

                await flashEsp32(data, {
                    port: connectedPort,
                    baudRate: 921600,
                    terminal: {
                        log: (msg) => addLog(msg, 'info'),
                        error: (msg) => addLog(msg, 'error'),
                        write: (msg) => addLog(msg, 'info')
                    },
                    onProgress: (p) => {
                        setFlashProgress(p.percentage);
                        setFlashStage(p.message);
                    }
                });
            } else {
                // Generic / MSD Streaming for non-ESP boards
                const writer = connectedPort.writable?.getWriter();
                if (!writer) throw new Error('Cannot get port writer');

                const chunkSize = 1024;
                const totalChunks = Math.ceil(data.length / chunkSize);

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * chunkSize;
                    const end = Math.min(start + chunkSize, data.length);
                    const chunk = data.slice(start, end);

                    await writer.write(chunk);

                    const progress = ((i + 1) / totalChunks) * 100;
                    setFlashProgress(progress);
                    setFlashStage(`Streaming ${Math.round(progress)}%`);

                    if (Math.floor((i / totalChunks) * 10) !== Math.floor(((i + 1) / totalChunks) * 10)) {
                        addLog(`Writing chunk ${i + 1}/${totalChunks}...`, 'info');
                    }
                }
                writer.releaseLock();
            }

            setFlashProgress(100);
            setFlashStage('Complete!');
            addLog('Flash complete! Board reset successfully.', 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            addLog(`Flash failed: ${message}`, 'error');
            setFlashStage('Failed');
        } finally {
            setIsFlashing(false);
        }
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-surface-base">
            <IDENavbar />

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Main content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-2 text-xs text-text-muted mb-6">
                            <Link href="/" className="hover:text-text-primary transition-colors">
                                Home
                            </Link>
                            <ChevronRight className="w-3 h-3" />
                            <Link href="/devices" className="hover:text-text-primary transition-colors">
                                Device Manager
                            </Link>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-text-primary">Flash Firmware</span>
                        </nav>

                        {/* Title */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                                Flash Firmware
                            </h1>
                            <p className="text-xs sm:text-sm text-text-secondary mb-6 sm:mb-8">
                                Connect your board, select the target, and upload your compiled binary to flash.
                            </p>
                        </motion.div>

                        {/* Browser support warning */}
                        {!isSupported && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-3 p-4 rounded-xl bg-orange-warning/10 border border-orange-warning/20 mb-8"
                            >
                                <AlertTriangle className="w-5 h-5 text-orange-warning shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-orange-warning">Browser Not Supported</p>
                                    <p className="text-xs text-text-secondary mt-0.5">
                                        Web Serial API is required for flashing. Use Chrome or Edge 89+.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 1: Connect Device */}
                        <motion.section
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.05 }}
                            className="mb-10"
                        >
                            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
                                <span className="w-6 h-6 rounded-full bg-cyan-primary/20 text-cyan-primary flex items-center justify-center text-xs font-bold">
                                    1
                                </span>
                                Connect Device
                            </h2>

                            {connectedPort ? (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-success/5 border border-green-success/20">
                                    <CheckCircle2 className="w-5 h-5 text-green-success" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-text-primary">{connectedDeviceName}</p>
                                        <p className="text-xs text-text-muted">Connected via USB Serial</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDisconnect}
                                        className="text-xs border-red-error/30 text-red-error hover:bg-red-error/10"
                                    >
                                        Disconnect
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleConnect}
                                    disabled={!isSupported}
                                    className="w-full h-16 bg-surface-2/50 border border-border-dim hover:border-cyan-primary/30 hover:bg-cyan-primary/5 text-text-primary gap-3 transition-all disabled:opacity-40"
                                    variant="outline"
                                >
                                    <Usb className="w-6 h-6 text-cyan-primary" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium">Select Serial Port</p>
                                        <p className="text-[11px] text-text-muted">Click to open the browser port picker</p>
                                    </div>
                                </Button>
                            )}
                        </motion.section>

                        {/* Step 2: Board Selection */}
                        <motion.section
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="mb-10"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-cyan-primary/20 text-cyan-primary flex items-center justify-center text-xs font-bold">
                                        2
                                    </span>
                                    Select Target Board
                                </h2>
                                <button
                                    onClick={() => setIsBoardManagerOpen(true)}
                                    className="text-xs text-cyan-primary hover:text-cyan-hover transition-colors flex items-center gap-1"
                                >
                                    <Settings className="w-3 h-3" />
                                    Board Manager
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {installedBoards.slice(0, 9).map((board: BoardDefinition, i: number) => (
                                    <motion.button
                                        key={board.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                                        onClick={() => setSelectedBoard(board)}
                                        className={`group relative p-4 rounded-xl border transition-all duration-300 text-left ${selectedBoard?.id === board.id
                                            ? 'bg-cyan-primary/5 border-cyan-primary/40 glow-cyan'
                                            : 'bg-surface-2/50 border-border-dim hover:border-border-bright hover:bg-surface-3/50'
                                            }`}
                                    >
                                        {selectedBoard?.id === board.id && (
                                            <motion.div
                                                layoutId="board-indicator"
                                                className="absolute inset-0 rounded-xl border-2 border-cyan-primary/40"
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}
                                        <div className="mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <Cpu className={`w-10 h-10 ${selectedBoard?.id === board.id ? 'text-cyan-primary' : 'text-text-muted'}`} />
                                        </div>
                                        <h3 className="text-sm font-semibold text-text-primary mb-0.5">
                                            {board.name}
                                        </h3>
                                        <p className="text-[11px] text-text-muted">
                                            {board.mcu || board.architecture} • {board.vendor}
                                        </p>
                                    </motion.button>
                                ))}
                            </div>

                            {installedBoards.length > 9 && (
                                <button
                                    onClick={() => setIsBoardManagerOpen(true)}
                                    className="w-full mt-3 py-2 text-xs text-cyan-primary hover:text-cyan-hover text-center transition-colors"
                                >
                                    + {installedBoards.length - 9} more boards available
                                </button>
                            )}
                        </motion.section>

                        {/* Step 3: Upload Firmware */}
                        <motion.section
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="mb-10"
                        >
                            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
                                <span className="w-6 h-6 rounded-full bg-cyan-primary/20 text-cyan-primary flex items-center justify-center text-xs font-bold">
                                    3
                                </span>
                                Upload Firmware
                            </h2>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".bin,.hex,.uf2,.ino"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative rounded-xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center cursor-pointer ${firmwareFile
                                    ? 'border-green-success/40 bg-green-success/5'
                                    : 'border-border-dim hover:border-cyan-primary/30 hover:bg-cyan-primary/5 bg-surface-2/30'
                                    }`}
                            >
                                {firmwareFile ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <CheckCircle2 className="w-10 h-10 text-green-success" />
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">
                                                {firmwareFile.name}
                                            </p>
                                            <p className="text-xs text-text-muted mt-1">
                                                {(firmwareFile.size / 1024).toFixed(1)} KB — Ready to flash
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFirmwareFile(null);
                                            }}
                                            className="text-xs text-text-muted hover:text-red-error"
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-surface-3/60 flex items-center justify-center">
                                            <Upload className="w-7 h-7 text-cyan-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-primary">
                                                Drag & Drop your .bin, .hex, or .uf2 file here
                                            </p>
                                            <p className="text-xs text-text-muted mt-1">
                                                or click to browse from your computer
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.section>

                        {/* Step 4: Flash */}
                        <motion.section
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                            className="mb-8"
                        >
                            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
                                <span className="w-6 h-6 rounded-full bg-cyan-primary/20 text-cyan-primary flex items-center justify-center text-xs font-bold">
                                    4
                                </span>
                                Flash to Device
                            </h2>

                            <Button
                                size="lg"
                                onClick={startFlash}
                                disabled={isFlashing || !firmwareFile || !connectedPort}
                                className="w-full bg-gradient-to-r from-cyan-primary to-cyan-500 hover:from-cyan-hover hover:to-cyan-600 text-surface-base font-semibold glow-cyan disabled:opacity-40 disabled:cursor-not-allowed h-12 text-sm"
                            >
                                <BrandZap className="w-5 h-5 mr-2" />
                                {isFlashing ? 'Flashing...' : !connectedPort ? 'Connect a device first' : !firmwareFile ? 'Select firmware file first' : 'Start Flash'}
                            </Button>

                            {selectedBoard?.architecture === 'esp32' && (
                                <p className="mt-4 text-[10px] text-yellow-400 bg-yellow-400/5 p-3 rounded-lg border border-yellow-400/20 flex gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                        <strong>Note for ESP32:</strong> Standard serial flashing for ESP32 requires the <code>esptool</code> protocol. This simple flasher is currently best for Mass Storage or UF2 compatible boards. You can still use the <strong>AI Assistant</strong> to debug code while connected via Serial!
                                    </span>
                                </p>
                            )}
                        </motion.section>
                    </div>
                </div>

                {/* Right panel: Flash Progress */}
                <motion.aside
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full lg:w-80 xl:w-96 bg-surface-1 border-t lg:border-t-0 lg:border-l border-border-dim flex flex-col shrink-0 h-[400px] lg:h-auto"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
                        <h3 className="text-sm font-semibold text-text-primary">
                            Flash Progress
                        </h3>
                        <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${connectedPort
                                ? 'border-green-success/40 text-green-success bg-green-success/10'
                                : 'border-red-error/40 text-red-error bg-red-error/10'
                                }`}
                        >
                            {connectedPort ? 'CONNECTED' : 'NOT CONNECTED'}
                        </Badge>
                    </div>

                    {/* Progress circle */}
                    <div className="flex flex-col items-center py-10">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full -rotate-90">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.06)"
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    fill="none"
                                    stroke={flashProgress >= 100 ? '#22C55E' : '#00D9FF'}
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 70}`}
                                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - flashProgress / 100)}`}
                                    className="transition-all duration-500 ease-out"
                                    style={{
                                        filter:
                                            flashProgress > 0
                                                ? `drop-shadow(0 0 6px ${flashProgress >= 100 ? '#22C55E40' : '#00D9FF40'})`
                                                : 'none',
                                    }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-text-primary">
                                    {Math.floor(flashProgress)}%
                                </span>
                                <span className="text-xs text-text-muted mt-1">{flashStage || 'Idle'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mt-6 text-center">
                            <div>
                                <p className="text-[11px] text-text-muted">Time elapsed</p>
                                <p className="text-sm font-semibold text-text-primary mt-0.5">
                                    {`00:${String(Math.floor(timeElapsed)).padStart(2, '0')}s`}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-text-muted">File</p>
                                <p className="text-sm font-semibold text-text-primary mt-0.5 truncate max-w-[120px]">
                                    {firmwareFile?.name || '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Output Log */}
                    <div className="flex-1 flex flex-col border-t border-border-dim">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border-dim">
                            <h4 className="text-xs font-semibold text-text-primary">
                                Output Log
                            </h4>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-1 font-mono text-xs">
                                {flashLogs.length === 0 && (
                                    <p className="text-text-muted italic">
                                        Connect a device and select firmware to begin...
                                    </p>
                                )}
                                {flashLogs.map((log, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className={`flex items-start gap-2 ${log.type === 'success'
                                            ? 'text-green-success'
                                            : log.type === 'warning'
                                                ? 'text-orange-warning'
                                                : log.type === 'error'
                                                    ? 'text-red-error'
                                                    : 'text-text-secondary'
                                            }`}
                                    >
                                        <span className="text-text-muted shrink-0">&gt;</span>
                                        <span>{log.message}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Abort button */}
                    <div className="p-4 border-t border-border-dim">
                        <Button
                            variant="outline"
                            className="w-full border-red-error/30 text-red-error hover:bg-red-error/10 hover:border-red-error/50"
                            disabled={!isFlashing}
                            onClick={() => {
                                setIsFlashing(false);
                                setFlashStage('Aborted');
                                addLog('Flash operation aborted by user.', 'error');
                            }}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Abort Operation
                        </Button>
                    </div>
                </motion.aside>
            </div>

            {/* Board Manager Modal */}
            <BoardManager
                isOpen={isBoardManagerOpen}
                onClose={() => setIsBoardManagerOpen(false)}
                onSelectBoard={(board) => setSelectedBoard(board)}
                mode="selector"
            />
        </div>
    );
}
