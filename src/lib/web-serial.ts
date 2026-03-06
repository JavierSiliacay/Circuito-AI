// ==============================================================
// Web Serial API — Real Hardware Connection Service
// ==============================================================
// This service provides a real interface to physical serial devices
// using the browser's Web Serial API. It handles port selection,
// reading/writing, and device detection.
//
// Requirements:
// - Chrome/Edge 89+ or other Chromium browser with Web Serial support
// - HTTPS or localhost
// ==============================================================

export interface SerialDeviceInfo {
    port: SerialPort;
    portInfo: SerialPortInfo;
    name: string;
    vendorId?: number;
    productId?: number;
}

export interface SerialConnection {
    port: SerialPort;
    reader: ReadableStreamDefaultReader<Uint8Array> | null;
    writer: WritableStreamDefaultWriter<Uint8Array> | null;
    isOpen: boolean;
}

// Memory-stable registry to prevent 'Locked Stream' errors across hot-reloads and UI switches
const activeConnections = new Map<SerialPort, SerialConnection>();

// Known USB vendor/product IDs for common boards
const KNOWN_DEVICES: Record<string, { vendor: string; board: string }> = {
    '0x10C4:0xEA60': { vendor: 'Silicon Labs', board: 'ESP32 (CP2102)' },
    '0x1A86:0x7523': { vendor: 'QinHeng', board: 'ESP32/Arduino (CH340)' },
    '0x1A86:0x55D4': { vendor: 'QinHeng', board: 'ESP32-S3 (CH343)' },
    '0x2341:0x0043': { vendor: 'Arduino', board: 'Arduino Uno R3' },
    '0x2341:0x0042': { vendor: 'Arduino', board: 'Arduino Mega 2560' },
    '0x2341:0x0001': { vendor: 'Arduino', board: 'Arduino Due' },
    '0x2341:0x8036': { vendor: 'Arduino', board: 'Arduino Leonardo' },
    '0x303A:0x1001': { vendor: 'Espressif', board: 'ESP32-S2' },
    '0x303A:0x1002': { vendor: 'Espressif', board: 'ESP32-S3' },
    '0x0403:0x6001': { vendor: 'FTDI', board: 'FTDI Serial Adapter' },
    '0x0403:0x6015': { vendor: 'FTDI', board: 'FTDI FT231X' },
};

function identifyDevice(info: SerialPortInfo): string {
    const vendorId = info.usbVendorId;
    const productId = info.usbProductId;

    if (vendorId !== undefined && productId !== undefined) {
        const key = `0x${vendorId.toString(16).toUpperCase().padStart(4, '0')}:0x${productId.toString(16).toUpperCase().padStart(4, '0')}`;
        const known = KNOWN_DEVICES[key];
        if (known) return known.board;
        return `USB Device (${key})`;
    }

    return 'Unknown Serial Device';
}

// Check if Web Serial API is available
export function isWebSerialSupported(): boolean {
    return 'serial' in navigator;
}

// Get all already-granted serial ports
export async function getGrantedPorts(): Promise<SerialDeviceInfo[]> {
    if (!isWebSerialSupported()) return [];

    try {
        const ports = await navigator.serial.getPorts();
        return ports.map((port) => {
            const info = port.getInfo();
            return {
                port,
                portInfo: info,
                name: identifyDevice(info),
                vendorId: info.usbVendorId,
                productId: info.usbProductId,
            };
        });
    } catch {
        return [];
    }
}

// Request a new serial port (opens browser picker)
export async function requestPort(filters?: SerialPortFilter[]): Promise<SerialDeviceInfo | null> {
    if (!isWebSerialSupported()) {
        throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
        const port = await navigator.serial.requestPort({ filters: filters || [] });
        const info = port.getInfo();
        return {
            port,
            portInfo: info,
            name: identifyDevice(info),
            vendorId: info.usbVendorId,
            productId: info.usbProductId,
        };
    } catch (err) {
        // User cancelled the picker
        if (err instanceof DOMException && err.name === 'NotFoundError') {
            return null;
        }
        throw err;
    }
}

