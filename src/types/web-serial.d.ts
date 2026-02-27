// Web Serial API Type Declarations
// These types are not included in TypeScript's default lib,
// since the Web Serial API is only available in Chromium browsers.

interface SerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
}

interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
}

interface SerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
}

interface SerialPort extends EventTarget {
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    getInfo(): SerialPortInfo;
}

interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
}

interface Serial extends EventTarget {
    getPorts(): Promise<SerialPort[]>;
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    addEventListener(type: 'connect' | 'disconnect', listener: (event: Event) => void): void;
    removeEventListener(type: 'connect' | 'disconnect', listener: (event: Event) => void): void;
}

interface Navigator {
    readonly serial: Serial;
}
