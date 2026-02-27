'use client';

import { useIDEStore } from '@/store/ide-store';
import { useSerialStore } from '@/store/serial-store';
import { Wifi, WifiOff, Cpu, Circle } from 'lucide-react';
import { useEffect } from 'react';

export default function StatusBar() {
    const { cursorPosition, editorLanguage } = useIDEStore();
    const { devices, init } = useSerialStore();

    useEffect(() => {
        init();
    }, [init]);

    const activeDevice = devices.find((d) => d.status === 'reading' || d.status === 'connected');
    const isConnected = !!activeDevice;

    return (
        <footer className="h-6 bg-surface-1 border-t border-border-dim flex items-center px-3 text-[11px] select-none">
            {/* Left side */}
            <div className="flex items-center gap-3">
                {/* Connection */}
                <div className="flex items-center gap-1.5 text-text-muted">
                    {isConnected ? (
                        <Wifi className="w-3 h-3 text-green-success" />
                    ) : (
                        <WifiOff className="w-3 h-3 text-text-muted" />
                    )}
                    <span>{isConnected ? activeDevice?.name : 'No Device'}</span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                    <Circle className={`w-2 h-2 ${isConnected ? 'fill-green-success text-green-success' : 'fill-text-muted text-text-muted'}`} />
                    <span className={`font-medium ${isConnected ? 'text-green-success' : 'text-text-muted'}`}>
                        {isConnected
                            ? activeDevice?.status === 'reading' ? 'Reading' : 'Connected'
                            : 'Disconnected'}
                    </span>
                </div>
            </div>

            <div className="flex-1" />

            {/* Right side */}
            <div className="flex items-center gap-3 text-text-muted">
                <span>
                    Ln {cursorPosition.line}, Col {cursorPosition.column}
                </span>
                <span>UTF-8</span>
                <span className="uppercase">{editorLanguage === 'cpp' ? 'C++' : editorLanguage}</span>
                <div className="flex items-center gap-1">
                    {isConnected ? (
                        <>
                            <Wifi className="w-3 h-3 text-green-success" />
                            <span className="text-green-success">Connected</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-3 h-3 text-text-muted" />
                            <span className="text-text-muted">Disconnected</span>
                        </>
                    )}
                </div>
            </div>
        </footer>
    );
}
