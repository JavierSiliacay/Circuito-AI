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
    if (port.readable) {
        // Port is already open
        const readable = port.readable as ReadableStream<Uint8Array>;
        const writable = port.writable as WritableStream<Uint8Array> | null;
        return {
            port,
            reader: readable.getReader(),
            writer: writable ? writable.getWriter() : null,
            isOpen: true,
        };
    }

    await port.open({ baudRate });

    const readable = port.readable as ReadableStream<Uint8Array> | null;
    const writable = port.writable as WritableStream<Uint8Array> | null;
    return {
        port,
        reader: readable ? readable.getReader() : null,
        writer: writable ? writable.getWriter() : null,
        isOpen: true,
    };
}

// Close a serial connection
export async function closeConnection(connection: SerialConnection): Promise<void> {
    try {
        if (connection.reader) {
            await connection.reader.cancel();
            connection.reader.releaseLock();
        }
        if (connection.writer) {
            await connection.writer.close();
            connection.writer.releaseLock();
        }
        if (connection.port.readable || connection.port.writable) {
            await connection.port.close();
        }
        connection.isOpen = false;
    } catch {
        // Port may already be closed
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
                if (running && onError) {
                    onError(err instanceof Error ? err : new Error(String(err)));
                }
                break;
            }
        }
    };

    readLoop();

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
