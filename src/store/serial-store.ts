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
import { AIMessage } from './ide-store';

export interface ConnectedDevice {
    id: string;
    name: string;
    port: SerialPort;
    connection: SerialConnection | null;
    baudRate: number;
    status: 'connected' | 'disconnected' | 'reading';
    vendorId?: number;
    productId?: number;
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
    analyzeDiagnostic: (customMessage?: string) => Promise<void>;
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
            const telemetry = state.serialOutput.slice(-70).join('\n');

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

    disconnectDevice: async (deviceId: string) => {
        const device = get().devices.find((d) => d.id === deviceId);
        if (!device) return;

        if (device.connection) {
            await closeConnection(device.connection);
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
        if (device.connection) {
            await closeConnection(device.connection);
        }

        const connection = await openConnection(device.port, baudRate);

        // If the port was already open and locked, connection.reader might be null.
        if (!connection.reader) {
            console.error('[Serial] Port is externally locked. Registry recovery failed.');
            return;
        }

        set((s) => ({
            devices: s.devices.map((d) =>
                d.id === deviceId
                    ? { ...d, connection, baudRate, status: 'reading' as const }
                    : d
            ),
        }));

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
                const parts = lineBuffer.split(/\r?\n/);

                if (parts.length > 1) {
                    const completeLines = parts.slice(0, -1).filter(l => l.trim());
                    lineBuffer = parts[parts.length - 1];

                    if (completeLines.length > 0) {
                        pendingLines.push(...completeLines.map(l => `${timestamp()} ${l}`));

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

        set({
            readerCleanup: () => {
                stopReader();
                // We also close the connection to release the lock when explicitly stopping
                if (connection.isOpen) {
                    closeConnection(connection);
                }
            }
        });
    },

    closeSerial: async (deviceId: string) => {
        const device = get().devices.find((d) => d.id === deviceId);
        if (!device?.connection) return;

        await closeConnection(device.connection);

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

        await writeSerial(device.connection, data);
    },

    clearOutput: () => set({ serialOutput: [] }),

    setActiveDevice: (deviceId: string | null) => set({ activeDeviceId: deviceId }),
}));
