'use client';

import {
    ChevronRight,
    ChevronDown,
    FileCode2,
    FileText,
    FolderOpen,
    Folder,
    Settings2,
    MoreHorizontal,
} from 'lucide-react';
import { useIDEStore, FileNode } from '@/store/ide-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

function getFileIcon(name: string) {
    if (name.endsWith('.cpp') || name.endsWith('.c') || name.endsWith('.ino'))
        return <FileCode2 className="w-4 h-4 text-cyan-primary" />;
    if (name.endsWith('.h'))
        return <FileCode2 className="w-4 h-4 text-green-success" />;
    if (name.endsWith('.ini'))
        return <Settings2 className="w-4 h-4 text-orange-warning" />;
    if (name.endsWith('.md'))
        return <FileText className="w-4 h-4 text-blue-400" />;
    return <FileText className="w-4 h-4 text-text-muted" />;
}

function FileTreeItem({
    node,
    depth = 0,
}: {
    node: FileNode;
    depth?: number;
}) {
    const { activeFileId, setActiveFile } = useIDEStore();
    const [isOpen, setIsOpen] = useState(node.isOpen ?? false);
    const isActive = node.id === activeFileId;

    if (node.type === 'folder') {
        return (
            <div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center gap-1 py-1 px-2 text-xs hover:bg-white/5 transition-colors group`}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
                    {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    )}
                    {isOpen ? (
                        <FolderOpen className="w-4 h-4 text-cyan-primary/70 shrink-0" />
                    ) : (
                        <Folder className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                    <span className="truncate text-text-secondary group-hover:text-text-primary transition-colors">
                        {node.name}
                    </span>
                </button>
                <AnimatePresence initial={false}>
                    {isOpen && node.children && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                        >
                            {node.children.map((child) => (
                                <FileTreeItem
                                    key={child.id}
                                    node={child}
                                    depth={depth + 1}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <button
            onClick={() => setActiveFile(node.id)}
            className={`w-full flex items-center gap-1.5 py-1 px-2 text-xs transition-all ${isActive
                    ? 'bg-cyan-primary/10 text-text-primary'
                    : 'hover:bg-white/5 text-text-secondary hover:text-text-primary'
                }`}
            style={{ paddingLeft: `${depth * 12 + 24}px` }}
        >
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
            {node.name === 'main.cpp' && (
                <span className="ml-auto text-[10px] bg-surface-4 text-text-muted px-1.5 py-0.5 rounded font-medium">
                    M
                </span>
            )}
        </button>
    );
}

export default function FileExplorer() {
    const { files } = useIDEStore();

    return (
        <div className="w-56 bg-surface-1 border-r border-border-dim flex flex-col shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-dim">
                <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
                    Explorer
                </span>
                <button className="text-text-muted hover:text-text-secondary transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            {/* File Tree */}
            <ScrollArea className="flex-1">
                <div className="py-1">
                    {files.map((node) => (
                        <FileTreeItem key={node.id} node={node} />
                    ))}
                </div>
            </ScrollArea>

            {/* Outline */}
            <div className="border-t border-border-dim">
                <button className="w-full flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold tracking-wider text-text-muted uppercase">
                    <ChevronDown className="w-3 h-3" />
                    Outline
                </button>
                <div className="px-4 pb-3 space-y-1">
                    {[
                        { icon: '🔤', name: 'ledPin', type: 'variable' },
                        { icon: '⚡', name: 'setup()', type: 'function' },
                        { icon: '⚡', name: 'loop()', type: 'function' },
                    ].map((item) => (
                        <div
                            key={item.name}
                            className="flex items-center gap-2 py-0.5 text-xs text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                        >
                            <span className="text-[10px]">{item.icon}</span>
                            <span>{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
