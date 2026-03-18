import { create } from 'zustand';
import {
    isWebSerialSupported,
    getGrantedPorts,
    requestPort,
    openConnection,
    closeConnection,
    readSerial,
    writeSerial,
    onSerialConnect,
    onSerialDisconnect,
    SerialDeviceInfo,
    SerialConnection,
} from '@/lib/web-serial';
import {
    isWebBluetoothSupported,
    requestBLEDevice,
    connectBLE,
    writeBLE,
    disconnectBLE,
    BluetoothConnection
} from '@/lib/web-bluetooth';
import { OBD_SERVICES, decodeOBDResponse, parseOBDLine } from '@/lib/obd-utils';
import { AIMessage } from './ide-store';

export interface ConnectedDevice {
    id: string;
    name: string;
    port?: SerialPort;         // Optional for Bluetooth
    device?: any;  // Use any to avoid missing Web Bluetooth types in some environments
    connection: SerialConnection | BluetoothConnection | null;
    type: 'serial' | 'bluetooth';
    baudRate?: number;
    status: 'connected' | 'disconnected' | 'reading';
    vendorId?: number;
    productId?: number;
    mode?: 'obd' | 'sniffer'; // 👈 NEW: Track connection capability
}

interface SerialState {
    // State
    isSupported: boolean;
    devices: ConnectedDevice[];
    activeDeviceId: string | null;
    serialOutput: string[];
    isConnecting: boolean;

    // Actions
    init: () => void;
    scanPorts: () => Promise<void>;
    connectDevice: () => Promise<string | null>;
    connectBluetooth: () => Promise<string | null>;
    disconnectDevice: (deviceId: string) => Promise<void>;
    openSerial: (deviceId: string, baudRate?: number) => Promise<void>;
    closeSerial: (deviceId: string) => Promise<void>;
    sendData: (deviceId: string, data: string) => Promise<void>;
    clearOutput: () => void;
    setActiveDevice: (deviceId: string | null) => void;

    // Internal tracking
    readerCleanup: (() => void) | null;

    // Diagnostic Addition
    diagnosticHistory: AIMessage[];
    diagnosticInsights: string[];
    isAnalyzing: boolean;
    isScanning: boolean;
    liveReadings: Record<string, { value: number | string; unit: string; label: string }>;
    analyzeDiagnostic: (customMessage?: string) => Promise<void>;
    performFullScan: () => Promise<void>;
    startLivePolling: (deviceId: string) => void;
    stopLivePolling: () => void;
    clearDiagnosticHistory: () => void;
}

