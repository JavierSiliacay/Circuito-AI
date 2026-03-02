'use client';

import { useState, useEffect } from 'react';
import { useIDEStore } from '@/store/ide-store';
import { Monitor, RefreshCcw, CheckCircle2, XCircle, FolderOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function BridgeManager() {
    const {
        isBridgeConnected,
        bridgeStatus,
        localProjectPath,
        isBridgeSyncEnabled,
        setLocalProjectPath,
        toggleBridgeSync,
        checkBridgeConnection
    } = useIDEStore();

    const [isChecking, setIsChecking] = useState(false);
    const [pathInput, setPathInput] = useState(localProjectPath);

    useEffect(() => {
        setPathInput(localProjectPath);
    }, [localProjectPath]);

    const handleCheck = async () => {
        setIsChecking(true);
        await checkBridgeConnection();
        setIsChecking(false);
    };

    const handleSavePath = () => {
        setLocalProjectPath(pathInput);
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
                            <h3 className="text-sm font-semibold text-text-primary">Desktop Bridge</h3>
                            <p className="text-[10px] text-text-muted">
                                {isBridgeConnected ? 'Status: Connected' : 'Status: Offline'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCheck}
                        disabled={isChecking}
                        className="h-8 w-8 hover:bg-surface-3"
                    >
                        <RefreshCcw className={`w-4 h-4 ${isChecking ? 'animate-spin text-cyan-primary' : 'text-text-muted'}`} />
                    </Button>
                </div>

                {isBridgeConnected ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[11px] text-green-success font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Bridge is authorized and ready to sync.
                        </div>

                        {/* Path Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                                Local Project path (.ino / .cpp)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={pathInput}
                                    onChange={(e) => setPathInput(e.target.value)}
                                    placeholder="C:\Users\...\Blink.ino"
                                    className="flex-1 bg-surface-base border border-border-dim rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none focus:border-cyan-primary/50"
                                />
                                <Button size="sm" onClick={handleSavePath} className="bg-cyan-primary hover:bg-cyan-hover text-surface-base text-[10px] h-auto py-1.5">
                                    Set
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
                                PUSH TO LOCAL IDE
                            </Button>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-text-primary">Real-time Auto-Sync</p>
                                    <p className="text-[9px] text-text-muted">AI writes directly to your IDE</p>
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
                            Bridge app not detected locally.
                        </div>
                        <Button
                            className="w-full bg-surface-3 hover:bg-surface-4 text-text-primary text-[11px] gap-2 border border-border-dim"
                        >
                            <Zap className="w-3.5 h-3.5 text-yellow-500" />
                            Download Bridge Tool
                        </Button>
                    </div>
                )}
            </div>

            {/* How to use */}
            <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">How it works</h4>
                <div className="space-y-2">
                    {[
                        { icon: Zap, text: 'Run the desktop-bridge server locally' },
                        { icon: FolderOpen, text: 'Paste your local Arduino sketch path above' },
                        { icon: RefreshCcw, text: 'Changes here sync instantly to your local IDE' }
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
