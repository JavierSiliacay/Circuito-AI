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
}

export const useSerialStore = create<SerialState>((set, get) => ({
    isSupported: false,
    devices: [],
    activeDeviceId: null,
    serialOutput: [],
    isConnecting: false,

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
        const device = get().devices.find((d) => d.id === deviceId);
        if (!device) throw new Error('Device not found');

        const connection = await openConnection(device.port, baudRate);

        set((state) => ({
            devices: state.devices.map((d) =>
                d.id === deviceId
                    ? { ...d, connection, baudRate, status: 'reading' as const }
                    : d
            ),
        }));

        // Start reading serial data
        const timestamp = () => {
            const now = new Date();
            return `[${now.toLocaleTimeString()}]`;
        };

        await readSerial(
            connection,
            (text) => {
                // Split into lines and add timestamps
                const lines = text.split('\n').filter((l) => l.trim());
                set((state) => ({
                    serialOutput: [
                        ...state.serialOutput,
                        ...lines.map((line) => `${timestamp()} ${line.replace('\r', '')}`),
                    ].slice(-500), // Keep last 500 lines
                }));
            },
            (error) => {
                set((state) => ({
                    serialOutput: [
                        ...state.serialOutput,
                        `${timestamp()} ⚠ Serial error: ${error.message}`,
                    ],
                    devices: state.devices.map((d) =>
                        d.id === deviceId
                            ? { ...d, status: 'disconnected' as const, connection: null }
                            : d
                    ),
                }));
            }
        );
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
