'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
    Activity,
    Cpu,
    Wifi,
    WifiOff,
    Usb,
    Clock,
    RefreshCw,
    Settings,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import IDENavbar from '@/components/ide/navbar';
import { useSerialStore } from '@/store/serial-store';
import Link from 'next/link';

export default function DashboardPage() {
    const { isSupported, devices, serialOutput, init } = useSerialStore();
    const [isLive, setIsLive] = useState(true);

    useEffect(() => {
        init();
    }, [init]);

    const activeDevice = devices.find((d) => d.status === 'reading');
    const hasDevices = devices.length > 0;

    // Parse serial output lines for display
    const recentLines = serialOutput.slice(-50);

    return (
        <div className="min-h-screen flex flex-col bg-surface-base">
            <IDENavbar />

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">IoT Dashboard</h1>
                        <p className="text-sm text-text-secondary mt-1">
                            {activeDevice
                                ? `Live serial output from ${activeDevice.name}`
                                : 'Connect a device to view real-time data'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge
                            variant="outline"
                            className={`${activeDevice
                                ? 'border-green-success/40 text-green-success bg-green-success/10'
                                : 'border-border-dim text-text-muted'
                                } text-[10px] gap-1.5`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${activeDevice ? 'bg-green-success animate-pulse-dot' : 'bg-text-muted'
                                    }`}
                            />
                            {activeDevice ? 'LIVE' : 'NO DEVICE'}
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsLive(!isLive)}
                            disabled={!activeDevice}
                            className="bg-surface-2/50 border-border-dim hover:bg-surface-3 text-xs gap-2"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLive && activeDevice ? 'animate-spin' : ''}`} style={isLive ? { animationDuration: '3s' } : {}} />
                            {isLive ? 'Pause' : 'Resume'}
                        </Button>
                    </div>
                </motion.div>

                {/* Web Serial Support Warning */}
                {!isSupported && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-orange-warning/10 border border-orange-warning/20 mb-6"
                    >
                        <AlertTriangle className="w-5 h-5 text-orange-warning shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-orange-warning">Browser Not Supported</p>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Web Serial API is required for real-time device monitoring. Please use Chrome or Edge.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* No Device Connected */}
                {!activeDevice ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="flex flex-col items-center justify-center py-24"
                    >
                        <div className="w-24 h-24 rounded-2xl bg-surface-2/50 flex items-center justify-center mb-6">
                            <Usb className="w-12 h-12 text-text-muted" />
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary mb-2">
                            No Active Device
                        </h3>
                        <p className="text-sm text-text-muted mb-6 text-center max-w-md">
                            Connect a device and start the serial monitor to view real-time telemetry data here.
                        </p>
                        <Link href="/devices">
                            <Button className="bg-gradient-to-r from-cyan-primary to-cyan-500 hover:from-cyan-hover hover:to-cyan-600 text-surface-base font-semibold gap-2">
                                <Usb className="w-4 h-4" />
                                Go to Devices
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <>
                        {/* Device info bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="flex items-center gap-6 p-4 rounded-xl bg-surface-2/30 border border-border-dim mb-6"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-primary/20 to-cyan-primary/5 flex items-center justify-center">
                                    <Cpu className="w-5 h-5 text-cyan-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">
                                        {activeDevice.name}
                                    </p>
                                    <p className="text-[11px] text-text-muted">
                                        {activeDevice.baudRate} baud
                                        {activeDevice.vendorId ? ` • VID: 0x${activeDevice.vendorId.toString(16).toUpperCase()}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex-1" />
                            <div className="flex items-center gap-6 text-xs">
                                <div className="text-center">
                                    <p className="text-text-muted">Status</p>
                                    <p className="font-semibold text-green-success mt-0.5 flex items-center gap-1">
                                        <Wifi className="w-3 h-3" />
                                        Reading
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-text-muted">Lines Received</p>
                                    <p className="font-semibold text-text-primary mt-0.5">
                                        {serialOutput.length}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Serial Output — Real Data */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.15 }}
                            className="rounded-xl bg-surface-2/30 border border-border-dim overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border-dim">
                                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-cyan-primary" />
                                    Serial Output
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-text-muted">
                                        {serialOutput.length} lines
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => useSerialStore.getState().clearOutput()}
                                        className="text-xs text-text-muted hover:text-text-primary h-6 px-2"
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </div>
                            <div className="h-[400px] overflow-y-auto p-4 font-mono text-xs space-y-0.5">
                                {recentLines.length === 0 ? (
                                    <p className="text-text-muted italic">
                                        Waiting for serial data...
                                    </p>
                                ) : (
                                    recentLines.map((line, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-2 hover:bg-white/[0.02] px-1 py-0.5 rounded transition-colors"
                                        >
                                            <span className="text-text-muted shrink-0">&gt;</span>
                                            <span className="text-text-secondary">{line}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
}
