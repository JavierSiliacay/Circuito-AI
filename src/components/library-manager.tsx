'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Download,
    Trash2,
    CheckCircle2,
    BookOpen,
    ChevronDown,
    ChevronRight,
    X,
    Copy,
    Check,
    Tag,
    Cpu,
    Monitor,
    Radio,
    Timer,
    Sliders,
    Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArduinoLibrary,
    getAllLibraries,
    installLibrary,
    uninstallLibrary,
    searchLibraries,
    getIncludeStatements,
} from '@/lib/library-manager';

interface LibraryManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertInclude?: (code: string) => void;
}

function getCategoryIcon(category: string) {
    switch (category) {
        case 'Sensors':
            return <Cpu className="w-4 h-4" />;
        case 'Display':
            return <Monitor className="w-4 h-4" />;
        case 'Communication':
            return <Radio className="w-4 h-4" />;
        case 'Timing':
            return <Timer className="w-4 h-4" />;
        case 'Signal Input/Output':
            return <Sliders className="w-4 h-4" />;
        case 'Device Control':
            return <Sliders className="w-4 h-4" />;
        default:
            return <Package className="w-4 h-4" />;
    }
}

function getCategoryColor(category: string): string {
    switch (category) {
        case 'Sensors':
            return 'from-green-500/20 to-green-500/5 text-green-400';
        case 'Display':
            return 'from-blue-500/20 to-blue-500/5 text-blue-400';
        case 'Communication':
            return 'from-purple-500/20 to-purple-500/5 text-purple-400';
        case 'Timing':
            return 'from-orange-500/20 to-orange-500/5 text-orange-400';
        case 'Signal Input/Output':
            return 'from-cyan-500/20 to-cyan-500/5 text-cyan-400';
        case 'Device Control':
            return 'from-red-500/20 to-red-500/5 text-red-400';
        default:
            return 'from-gray-500/20 to-gray-500/5 text-gray-400';
    }
}

