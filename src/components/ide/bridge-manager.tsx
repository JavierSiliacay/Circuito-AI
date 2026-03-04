'use client';

import { useState } from 'react';
import { useIDEStore } from '@/store/ide-store';
import { Monitor, RefreshCcw, CheckCircle2, XCircle, FolderOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function BridgeManager() {
    const {
        isBridgeConnected,
        localProjectPath,
        isBridgeSyncEnabled,
        toggleBridgeSync,
        setDirHandle,
        setBridgeStatus,
        updateLocalFileContent
    } = useIDEStore();

    const [isChecking, setIsChecking] = useState(false);

    const handleBrowseFiles = async () => {
        setIsChecking(true);
        try {
            if (!('showDirectoryPicker' in window)) {
                throw new Error('Your browser does not support the Web File System Access API. Please use Chrome, Edge, or Opera.');
            }

            const dirHandle = await (window as any).showDirectoryPicker({
                mode: 'readwrite'
            });

            let targetFile = '';
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && (entry.name.endsWith('.ino') || entry.name.endsWith('.cpp') || entry.name.endsWith('.c'))) {
                    targetFile = entry.name;
                    break;
                }
            }

            if (!targetFile) {
                throw new Error("No Arduino sketch (.ino, .cpp, .c) found in this folder. Please select your project folder.");
            }

            setDirHandle(dirHandle, targetFile);
            setBridgeStatus('online');

            await updateLocalFileContent();
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                console.error('Failed to select folder:', e);
                alert(e.message || "Failed to open folder.");
            }
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="p-4 space-y-6">
            {/* Connection Status Card */}
            <div className={`p-4 rounded-xl border ${isBridgeConnected
                ? 'bg-green-success/10 border-green-success/20'
                : 'bg-surface-2 border-border-dim'
                }`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isBridgeConnected ? 'bg-green-success/20' : 'bg-surface-3'}`}>
                            <Monitor className={`w-5 h-5 ${isBridgeConnected ? 'text-green-success' : 'text-text-muted'}`} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary">Local File Link</h3>
                            <p className="text-[10px] text-text-muted">
                                {isBridgeConnected ? 'Status: File Linked' : 'Status: No File Selected'}
                            </p>
                        </div>
                    </div>
                </div>

                {isBridgeConnected ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[11px] text-green-success font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            File linked and ready to sync.
                        </div>

                        {/* Selected File */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                                Linked File
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-surface-base border border-border-dim rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none">
                                    {localProjectPath || 'Unknown File'}
                                </div>
                                <Button size="sm" onClick={handleBrowseFiles} className="bg-surface-3 hover:bg-surface-4 text-text-primary text-[10px] h-auto py-1.5 border border-border-dim">
                                    Change
                                </Button>
                            </div>
                        </div>

                        {/* Sync Actions */}
                        <div className="space-y-3 pt-2 border-t border-border-dim/50">
                            <Button
                                onClick={() => useIDEStore.getState().syncToLocalFile(useIDEStore.getState().editorContent, true)}
                                disabled={!localProjectPath}
                                className="w-full bg-purple-ai/10 hover:bg-purple-ai/20 text-purple-ai border border-purple-ai/20 text-[11px] font-bold h-9 gap-2 shadow-sm"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                PUSH TO LOCAL FILE
                            </Button>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-text-primary">Real-time Auto-Sync</p>
                                    <p className="text-[9px] text-text-muted">AI writes directly to your local file</p>
                                </div>
                                <button
                                    onClick={toggleBridgeSync}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${isBridgeSyncEnabled ? 'bg-cyan-primary' : 'bg-surface-3'
                                        }`}
                                >
                                    <motion.div
                                        animate={{ x: isBridgeSyncEnabled ? 20 : 2 }}
                                        className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[11px] text-text-muted">
                            <XCircle className="w-3.5 h-3.5" />
                            Secure browser API used, no external server required.
                        </div>
                        <Button
                            onClick={handleBrowseFiles}
                            disabled={isChecking}
                            className="w-full bg-cyan-primary hover:bg-cyan-hover text-surface-base text-[11px] font-bold gap-2 shadow-sm h-9"
                        >
                            {isChecking ? (
                                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <FolderOpen className="w-3.5 h-3.5" />
                            )}
                            Select Local Arduino File
                        </Button>
                    </div>
                )}
            </div>

            {/* How to use */}
            <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">How it works</h4>
                <div className="space-y-2">
                    {[
                        { icon: FolderOpen, text: 'Select an existing Arduino file (.ino, .cpp) on your PC' },
                        { icon: CheckCircle2, text: 'Grant your browser permission to edit the file' },
                        { icon: RefreshCcw, text: 'AI generated code syncs instantly to your local IDE' }
                    ].map((step, i) => (
                        <div key={i} className="flex gap-2.5 items-start">
                            <div className="p-1 rounded bg-surface-3 mt-0.5">
                                <step.icon className="w-3 h-3 text-cyan-primary" />
                            </div>
                            <p className="text-[10px] text-text-secondary leading-tight">{step.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
