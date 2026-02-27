'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu,
    Search,
    Download,
    Trash2,
    CheckCircle2,
    CircuitBoard,
    ChevronDown,
    ChevronRight,
    Filter,
    Info,
    X,
    ExternalLink,
    Wifi,
    Bluetooth,
    Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    BoardDefinition,
    getAllBoards,
    installBoard,
    uninstallBoard,
    searchBoards,
    getBoardsByVendor,
} from '@/lib/board-manager';

interface BoardManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectBoard?: (board: BoardDefinition) => void;
    mode?: 'manager' | 'selector';
}

function getFeatureIcon(feature: string) {
    const f = feature.toLowerCase();
    if (f.includes('wi-fi') || f.includes('wifi')) return <Wifi className="w-3 h-3" />;
    if (f.includes('ble') || f.includes('bluetooth')) return <Bluetooth className="w-3 h-3" />;
    return null;
}

function getArchColor(arch: string): string {
    switch (arch) {
        case 'avr':
            return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'esp32':
            return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case 'esp8266':
            return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        case 'samd':
            return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case 'stm32':
            return 'bg-red-500/10 text-red-400 border-red-500/20';
        case 'rp2040':
            return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
        case 'sam':
            return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
        case 'mbed_nano':
        case 'mbed_portenta':
        case 'mbed_giga':
            return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        case 'renesas_uno':
            return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        case 'megaavr':
            return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
        default:
            return 'bg-white/5 text-text-muted border-border-dim';
    }
}