export default function LibraryManager({ isOpen, onClose, onInsertInclude }: LibraryManagerProps) {
    const [query, setQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'installed'>('all');
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [selectedLib, setSelectedLib] = useState<ArduinoLibrary | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [libraries, setLibraries] = useState<ArduinoLibrary[]>([]);

    useEffect(() => {
        setLibraries(getAllLibraries());
    }, []);

    const refreshLibraries = () => setLibraries(getAllLibraries());

    const filteredLibs = useMemo(() => {
        let result = query ? searchLibraries(query) : libraries;
        if (filterType === 'installed') {
            result = result.filter((l) => l.installed);
        }
        return result;
    }, [query, libraries, filterType]);

    // Group by category
    const groupedLibs = useMemo(() => {
        const grouped: Record<string, ArduinoLibrary[]> = {};
        for (const lib of filteredLibs) {
            if (!grouped[lib.category]) grouped[lib.category] = [];
            grouped[lib.category].push(lib);
        }
        const sortOrder = ['Sensors', 'Display', 'Communication', 'Device Control', 'Signal Input/Output', 'Timing', 'Data Processing', 'Other'];
        return Object.entries(grouped).sort(([a], [b]) => {
            const ai = sortOrder.indexOf(a);
            const bi = sortOrder.indexOf(b);
            if (ai >= 0 && bi >= 0) return ai - bi;
            if (ai >= 0) return -1;
            if (bi >= 0) return 1;
            return a.localeCompare(b);
        });
    }, [filteredLibs]);

    const handleInstall = (id: string) => {
        installLibrary(id);
        refreshLibraries();
    };

    const handleUninstall = (id: string) => {
        uninstallLibrary(id);
        refreshLibraries();
    };

    const handleCopyInclude = (lib: ArduinoLibrary) => {
        const code = getIncludeStatements(lib.id);
        navigator.clipboard.writeText(code);
        setCopiedId(lib.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleInsertInclude = (lib: ArduinoLibrary) => {
        const code = getIncludeStatements(lib.id);
        if (onInsertInclude) {
            onInsertInclude(code);
            onClose();
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
                    className="w-[960px] max-h-[82vh] bg-surface-1 border border-border-dim rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border-dim flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-ai to-indigo-500 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-text-primary">
                                    Library Manager
                                </h2>
                                <p className="text-[11px] text-text-muted">
                                    {filteredLibs.length} libraries • {filteredLibs.filter((l) => l.installed).length} installed
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
                                placeholder="Search libraries by name, author, #include, or category..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-2/50 border border-border-dim text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-purple-ai/30 transition-colors"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            {(['all', 'installed'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterType === type
                                            ? 'bg-purple-ai/10 text-purple-ai border border-purple-ai/20'
                                            : 'text-text-muted hover:text-text-primary hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Library List */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="p-4 space-y-2">
                            {groupedLibs.map(([category, catLibs]) => (
                                <div key={category} className="rounded-xl border border-border-dim overflow-hidden">
                                    {/* Category header */}
                                    <button
                                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                                        className="w-full flex items-center gap-2 px-4 py-3 bg-surface-2/30 hover:bg-surface-2/50 text-left transition-colors"
                                    >
                                        {expandedCategory === category || query ? (
                                            <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                                        )}
                                        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${getCategoryColor(category)} flex items-center justify-center`}>
                                            {getCategoryIcon(category)}
                                        </div>
                                        <span className="text-sm font-semibold text-text-primary flex-1">
                                            {category}
                                        </span>
                                        <Badge className="bg-white/5 text-text-muted border-border-dim text-[10px]">
                                            {catLibs.length}
                                        </Badge>
                                    </button>

                                    {/* Libraries */}
                                    <AnimatePresence initial={false}>
                                        {(expandedCategory === category || query) && (
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: 'auto' }}
                                                exit={{ height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="divide-y divide-border-dim">
                                                    {catLibs.map((lib) => (
                                                        <div
                                                            key={lib.id}
                                                            onClick={() => setSelectedLib(selectedLib?.id === lib.id ? null : lib)}
                                                            className={`flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedLib?.id === lib.id ? 'bg-purple-ai/5' : ''
                                                                }`}
                                                        >
                                                            {/* Icon */}
                                                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getCategoryColor(lib.category)} flex items-center justify-center shrink-0`}>
                                                                {getCategoryIcon(lib.category)}
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <span className="text-sm font-medium text-text-primary">
                                                                        {lib.name}
                                                                    </span>
                                                                    <span className="text-[10px] text-text-muted font-mono">
                                                                        v{lib.version}
                                                                    </span>
                                                                    {lib.installed && (
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-success shrink-0" />
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] text-text-muted truncate">
                                                                    {lib.author} — {lib.description}
                                                                </p>
                                                            </div>

                                                            {/* Include badge */}
                                                            {lib.includes[0] && (
                                                                <code className="text-[10px] text-cyan-primary bg-cyan-primary/5 px-1.5 py-0.5 rounded shrink-0 hidden lg:block">
                                                                    {lib.includes[0]}
                                                                </code>
                                                            )}

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {/* Copy include */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopyInclude(lib);
                                                                    }}
                                                                    className="h-7 w-7 flex items-center justify-center rounded-md border border-border-dim text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                                                                    title="Copy #include"
                                                                >
                                                                    {copiedId === lib.id ? (
                                                                        <Check className="w-3 h-3 text-green-success" />
                                                                    ) : (
                                                                        <Copy className="w-3 h-3" />
                                                                    )}
                                                                </button>

                                                                {/* Install/Remove */}
                                                                {lib.installed ? (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUninstall(lib.id);
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
                                                                            handleInstall(lib.id);
                                                                        }}
                                                                        className="h-7 text-[11px] bg-purple-ai/10 text-purple-ai border border-purple-ai/20 hover:bg-purple-ai/20 gap-1"
                                                                    >
                                                                        <Download className="w-3 h-3" />
                                                                        Install
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}

                            {filteredLibs.length === 0 && (
                                <div className="text-center py-12">
                                    <Search className="w-8 h-8 text-text-muted mx-auto mb-3" />
                                    <p className="text-sm text-text-muted">
                                        No libraries found for &ldquo;{query}&rdquo;
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selected Library Detail Panel */}
                    <AnimatePresence>
                        {selectedLib && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden border-t border-border-dim"
                            >
                                <div className="px-6 py-4 bg-surface-2/30">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getCategoryColor(selectedLib.category)} flex items-center justify-center shrink-0`}>
                                            {getCategoryIcon(selectedLib.category)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-text-primary mb-0.5">
                                                {selectedLib.name}{' '}
                                                <span className="text-xs font-mono text-text-muted">v{selectedLib.version}</span>
                                            </h3>
                                            <p className="text-xs text-text-muted mb-3">
                                                by {selectedLib.author}
                                            </p>
                                            <p className="text-xs text-text-secondary mb-3">
                                                {selectedLib.description}
                                            </p>

                                            {/* Include preview */}
                                            <div className="bg-surface-base rounded-lg p-3 mb-3 border border-border-dim">
                                                <p className="text-[10px] text-text-muted mb-1.5">INCLUDE IN YOUR CODE:</p>
                                                <pre className="text-xs text-cyan-primary font-mono">
                                                    {selectedLib.includes.map((inc) => `#include <${inc}>`).join('\n')}
                                                </pre>
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-text-muted">
                                                <span className="flex items-center gap-1">
                                                    <Tag className="w-3 h-3" />
                                                    {selectedLib.category}
                                                </span>
                                                <span>
                                                    Architectures: {selectedLib.architectures.join(', ')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Insert button */}
                                        {onInsertInclude && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleInsertInclude(selectedLib)}
                                                className="bg-purple-ai hover:bg-purple-ai/80 text-white font-semibold text-xs shrink-0"
                                            >
                                                Insert #include
                                            </Button>
                                        )}
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
