'use client';

import { X, FileCode2, Settings2 } from 'lucide-react';
import { useIDEStore } from '@/store/ide-store';

function getTabIcon(name: string) {
    if (name.endsWith('.cpp') || name.endsWith('.c'))
        return <FileCode2 className="w-3.5 h-3.5 text-cyan-primary" />;
    if (name.endsWith('.ini'))
        return <Settings2 className="w-3.5 h-3.5 text-orange-warning" />;
    return <FileCode2 className="w-3.5 h-3.5 text-text-muted" />;
}

function findFileName(files: typeof useIDEStore.getState extends () => infer S ? (S extends { files: infer F } ? F : never) : never, id: string): string {
    for (const file of files as any[]) {
        if (file.id === id) return file.name;
        if (file.children) {
            const name = findFileName(file.children, id);
            if (name) return name;
        }
    }
    return '';
}

export default function EditorTabs() {
    const { openTabs, activeFileId, files, setActiveFile, closeTab } = useIDEStore();

    return (
        <div className="h-9 bg-surface-1 border-b border-border-dim flex items-end overflow-x-auto">
            {openTabs.map((tabId) => {
                const name = findFileName(files, tabId);
                const isActive = tabId === activeFileId;
                return (
                    <button
                        key={tabId}
                        onClick={() => setActiveFile(tabId)}
                        className={`group relative flex items-center gap-1.5 h-9 px-3 text-xs border-r border-border-dim transition-all ${isActive
                                ? 'bg-surface-2 text-text-primary'
                                : 'bg-surface-1 text-text-muted hover:text-text-secondary hover:bg-surface-2/50'
                            }`}
                    >
                        {/* Active tab top border */}
                        {isActive && (
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-primary" />
                        )}
                        {getTabIcon(name)}
                        <span>{name}</span>
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                closeTab(tabId);
                            }}
                            className="ml-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
                        >
                            <X className="w-3 h-3" />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