export const useSerialStore = create<SerialState>((set, get) => ({
    isSupported: false,
    devices: [],
    activeDeviceId: null,
    serialOutput: [],
    isConnecting: false,
    readerCleanup: null,
    diagnosticHistory: [
        {
            id: 'welcome',
            role: 'assistant',
            content: "### System Ready\nLive telemetry link established.\n\nI am your **Automotive Diagnostic Specialist**. I can interpret high-speed CAN traffic, decode OBD2 PIDs, and help you reverse engineer vehicle protocols.\n\n**Common Commands:**\n- *What are these readings?*\n- *Explain CAN ID 0x7E8*\n- *Check for DTC patterns*",
            timestamp: new Date(),
        }
    ],
    diagnosticInsights: [],
    isAnalyzing: false,
    isScanning: false,
    liveReadings: {},

    performFullScan: async () => {
        const state = get();
        const activeDevice = state.devices.find(d => d.id === state.activeDeviceId);

        if (!activeDevice || activeDevice.status !== 'reading') {
            throw new Error('Connect a device first to perform a scan.');
        }

        // 🛑 Pause polling during scan to avoid flooding the buffer
        get().stopLivePolling();
        set({ isScanning: true });

        const timestamp = () => `[${new Date().toLocaleTimeString()}]`;
        const log = (msg: string) => {
            set((s) => ({
                serialOutput: [...s.serialOutput, `${timestamp()} [SCAN] ${msg}`].slice(-800)
            }));
        };

        try {
            log('Universal Hardware Handshake (Deep Pro Mode)...');
            // 🛡️ SAFELY RESET: Use 'ATWS' (Warm Start) for Bluetooth to avoid disconnection.
            // Only use 'ATZ' (Full Reset) for Serial/USB devices.
            const resetCmd = activeDevice.type === 'bluetooth' ? 'ATWS\r' : 'ATZ\r';
            await get().sendData(activeDevice.id, resetCmd); 
            await new Promise(r => setTimeout(r, activeDevice.type === 'bluetooth' ? 500 : 1000));

            await get().sendData(activeDevice.id, 'ATE0\r'); // Echo Off
            await new Promise(r => setTimeout(r, 300));
            await get().sendData(activeDevice.id, 'ATH1\r'); // Headers ON
            await new Promise(r => setTimeout(r, 300));
            await get().sendData(activeDevice.id, 'ATAL\r'); // Allow Long messages
            await new Promise(r => setTimeout(r, 300));
            await get().sendData(activeDevice.id, 'ATCAF0\r'); // CAN Auto-Formatting OFF (reveals raw frames)
            await new Promise(r => setTimeout(r, 300));
            await get().sendData(activeDevice.id, 'ATAT1\r'); // Adaptive Timing
            await new Promise(r => setTimeout(r, 300));

            // --- UNIVERSAL PROTOCOL DISCOVERY ---
            log('Phase 1: Universal Protocol Discovery (Auto-Detection)...');
            await get().sendData(activeDevice.id, 'ATSP0\r');
            await new Promise(r => setTimeout(r, 1200));

            log('Phase 2: Verifying ECU Response...');
            await get().sendData(activeDevice.id, '0100\r'); // Supported PIDs
            await new Promise(r => setTimeout(r, 1000));

            log('Phase 3: Deep Service Discovery...');
            log('Querying Engine State (Service 01)...');
            await get().sendData(activeDevice.id, '010C\r'); // RPM
            await new Promise(r => setTimeout(r, 400));
            await get().sendData(activeDevice.id, '0105\r'); // Coolant
            await new Promise(r => setTimeout(r, 400));
            log('Requesting Stored Trouble Codes (Service 03)...');
            await get().sendData(activeDevice.id, '03\r');
            await new Promise(r => setTimeout(r, 1500));

            log('Requesting Permanent Trouble Codes (Service 0A)...');
            await get().sendData(activeDevice.id, '0A\r'); // 🕵️ Can NOT be cleared by any scanner
            await new Promise(r => setTimeout(r, 1000));

            log('Audit: Distance traveled with MIL ON (0121)...');
            await get().sendData(activeDevice.id, '0121\r');
            await new Promise(r => setTimeout(r, 1000));

            log('Audit: Mileage since last history clear (0131)...');
            await get().sendData(activeDevice.id, '0131\r');
            await new Promise(r => setTimeout(r, 1000));

            log('Audit: Snapshots of past failures (Service 02)...');
            await get().sendData(activeDevice.id, '020000\r'); // Request freeze frame header
            await new Promise(r => setTimeout(r, 1500));

            log('Requesting Pending Trouble Codes (Service 07)...');
            await get().sendData(activeDevice.id, '07\r');
            await new Promise(r => setTimeout(r, 1000));

            log('Querying Engine State (Service 01)...');
            await get().sendData(activeDevice.id, '010C\r'); // RPM
            await new Promise(r => setTimeout(r, 500));
            await get().sendData(activeDevice.id, '0105\r'); // Coolant
            await new Promise(r => setTimeout(r, 500));
            await get().sendData(activeDevice.id, '0104\r'); // Load

            log('Finalizing Hardware Stream (Performance Mode)...');
            await get().sendData(activeDevice.id, 'ATH0\r'); // Headers OFF
            await new Promise(r => setTimeout(r, 300));
            await get().sendData(activeDevice.id, 'ATCAF1\r'); // Auto-Formatting ON
            await new Promise(r => setTimeout(r, 300));

            log('Scan Complete. Passing telemetry to AI Specialist...');

            // 🕵️ UPGRADED AI PROMPT: Focus on Honesty & Integrity Audit
            await get().analyzeDiagnostic("I have completed a Deep Mechanical Integrity Audit. Please look at Service 0A (Permanent) and 0131 (Mileage since clear). If the mileage since clear (0131) is very low (less than 50km), warn the user that the history was recently wiped. If you find a Permanent Code (0A) that is NOT in Mode 03, explain that someone attempted to delete this code but it is still physically present in the ECU's shadow memory. Display any findings at the very top of your response.");

            // 🔄 Resume polling after scan
            if (activeDevice) {
                get().startLivePolling(activeDevice.id);
            }
        } catch (err) {
            console.error('Full scan failed:', err);
            log('Scan Interrupted: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            set({ isScanning: false });
        }
    },

    livePollingInterval: null as any,

    startLivePolling: (deviceId: string) => {
        const state = get();
        if ((state as any).livePollingInterval) return;

        console.log('[SerialStore] Starting Live Telemetry Polling...');

        let pollCount = 0; // 🎯 STABLE LOCAL COUNTER

        const poll = async () => {
            const current = get();
            const device = current.devices.find(d => d.id === deviceId);
            if (!device || device.status !== 'reading') {
                get().stopLivePolling();
                return;
            }

            // 🛡️ Skip polling commands if we are in PASSIVE/SNIFFER mode
            if (device.mode === 'sniffer') {
                console.log('[SerialStore] Passive Mode: Skipping active PID polling.');
                return;
            }

            try {
                // 🚀 FAST DASHBOARD UPDATE: Priority PIDs first
                await current.sendData(deviceId, '010C\r'); // RPM (Priority 1)
                await new Promise(r => setTimeout(r, 80)); 

                await current.sendData(deviceId, '010D\r'); // Speed (Priority 1)
                await new Promise(r => setTimeout(r, 80));

                await current.sendData(deviceId, 'ATRV\r'); // Voltage (Priority 2)
                await new Promise(r => setTimeout(r, 100));

                // 🐢 SLOWER CORE PIDs (Every 2nd poll cycle to save bandwidth)
                if (pollCount % 2 === 0) {
                    await current.sendData(deviceId, '0101\r'); // MIL Status
                    await new Promise(r => setTimeout(r, 100));
                    await current.sendData(deviceId, '0105\r'); // Coolant
                    await new Promise(r => setTimeout(r, 100));
                    await current.sendData(deviceId, '0103\r'); // Fuel System Status
                    await new Promise(r => setTimeout(r, 100));
                }
                
                pollCount++;
                if (pollCount > 1000) pollCount = 0; // Reset to avoid overflow
            } catch (e) {
                console.error('[SerialStore] Polling failed:', e);
            }
        };

        const interval = setInterval(poll, 600); // 🚀 2x Faster Polling (600ms vs 1200ms)
        (state as any).livePollingInterval = interval;
    },

    stopLivePolling: () => {
        const state = get() as any;
        if (state.livePollingInterval) {
            clearInterval(state.livePollingInterval);
            set({ livePollingInterval: null } as any);
            console.log('[SerialStore] Live Telemetry Polling Stopped.');
        }
    },

    analyzeDiagnostic: async (customMessage?: string) => {
        const state = get();
        if (state.isAnalyzing) return;

        set({ isAnalyzing: true });

        // Create the user message object
        const userMsg: AIMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: customMessage || "Run a full scan of the current serial telemetry.",
            timestamp: new Date(),
        };

        try {
            // Increase context buffer to 200 lines to ensure scan results are captured
            const telemetry = state.serialOutput.slice(-200).join('\n');

            // 🚀 Batch initial updates to avoid multiple re-renders or stale state during fetch
            const assistantMsgId = (Date.now() + 1).toString();
            const initialAssistantMsg: AIMessage = {
                id: assistantMsgId,
                role: 'assistant',
                content: '▮', // Starting with cursor/placeholder
                timestamp: new Date(),
            };

            set((s) => ({
                isAnalyzing: true,
                diagnosticHistory: [...s.diagnosticHistory, userMsg, initialAssistantMsg]
            }));

            console.log(`[SerialStore] Requesting AI Analysis (History size: ${get().diagnosticHistory.length}). Telemetry length: ${telemetry.length} chars.`);

            // Recalculate context for AI right before request
            const currentState = get();
            const historyForAI = currentState.diagnosticHistory
                .filter(m => m.id !== assistantMsgId) // Don't send the placeholder itself
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: historyForAI,
                    context: {
                        isDiagnosticRequest: true,
                        telemetry: `[PHYSICAL TELEMETRY STREAM]\n${telemetry}`
                    },
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                // Remove placeholder if failed
                set((s) => ({
                    diagnosticHistory: s.diagnosticHistory.filter(m => m.id !== assistantMsgId)
                }));
                throw new Error(errData.error || 'Failed to reach Diagnostic AI');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let streamedContent = '';
            let sseBuffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    sseBuffer += decoder.decode(value, { stream: true });
                    const lines = sseBuffer.split('\n');
                    sseBuffer = lines.pop() || ''; // Keep the incomplete line in buffer

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;

                        try {
                            const dataStr = trimmed.slice(6);
                            if (dataStr === '[DONE]') continue;
                            const data = JSON.parse(dataStr);

                            if (data.type === 'token') {
                                streamedContent += data.content;

                                // Update the last message in history
                                set((s) => ({
                                    diagnosticHistory: s.diagnosticHistory.map(m =>
                                        m.id === assistantMsgId ? { ...m, content: streamedContent } : m
                                    ),
                                    // Also update insights for the IDE bottom panel
                                    diagnosticInsights: [streamedContent]
                                }));
                            }
                        } catch (jsonErr) {
                            console.warn('[Serial] SSE JSON Parse Error:', jsonErr);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error('Diagnostic analysis failed:', err);
            const errorMsg: AIMessage = {
                id: 'err-' + Date.now(),
                role: 'assistant',
                content: `⚠️ System Error: ${err.message || 'Deep Intel link unstable.'}`,
                timestamp: new Date(),
            };
            set((s) => ({
                diagnosticHistory: [...s.diagnosticHistory, errorMsg],
                diagnosticInsights: [`⚠️ Error: ${err.message}`]
            }));
        } finally {
            set({ isAnalyzing: false });
        }
    },
    init: () => {
        const supported = isWebSerialSupported();
        set({ isSupported: supported });

        if (supported) {
            // Listen for hot-plug events
            onSerialConnect(() => {
                get().scanPorts();
            });

            onSerialDisconnect((event) => {
                const port = (event as Event & { target: SerialPort }).target;
                set((state) => ({
                    devices: state.devices.map((d) =>
                        d.port === port
                            ? { ...d, status: 'disconnected' as const, connection: null }
                            : d
                    ),
                }));
            });

            // Initial scan
            get().scanPorts();
        }
    },

    scanPorts: async () => {
        try {
            const granted = await getGrantedPorts();
            set((state) => {
                // Merge with existing device entries
                const existing = new Map(state.devices.map((d) => [d.port, d]));
                const updated = granted.map((info) => {
                    const existing_device = existing.get(info.port);
                    if (existing_device) return existing_device;
                    return {
                        id: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        name: info.name,
                        port: info.port,
                        connection: null,
                        baudRate: 115200,
                        status: 'disconnected' as const,
                        vendorId: info.vendorId,
                        productId: info.productId,
                        type: 'serial' as const,
                    };
                });
                return { devices: updated };
            });
        } catch {
            // Ignore errors
        }
    },

    connectDevice: async () => {
        set({ isConnecting: true });
        try {
            const deviceInfo = await requestPort();
            if (!deviceInfo) {
                set({ isConnecting: false });
                return null;
            }

            const id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const device: ConnectedDevice = {
                id,
                name: deviceInfo.name,
                port: deviceInfo.port,
                connection: null,
                type: 'serial',
                baudRate: 115200,
                status: 'connected',
                vendorId: deviceInfo.vendorId,
                productId: deviceInfo.productId,
            };

            set((state) => ({
                devices: [...state.devices.filter((d) => d.port !== deviceInfo.port), device],
                activeDeviceId: id,
                isConnecting: false,
            }));

            return id;
        } catch (err) {
            set({ isConnecting: false });
            throw err;
        }
    },

    connectBluetooth: async () => {
        set({ isConnecting: true });
        try {
            const bleInfo = await requestBLEDevice();
            if (!bleInfo) {
                set({ isConnecting: false });
                return null;
            }

            const id = `ble-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

            const timestamp = () => `[${new Date().toLocaleTimeString()}]`;

            const connection = await connectBLE(
                bleInfo.device,
                (text) => {
                    // Direct stream for BLE (usually already line-oriented or small chunks)
                    set((s) => ({
                        serialOutput: [...s.serialOutput, `${timestamp()} [BLE] ${text.trim()}`].slice(-800)
                    }));

                    // 🔍 PARSE FOR OBD RESPONSES
                    const result = parseOBDLine(text);
                    if (result) {
                        set(s => ({
                            liveReadings: {
                                ...s.liveReadings,
                                [result.key]: result.data
                            }
                        }));
                    }
                },
                () => {
                    // On Disconnect
                    set((state) => ({
                        devices: state.devices.map(d => d.id === id ? { ...d, status: 'disconnected' } : d)
                    }));
                }
            );

            const connectedDevice: ConnectedDevice = {
                id,
                name: bleInfo.name,
                device: bleInfo.device,
                connection,
                type: 'bluetooth',
                status: 'reading',
            };

            set((state) => ({
                devices: [...state.devices, connectedDevice],
                activeDeviceId: id,
                isConnecting: false,
            }));

            // Initial ELM327 Handshake if it looks like an OBD device
            if (bleInfo.name.toUpperCase().includes('OBD') || bleInfo.name.toUpperCase().includes('ELM')) {
                setTimeout(async () => {
                    await writeBLE(connection, 'ATZ\r');
                    set((s) => ({
                        serialOutput: [...s.serialOutput, `${timestamp()} [SYS] ELM327 Reset Sent...`].slice(-800)
                    }));

                    // Start Live Polling for Bluetooth Link
                    get().startLivePolling(id);
                }, 1000);
            }

            return id;
        } catch (err) {
            set({ isConnecting: false });
            throw err;
        }
    },

    disconnectDevice: async (deviceId: string) => {
        const device = get().devices.find((d) => d.id === deviceId);
        if (!device) return;

        // Stop polling first
        get().stopLivePolling();

        if (device.connection) {
            if (device.type === 'serial') {
                await closeConnection(device.connection as SerialConnection);
            } else {
                await disconnectBLE(device.connection as BluetoothConnection);
            }
        }

        set((state) => ({
            devices: state.devices.filter((d) => d.id !== deviceId),
            activeDeviceId: state.activeDeviceId === deviceId ? null : state.activeDeviceId,
        }));
    },

    openSerial: async (deviceId: string, baudRate: number = 115200) => {
        const state = get();
        const device = state.devices.find((d) => d.id === deviceId);
        if (!device) throw new Error('Device not found');

        // If we are already reading THIS device, just stay active
        if (device.status === 'reading' && state.readerCleanup) {
            console.log('[Serial] Already reading device, skipping re-init:', deviceId);
            return;
        }

        // Close any existing reader and connection if we are switching or resetting
        if (state.readerCleanup) {
            state.readerCleanup();
        }

        // Release physical port LOCK if already connected but we're re-opening
        if (device.connection && device.type === 'serial') {
            await closeConnection(device.connection as SerialConnection);
        }

        if (device.type !== 'serial' || !device.port) {
            throw new Error('Device is not a serial connection');
        }

        let connection: SerialConnection;

        try {
            connection = await openConnection(device.port, baudRate);

            // If the port was already open and locked, connection.reader might be null.
            if (!connection.reader) {
                console.error('[Serial] Port is externally locked. Registry recovery failed.');
                throw new Error('Serial Port is locked by another application. Please close the Arduino IDE Serial Monitor and try again.');
            }

            set((s) => ({
                devices: s.devices.map((d) =>
                    d.id === deviceId
                        ? { ...d, connection, baudRate, status: 'reading' as const }
                        : d
                ),
            }));
        } catch (err: any) {
            if (err.name === 'NetworkError' || err.message?.includes('Failed to open')) {
                throw new Error('Port Busy: Close the Arduino IDE Serial Monitor or other serial tools before connecting.');
            }
            throw err;
        }

        // Optimized Throttled Line Buffering
        let lineBuffer = '';
        let pendingLines: string[] = [];
        let throttleTimeout: any = null;

        const timestamp = () => `[${new Date().toLocaleTimeString()}]`;

        const updateStore = () => {
            if (pendingLines.length === 0) return;

            set((s) => ({
                serialOutput: [
                    ...s.serialOutput,
                    ...pendingLines,
                ].slice(-800),
            }));

            pendingLines = [];
            throttleTimeout = null;
        };

        const stopReader = await readSerial(
            connection,
            (text) => {
                lineBuffer += text;
                const parts = lineBuffer.split(/\r\n|\r|\n/);

                if (parts.length > 1) {
                    const completeLines = parts.slice(0, -1).filter(l => l.trim());
                    lineBuffer = parts[parts.length - 1];

                    if (completeLines.length > 0) {
                        pendingLines.push(...completeLines.map(l => `${timestamp()} ${l}`));

                        // 🔍 PARSE FOR OBD RESPONSES
                        for (const line of completeLines) {
                            const result = parseOBDLine(line);
                            if (result) {
                                // 🛡️ CUSTOM: Auto-switch to sniffer mode if we see Ghost Sniffer or raw IDs
                                if (result.key === 'SYSTEM_STATUS' && result.data.value === 'READY' || result.key.startsWith('RAW_CAN_')) {
                                    set(s => ({
                                        devices: s.devices.map(d => d.id === deviceId ? { ...d, mode: 'sniffer' } : d)
                                    }));
                                }

                                set(s => ({
                                    liveReadings: {
                                        ...s.liveReadings,
                                        [result.key]: result.data
                                    }
                                }));
                            }
                        }

                        // Limit pending buffer to avoid OOM
                        if (pendingLines.length > 200) pendingLines = pendingLines.slice(-200);

                        if (!throttleTimeout) {
                            throttleTimeout = setTimeout(updateStore, 80); // 80ms throttle
                        }
                    }
                }
            },
            (error) => {
                console.error('[Serial] Read Error:', error);
                if (throttleTimeout) clearTimeout(throttleTimeout);
                set((s) => ({
                    devices: s.devices.map((d) =>
                        d.id === deviceId
                            ? { ...d, status: 'disconnected' as const, connection: null }
                            : d
                    ),
                }));
            }
        );

        // Start Live Polling for Serial Link
        get().startLivePolling(deviceId);

        set({
            readerCleanup: () => {
                stopReader();
                // We also close the connection to release the lock when explicitly stopping
                const conn = connection as any;
                if (conn.isOpen && conn.port) {
                    closeConnection(conn as SerialConnection);
                }
            }
        });
    },

    closeSerial: async (deviceId: string) => {
        const device = get().devices.find((d) => d.id === deviceId);
        if (!device?.connection || device.type !== 'serial') return;

        await closeConnection(device.connection as SerialConnection);

        set((state) => ({
            devices: state.devices.map((d) =>
                d.id === deviceId
                    ? { ...d, connection: null, status: 'connected' as const }
                    : d
            ),
        }));
    },

    sendData: async (deviceId: string, data: string) => {
        const device = get().devices.find((d) => d.id === deviceId);
        if (!device?.connection) throw new Error('Device not connected');

        if (device.type === 'serial') {
            await writeSerial(device.connection as SerialConnection, data);
        } else {
            await writeBLE(device.connection as BluetoothConnection, data);
        }
    },

    clearOutput: () => set({ serialOutput: [] }),

    clearDiagnosticHistory: () => set({
        diagnosticHistory: [
            {
                id: 'welcome',
                role: 'assistant',
                content: "### System Ready\nLive telemetry link established.\n\nI am your **Automotive Diagnostic Specialist**. I can interpret high-speed CAN traffic, decode OBD2 PIDs, and help you reverse engineer vehicle protocols.\n\n**Common Commands:**\n- *What are these readings?*\n- *Explain CAN ID 0x7E8*\n- *Check for DTC patterns*",
                timestamp: new Date(),
            }
        ]
    }),

    setActiveDevice: (deviceId: string | null) => set({ activeDeviceId: deviceId }),
}));