// Open a serial connection
export async function openConnection(
    port: SerialPort,
    baudRate: number = 115200
): Promise<SerialConnection> {
    // 🛡️ REUSE: If we already have a direct reference to this port's connection, return it
    const existing = activeConnections.get(port);
    if (existing && existing.isOpen) {
        console.log('[WebSerial] Reusing existing connection registry entry');
        return existing;
    }

    // 🛡️ RECOVERY: If port is PHYSICALLY open and locked, but NOT in our registry
    // This happens after hot-reloads or if another part of the system opened it
    if (port.readable && port.readable.locked) {
        console.warn('[WebSerial] Port is externally locked. Attempting to create recovery connection.');
        // We can't get a NEW reader, but we can return an object that represents the fact it's open
        return {
            port,
            reader: null,
            writer: null,
            isOpen: true,
        };
    }

    // Open if closed
    if (!port.readable) {
        await port.open({ baudRate });
    }

    // Standard DTR/RTS pulse for Arduino/ESP32 reset/init
    try {
        await (port as any).setSignals({ dataTerminalReady: false, requestToSend: false });
        await new Promise(r => setTimeout(r, 100));
        await (port as any).setSignals({ dataTerminalReady: true, requestToSend: true });
    } catch (e) {
        // Not critical, some drivers don't support it
    }

    const readable = port.readable;
    const writable = port.writable;

    const connection: SerialConnection = {
        port,
        reader: readable ? readable.getReader() : null,
        writer: writable ? writable.getWriter() : null,
        isOpen: true,
    };

    // Store in registry
    activeConnections.set(port, connection);

    return connection;
}

/**
 * Specifically reset ESP32/Arduino boards to enter bootloader mode
 * This uses the standard DTR/RTS toggle pattern used by esptool
 */
export async function resetBoardForFlash(port: SerialPort): Promise<void> {
    try {
        // Standard reset sequence for ESP32:
        // 1. RTS = 1, DTR = 0 -> enters boot mode
        // 2. Wait
        // 3. Reset signals
        await (port as any).setSignals({ dataTerminalReady: false, requestToSend: true });
        await new Promise(r => setTimeout(r, 100));
        await (port as any).setSignals({ dataTerminalReady: true, requestToSend: false });
        await new Promise(r => setTimeout(r, 50));
        await (port as any).setSignals({ dataTerminalReady: false, requestToSend: false });
    } catch (e) {
        console.error('Failed to reset board:', e);
    }
}

// Close a serial connection
export async function closeConnection(connection: SerialConnection): Promise<void> {
    try {
        // Remove from registry immediately
        activeConnections.delete(connection.port);

        if (connection.reader) {
            await connection.reader.cancel();
            connection.reader.releaseLock();
            connection.reader = null; // Prevent double release
        }
        if (connection.writer) {
            await connection.writer.releaseLock();
            connection.writer = null;
        }
        if (connection.port.readable || connection.port.writable) {
            await connection.port.close();
        }
        connection.isOpen = false;
    } catch (err) {
        console.warn('[WebSerial] Close Error (might already be closed):', err);
        connection.isOpen = false;
    }
}

// Read serial data continuously
export async function readSerial(
    connection: SerialConnection,
    onData: (text: string) => void,
    onError?: (error: Error) => void
): Promise<() => void> {
    let running = true;
    const decoder = new TextDecoder();

    const readLoop = async () => {
        while (running && connection.reader) {
            try {
                const { value, done } = await connection.reader.read();
                if (done) break;
                if (value) {
                    const text = decoder.decode(value, { stream: true });
                    onData(text);
                }
            } catch (err) {
                // If it was cancelled by reader.cancel(), don't report as error unless unexpected
                if (running && onError && (err as any).name !== 'AbortError') {
                    onError(err instanceof Error ? err : new Error(String(err)));
                }
                break;
            }
        }
    };

    // Fire and forget, loop handles it
    readLoop();

    // Enhanced cleanup function: Not only stops loop, but can be configured to release the lock
    return () => {
        running = false;
    };
}

// Write data to serial port
export async function writeSerial(
    connection: SerialConnection,
    data: string
): Promise<void> {
    if (!connection.writer) {
        throw new Error('Serial port is not writable');
    }

    const encoder = new TextEncoder();
    await connection.writer.write(encoder.encode(data));
}

// Listen for USB connect/disconnect events
export function onSerialConnect(callback: (event: Event) => void): () => void {
    if (!isWebSerialSupported()) return () => { };

    navigator.serial.addEventListener('connect', callback);
    return () => navigator.serial.removeEventListener('connect', callback);
}

export function onSerialDisconnect(callback: (event: Event) => void): () => void {
    if (!isWebSerialSupported()) return () => { };

    navigator.serial.addEventListener('disconnect', callback);
    return () => navigator.serial.removeEventListener('disconnect', callback);
}