export default function BoardManager({ isOpen, onClose, onSelectBoard, mode = 'manager' }: BoardManagerProps) {
    const [query, setQuery] = useState('');
    const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'installed' | 'available'>('all');
    const [selectedBoard, setSelectedBoard] = useState<BoardDefinition | null>(null);
    const [boards, setBoards] = useState<BoardDefinition[]>([]);

    useEffect(() => {
        setBoards(getAllBoards());
    }, []);

    const refreshBoards = () => setBoards(getAllBoards());

    const filteredBoards = useMemo(() => {
        let result = query ? searchBoards(query) : boards;

        if (filterType === 'installed') {
            result = result.filter((b) => b.installed);
        } else if (filterType === 'available') {
            result = result.filter((b) => !b.installed);
        }

        return result;
    }, [query, boards, filterType]);

    // Group by vendor
    const groupedBoards = useMemo(() => {
        const grouped: Record<string, BoardDefinition[]> = {};
        for (const board of filteredBoards) {
            if (!grouped[board.vendor]) grouped[board.vendor] = [];
            grouped[board.vendor].push(board);
        }
        // Sort vendors: put Arduino and Espressif first
        const sortOrder = ['Arduino', 'Espressif', 'ESP8266 Community', 'Raspberry Pi', 'STMicroelectronics', 'Adafruit', 'Seeed Studio', 'SparkFun', 'PJRC'];
        const entries = Object.entries(grouped).sort(([a], [b]) => {
            const ai = sortOrder.indexOf(a);
            const bi = sortOrder.indexOf(b);
            if (ai >= 0 && bi >= 0) return ai - bi;
            if (ai >= 0) return -1;
            if (bi >= 0) return 1;
            return a.localeCompare(b);
        });
        return entries;
    }, [filteredBoards]);

    const handleInstall = (boardId: string) => {
        installBoard(boardId);
        refreshBoards();
    };

    const handleUninstall = (boardId: string) => {
        uninstallBoard(boardId);
        refreshBoards();
    };

    const handleSelect = (board: BoardDefinition) => {
        if (mode === 'selector' && onSelectBoard) {
            onSelectBoard(board);
            onClose();
        } else {
            setSelectedBoard(selectedBoard?.id === board.id ? null : board);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-[900px] max-h-[80vh] bg-surface-1 border border-border-dim rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border-dim flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-primary to-cyan-500 flex items-center justify-center">
                                <CircuitBoard className="w-5 h-5 text-surface-base" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-text-primary">
                                    {mode === 'selector' ? 'Select Board' : 'Board Manager'}
                                </h2>
                                <p className="text-[11px] text-text-muted">
                                    {filteredBoards.length} boards • {filteredBoards.filter((b) => b.installed).length} installed
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search & Filters */}
                    <div className="px-6 py-3 border-b border-border-dim flex items-center gap-3 shrink-0">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search boards by name, MCU, vendor, or features..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-2/50 border border-border-dim text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-cyan-primary/30 transition-colors"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            {(['all', 'installed', 'available'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterType === type
                                            ? 'bg-cyan-primary/10 text-cyan-primary border border-cyan-primary/20'
                                            : 'text-text-muted hover:text-text-primary hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Board List */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="p-4 space-y-2">
                            {groupedBoards.map(([vendor, vendorBoards]) => (
                                <div key={vendor} className="rounded-xl border border-border-dim overflow-hidden">
                                    {/* Vendor header */}
                                    <button
                                        onClick={() => setExpandedVendor(expandedVendor === vendor ? null : vendor)}
                                        className="w-full flex items-center gap-2 px-4 py-3 bg-surface-2/30 hover:bg-surface-2/50 text-left transition-colors"
                                    >
                                        {expandedVendor === vendor ? (
                                            <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                                        )}
                                        <span className="text-sm font-semibold text-text-primary flex-1">
                                            {vendor}
                                        </span>
                                        <Badge className="bg-white/5 text-text-muted border-border-dim text-[10px]">
                                            {vendorBoards.length} boards
                                        </Badge>
                                    </button>

                                    {/* Boards */}
                                    <AnimatePresence initial={false}>
                                        {(expandedVendor === vendor || query) && (
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: 'auto' }}
                                                exit={{ height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="divide-y divide-border-dim">
                                                    {vendorBoards.map((board) => (
                                                        <div
                                                            key={board.id}
                                                            onClick={() => handleSelect(board)}
                                                            className={`flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedBoard?.id === board.id ? 'bg-cyan-primary/5' : ''
                                                                }`}
                                                        >
                                                            {/* Board icon */}
                                                            <div className="w-9 h-9 rounded-lg bg-surface-3/60 flex items-center justify-center shrink-0">
                                                                <Cpu className="w-5 h-5 text-text-muted" />
                                                            </div>

                                                            {/* Board info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <span className="text-sm font-medium text-text-primary">
                                                                        {board.name}
                                                                    </span>
                                                                    {board.installed && (
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-success shrink-0" />
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                                                                    {board.mcu && <span>{board.mcu}</span>}
                                                                    {board.frequency && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>{board.frequency}</span>
                                                                        </>
                                                                    )}
                                                                    {board.flashSize && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>{board.flashSize} Flash</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Architecture badge */}
                                                            <Badge
                                                                className={`text-[10px] font-mono shrink-0 ${getArchColor(board.architecture)}`}
                                                            >
                                                                {board.architecture}
                                                            </Badge>

                                                            {/* Action button */}
                                                            {mode === 'manager' && (
                                                                <div className="shrink-0">
                                                                    {board.installed ? (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleUninstall(board.id);
                                                                            }}
                                                                            className="h-7 text-[11px] border-red-error/20 text-red-error hover:bg-red-error/10 gap-1"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                            Remove
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleInstall(board.id);
                                                                            }}
                                                                            className="h-7 text-[11px] bg-cyan-primary/10 text-cyan-primary border border-cyan-primary/20 hover:bg-cyan-primary/20 gap-1"
                                                                        >
                                                                            <Download className="w-3 h-3" />
                                                                            Install
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {mode === 'selector' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSelect(board);
                                                                    }}
                                                                    className="h-7 text-[11px] bg-cyan-primary hover:bg-cyan-hover text-surface-base font-semibold"
                                                                >
                                                                    Select
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}

                            {filteredBoards.length === 0 && (
                                <div className="text-center py-12">
                                    <Search className="w-8 h-8 text-text-muted mx-auto mb-3" />
                                    <p className="text-sm text-text-muted">
                                        No boards found for &ldquo;{query}&rdquo;
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Board Detail Panel (when selected) */}
                    <AnimatePresence>
                        {selectedBoard && mode === 'manager' && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden border-t border-border-dim"
                            >
                                <div className="px-6 py-4 bg-surface-2/30">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-primary/20 to-cyan-primary/5 flex items-center justify-center shrink-0">
                                            <Cpu className="w-6 h-6 text-cyan-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-text-primary mb-1">
                                                {selectedBoard.name}
                                            </h3>
                                            <p className="text-xs text-text-muted mb-3">
                                                {selectedBoard.platform} • FQBN: <code className="text-cyan-primary">{selectedBoard.fqbn}</code>
                                            </p>
                                            <div className="grid grid-cols-4 gap-3 text-xs mb-3">
                                                {selectedBoard.mcu && (
                                                    <div>
                                                        <span className="text-text-muted">MCU</span>
                                                        <p className="font-medium text-text-primary">{selectedBoard.mcu}</p>
                                                    </div>
                                                )}
                                                {selectedBoard.frequency && (
                                                    <div>
                                                        <span className="text-text-muted">Clock</span>
                                                        <p className="font-medium text-text-primary">{selectedBoard.frequency}</p>
                                                    </div>
                                                )}
                                                {selectedBoard.flashSize && (
                                                    <div>
                                                        <span className="text-text-muted">Flash</span>
                                                        <p className="font-medium text-text-primary">{selectedBoard.flashSize}</p>
                                                    </div>
                                                )}
                                                {selectedBoard.ramSize && (
                                                    <div>
                                                        <span className="text-text-muted">RAM</span>
                                                        <p className="font-medium text-text-primary">{selectedBoard.ramSize}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {selectedBoard.features.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {selectedBoard.features.map((feature) => (
                                                        <span
                                                            key={feature}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-text-muted border border-border-dim"
                                                        >
                                                            {getFeatureIcon(feature)}
                                                            {feature}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
