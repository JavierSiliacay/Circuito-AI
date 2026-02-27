'use client';

import {
    FolderOpen,
    Search,
    GitBranch,
    Users,
    Settings,
    CircuitBoard,
} from 'lucide-react';
import { useIDEStore } from '@/store/ide-store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

const sidebarIcons = [
    { id: 'explorer' as const, icon: FolderOpen, label: 'Explorer' },
    { id: 'search' as const, icon: Search, label: 'Search' },
    { id: 'circuits' as const, icon: CircuitBoard, label: 'Circuit Builder' },
    { id: 'team' as const, icon: Users, label: 'Team' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
];

export default function IDESidebar() {
    const { sidebarTab, setSidebarTab } = useIDEStore();

    return (
        <motion.aside
            initial={{ x: -48 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
            className="w-12 bg-surface-1 border-r border-border-dim flex flex-col items-center py-2 gap-1"
        >
            {sidebarIcons.map((item) => {
                const Icon = item.icon;
                const isActive = sidebarTab === item.id;
                return (
                    <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setSidebarTab(item.id)}
                                className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group ${isActive
                                        ? 'text-cyan-primary bg-cyan-primary/10'
                                        : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-indicator"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-primary rounded-r"
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                                <Icon className="w-5 h-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-surface-3 text-text-primary text-xs border-border-dim">
                            {item.label}
                        </TooltipContent>
                    </Tooltip>
                );
            })}

            <div className="flex-1" />

            {/* Git branch indicator */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-secondary rounded-lg hover:bg-white/5 transition-all">
                        <GitBranch className="w-5 h-5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-surface-3 text-text-primary text-xs border-border-dim">
                    Source Control
                </TooltipContent>
            </Tooltip>
        </motion.aside>
    );
}
