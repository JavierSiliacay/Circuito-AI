'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Cpu,
    Wifi,
    WifiOff,
    Signal,
    MoreVertical,
    Plus,
    Search,
    Filter,
    RefreshCw,
    Usb,
    MonitorSmartphone,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import IDENavbar from '@/components/ide/navbar';
import { useSerialStore } from '@/store/serial-store';

function getStatusColor(status: string) {
    switch (status) {
        case 'reading':
            return 'bg-green-success';
        case 'connected':
            return 'bg-orange-warning';
        case 'disconnected':
            return 'bg-text-muted';
        default:
            return 'bg-text-muted';
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'reading':
            return (
                <Badge className="bg-green-success/10 text-green-success border-green-success/30 text-[10px]">
                    Reading
                </Badge>
            );
        case 'connected':
            return (
                <Badge className="bg-orange-warning/10 text-orange-warning border-orange-warning/30 text-[10px]">
                    Connected
                </Badge>
            );
        default:
            return (
                <Badge className="bg-white/5 text-text-muted border-border-dim text-[10px]">
                    Disconnected
                </Badge>
            );
    }
}

export default function DevicesPage() {
    const {
        isSupported,
        devices,
        isConnecting,
        init,
        scanPorts,
        connectDevice,
        disconnectDevice,
        openSerial,
        closeSerial,
    } = useSerialStore();

    useEffect(() => {
        init();
    }, [init]);

    const handleConnectNew = async () => {
        try {
            const id = await connectDevice();
            if (id) {
                // Auto-open serial at default baud rate
                await openSerial(id);
            }
        } catch (err) {
            console.error('Failed to connect:', err);
        }
    };

    const handleDisconnect = async (deviceId: string) => {
        await disconnectDevice(deviceId);
    };

    const handleToggleSerial = async (deviceId: string, status: string) => {
        if (status === 'reading') {
            await closeSerial(deviceId);
        } else {
            await openSerial(deviceId);
        }
    };

    const onlineCount = devices.filter((d) => d.status === 'reading').length;
    const connectedCount = devices.filter((d) => d.status === 'connected').length;
    const disconnectedCount = devices.filter((d) => d.status === 'disconnected').length;

    return (
        <div className="min-h-screen flex flex-col bg-surface-base">
            <IDENavbar />

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Devices</h1>
                        <p className="text-sm text-text-secondary mt-1">
                            Manage your connected serial devices and boards
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => scanPorts()}
                            className="bg-surface-2/50 border-border-dim hover:bg-surface-3 text-xs gap-2"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConnectNew}
                            disabled={!isSupported || isConnecting}
                            className="bg-gradient-to-r from-cyan-primary to-cyan-500 hover:from-cyan-hover hover:to-cyan-600 text-surface-base text-xs gap-2 font-semibold disabled:opacity-40"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            {isConnecting ? 'Connecting...' : 'Connect Device'}
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
                            <p className="text-sm font-medium text-orange-warning">
                                Web Serial API Not Supported
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Your browser does not support the Web Serial API. Please use Google Chrome or Microsoft Edge (version 89+) to connect to hardware devices.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8"
                >
                    {[
                        { label: 'Total Devices', value: String(devices.length), icon: Cpu, color: 'text-cyan-primary' },
                        { label: 'Reading', value: String(onlineCount), icon: Wifi, color: 'text-green-success' },
                        { label: 'Connected', value: String(connectedCount), icon: Signal, color: 'text-orange-warning' },
                        { label: 'Disconnected', value: String(disconnectedCount), icon: WifiOff, color: 'text-text-muted' },
                    ].map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.label}
                                className="p-4 rounded-xl bg-surface-2/30 border border-border-dim"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-text-muted">{stat.label}</span>
                                    <Icon className={`w-4 h-4 ${stat.color}`} />
                                </div>
                                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                            </div>
                        );
                    })}
                </motion.div>

                {/* Device List */}
                {devices.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="flex flex-col items-center justify-center py-20"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-surface-2/50 flex items-center justify-center mb-4">
                            <Usb className="w-10 h-10 text-text-muted" />
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary mb-1">
                            No Devices Connected
                        </h3>
                        <p className="text-sm text-text-muted mb-6 text-center max-w-md">
                            Connect your Arduino, ESP32, or other serial device via USB, then click &ldquo;Connect Device&rdquo; to get started.
                        </p>
                        {isSupported && (
                            <Button
                                onClick={handleConnectNew}
                                disabled={isConnecting}
                                className="bg-gradient-to-r from-cyan-primary to-cyan-500 hover:from-cyan-hover hover:to-cyan-600 text-surface-base font-semibold gap-2"
                            >
                                <Usb className="w-4 h-4" />
                                Connect Your First Device
                            </Button>
                        )}
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        {devices.map((device, i) => (
                            <motion.div
                                key={device.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                                className="group p-4 rounded-xl bg-surface-2/30 border border-border-dim hover:border-border-bright transition-all"
                            >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    {/* Status dot & icon */}
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-xl bg-surface-3/60 flex items-center justify-center">
                                                <Cpu className="w-5 h-5 text-cyan-primary" />
                                            </div>
                                            <span
                                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-base ${getStatusColor(
                                                    device.status
                                                )} ${device.status === 'reading' ? 'animate-pulse-dot' : ''}`}
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <h3 className="text-sm font-semibold text-text-primary">
                                                    {device.name}
                                                </h3>
                                                {getStatusBadge(device.status)}
                                            </div>
                                            <p className="text-xs text-text-muted truncate">
                                                {device.vendorId
                                                    ? `VID: 0x${device.vendorId.toString(16).toUpperCase().padStart(4, '0')}`
                                                    : 'USB Serial Device'}
                                                {device.productId
                                                    ? ` • PID: 0x${device.productId.toString(16).toUpperCase().padStart(4, '0')}`
                                                    : ''}
                                                {device.status === 'reading'
                                                    ? ` • ${device.baudRate} baud`
                                                    : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleSerial(device.id, device.status)}
                                            className="flex-1 sm:flex-none text-xs bg-surface-2/50 border-border-dim hover:bg-surface-3"
                                        >
                                            <MonitorSmartphone className="w-3.5 h-3.5 mr-2" />
                                            {device.status === 'reading' ? 'Stop' : 'Monitor'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDisconnect(device.id)}
                                            className="flex-1 sm:flex-none text-xs border-red-error/30 text-red-error hover:bg-red-error/10"
                                        >
                                            Disconnect
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
