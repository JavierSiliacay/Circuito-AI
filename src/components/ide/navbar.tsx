'use client';

import {
    Zap,
    ChevronDown,
    Settings,
    Wifi,
    WifiOff,
    Usb,
    CircuitBoard,
    Cpu,
    BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSerialStore } from '@/store/serial-store';
import { useEffect, useState } from 'react';
import BoardManager from '@/components/board-manager';
import LibraryManager from '@/components/library-manager';
import { BoardDefinition, getInstalledBoardsList } from '@/lib/board-manager';
import { useIDEStore } from '@/store/ide-store';

const menuItems = ['File', 'Edit', 'Selection', 'View', 'Go', 'Run'];

export default function IDENavbar() {
    const pathname = usePathname();
    const isIDE = pathname === '/ide';
    const { isSupported, devices, init, connectDevice, openSerial } = useSerialStore();
    const { device, setDevice } = useIDEStore();
    const [isBoardManagerOpen, setIsBoardManagerOpen] = useState(false);
    const [isLibraryManagerOpen, setIsLibraryManagerOpen] = useState(false);
    const [selectedBoard, setSelectedBoard] = useState<BoardDefinition | null>(null);

    useEffect(() => {
        init();
    }, [init]);

    // Load the first installed board as default
    useEffect(() => {
        if (!selectedBoard) {
            const installed = getInstalledBoardsList();
            if (installed.length > 0) {
                const esp32 = installed.find(b => b.id === 'esp32-devkit-v1');
                setSelectedBoard(esp32 || installed[0]);
            }
        }
    }, [selectedBoard]);

    const activeDevice = devices.find((d) => d.status === 'reading' || d.status === 'connected');
    const isDeviceConnected = !!activeDevice;

    const handleConnectDevice = async () => {
        try {
            const id = await connectDevice();
            if (id) {
                await openSerial(id);
            }
        } catch (err) {
            console.error('Failed to connect:', err);
        }
    };

    const handleBoardSelect = (board: BoardDefinition) => {
        setSelectedBoard(board);
        setDevice({
            board: board.name,
            chipType: board.mcu,
        });
    };

    return (
        <>
            <motion.header
                initial={{ y: -48 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-12 bg-surface-1 border-b border-border-dim flex items-center px-3 gap-2 z-50 select-none"
            >
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 mr-2 group">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-primary to-cyan-500 flex items-center justify-center glow-cyan transition-all duration-300 group-hover:scale-110">
                        <Zap className="w-4 h-4 text-surface-base" />
                    </div>
                    <span className="text-sm font-bold tracking-tight text-text-primary">
                        Circuito AI
                    </span>
                </Link>

                {/* Menu items (only in IDE view) */}
                {isIDE && (
                    <nav className="hidden md:flex items-center gap-0.5 ml-2">
                        {menuItems.map((item) => (
                            <button
                                key={item}
                                className="px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded transition-colors"
                            >
                                {item}
                            </button>
                        ))}
                    </nav>
                )}

                {/* Navigation Links (non-IDE pages) */}
                {!isIDE && (
                    <nav className="hidden md:flex items-center gap-1 ml-4">
                        {[
                            { href: '/ide', label: 'IDE' },
                            { href: '/flash', label: 'Flash' },
                            { href: '/devices', label: 'Devices' },
                            { href: '/circuits', label: 'Circuits' },
                            { href: '/dashboard', label: 'Dashboard' },
                        ].map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${pathname === link.href
                                    ? 'text-cyan-primary bg-cyan-primary/10'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                )}

                <div className="flex-1" />

                {/* Board Selector */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsBoardManagerOpen(true)}
                    className="h-7 px-3 text-xs gap-1.5 bg-surface-3/60 border border-border-dim hover:bg-surface-4 hover:border-border-bright"
                >
                    <Cpu className="w-3 h-3 text-cyan-primary" />
                    <span className="text-text-primary font-medium">
                        {selectedBoard?.name || 'Select Board'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-text-muted" />
                </Button>

                {/* Library Manager */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLibraryManagerOpen(true)}
                    className="h-7 px-3 text-xs gap-1.5 bg-surface-3/60 border border-border-dim hover:bg-surface-4 hover:border-border-bright"
                >
                    <BookOpen className="w-3 h-3 text-purple-ai" />
                    <span className="text-text-muted">Libraries</span>
                </Button>

                {/* Device Connection Status */}
                {isDeviceConnected ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-surface-3/60 border border-border-dim text-xs">
                        <span className="w-2 h-2 rounded-full bg-green-success animate-pulse-dot" />
                        <span className="text-text-primary font-medium">
                            {activeDevice?.name || 'Device'}
                        </span>
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleConnectDevice}
                        disabled={!isSupported}
                        className="h-7 px-3 text-xs gap-1.5 bg-surface-3/60 border border-border-dim hover:bg-surface-4 hover:border-border-bright"
                    >
                        <WifiOff className="w-3 h-3 text-text-muted" />
                        <span className="text-text-muted">No Device</span>
                        {isSupported && (
                            <span className="text-cyan-primary text-[10px]">Connect</span>
                        )}
                    </Button>
                )}

                {/* Flash Button */}
                <Link href="/flash">
                    <Button
                        size="sm"
                        className="h-7 px-4 text-xs font-semibold bg-gradient-to-r from-cyan-primary to-cyan-500 hover:from-cyan-hover hover:to-cyan-600 text-surface-base glow-cyan transition-all duration-200"
                    >
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Flash
                    </Button>
                </Link>

                {/* Settings */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-text-muted hover:text-text-primary hover:bg-white/5"
                >
                    <Settings className="w-4 h-4" />
                </Button>

                {/* User Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-ai to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer hover:ring-2 hover:ring-cyan-primary/40 transition-all">
                    U
                </div>
            </motion.header>

            {/* Board Manager Modal */}
            <BoardManager
                isOpen={isBoardManagerOpen}
                onClose={() => setIsBoardManagerOpen(false)}
                onSelectBoard={handleBoardSelect}
                mode="selector"
            />

            {/* Library Manager Modal */}
            <LibraryManager
                isOpen={isLibraryManagerOpen}
                onClose={() => setIsLibraryManagerOpen(false)}
            />
        </>
    );
}
