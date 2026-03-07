/**
 * Web Bluetooth API — Wireless Hardware Connection Service
 * Specifically tuned for BLE (Bluetooth Low Energy) devices like 
 * OBDII ELM327 adapters and ESP32 BLE controllers.
 */

// Declare missing Web Bluetooth types for environments where they are not globally available
declare global {
    interface BluetoothDevice extends EventTarget {
        id: string;
        name?: string;
        gatt?: BluetoothRemoteGATTServer;
        addEventListener(type: string, listener: (this: this, ev: Event) => any, useCapture?: boolean): void;
    }
    interface BluetoothRemoteGATTServer {
        device: BluetoothDevice;
        connected: boolean;
        connect(): Promise<BluetoothRemoteGATTServer>;
        disconnect(): void;
        getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
        getPrimaryServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
    }
    interface BluetoothRemoteGATTService extends EventTarget {
        device: BluetoothDevice;
        uuid: string;
        isPrimary: boolean;
        getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
        getCharacteristics(characteristic?: string | number): Promise<BluetoothRemoteGATTCharacteristic[]>;
    }
    interface BluetoothRemoteGATTCharacteristic extends EventTarget {
        service: BluetoothRemoteGATTService;
        uuid: string;
        properties: BluetoothCharacteristicProperties;
        value?: DataView;
        startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
        stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
        readValue(): Promise<DataView>;
        writeValue(value: BufferSource): Promise<void>;
        addEventListener(type: string, listener: (this: this, ev: Event) => any, useCapture?: boolean): void;
    }
    interface BluetoothCharacteristicProperties {
        authenticatedSignedWrites: boolean;
        broadcast: boolean;
        indicate: boolean;
        notify: boolean;
        read: boolean;
        reliableWrite: boolean;
        writableAuxiliaries: boolean;
        write: boolean;
        writeWithoutResponse: boolean;
    }
}

export interface BluetoothDeviceInfo {
    id: string;
    name: string;
    device: BluetoothDevice;
}

export interface BluetoothConnection {
    device: BluetoothDevice;
    server: BluetoothRemoteGATTServer | null;
    service: BluetoothRemoteGATTService | null;
    rxChar: BluetoothRemoteGATTCharacteristic | null;
    txChar: BluetoothRemoteGATTCharacteristic | null;
    isOpen: boolean;
    type: 'ble';
}

// Common UUIDs for ELM327 / Serial-over-BLE
const COMMON_SERIAL_SERVICES = [
    '0000ffe0-0000-1000-8000-00805f9b34fb', // Standard ELM327 / V-Link
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
    0xFFE0,                                 // Short form
];

const COMMON_CHAR_RX = [
    '0000ffe1-0000-1000-8000-00805f9b34fb',
    '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // NUS RX
    0xFFE1,
];

const COMMON_CHAR_TX = [
    '0000ffe1-0000-1000-8000-00805f9b34fb', // Often both use same UUID
    '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // NUS TX
    0xFFE1,
];

export function isWebBluetoothSupported(): boolean {
    return !!(navigator as any).bluetooth;
}

export async function requestBLEDevice(): Promise<BluetoothDeviceInfo | null> {
    if (!isWebBluetoothSupported()) {
        const isNotSecure = window.location.protocol !== 'https:' && window.location.hostname !== 'localhost';
        const errorMsg = isNotSecure
            ? 'Web Bluetooth requires HTTPS or localhost. (Secure Context Error)'
            : 'Web Bluetooth is not supported in this browser. Use Chrome or Edge.';
        throw new Error(errorMsg);
    }

    try {
        const device = await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: COMMON_SERIAL_SERVICES
        });

        return {
            id: device.id,
            name: device.name || 'Unknown BLE Device',
            device
        };
    } catch (err) {
        if (err instanceof DOMException && err.name === 'NotFoundError') {
            return null;
        }
        throw err;
    }
}

export async function connectBLE(
    device: BluetoothDevice,
    onData: (text: string) => void,
    onDisconnect: () => void
): Promise<BluetoothConnection> {
    console.log(`[WebBluetooth] Connecting to ${device.name}...`);

    const server = await device.gatt?.connect();
    if (!server) throw new Error('GATT Server not available');

    // Discover Services
    const services = await server.getPrimaryServices();
    let targetService: BluetoothRemoteGATTService | null = null;

    // Find the first matching serial service
    for (const service of services) {
        if (COMMON_SERIAL_SERVICES.includes(service.uuid.toLowerCase())) {
            targetService = service;
            break;
        }
    }

    if (!targetService && services.length > 0) {
        targetService = services[0]; // Fallback to first available
    }

    if (!targetService) throw new Error('No compatible Serial service found on device');

    const characteristics = await targetService.getCharacteristics();
    let rxChar: BluetoothRemoteGATTCharacteristic | null = null;
    let txChar: BluetoothRemoteGATTCharacteristic | null = null;

    for (const char of characteristics) {
        if (char.properties.notify || char.properties.indicate) {
            rxChar = char;
        }
        if (char.properties.write || char.properties.writeWithoutResponse) {
            txChar = char;
        }
    }

    if (!rxChar) throw new Error('Device has no identifiable RX (Notify) characteristic');

    // Setup Notifications
    const decoder = new TextDecoder();
    rxChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        const text = decoder.decode(value);
        onData(text);
    });

    await rxChar.startNotifications();

    device.addEventListener('gattserverdisconnected', onDisconnect);

    return {
        device,
        server,
        service: targetService,
        rxChar,
        txChar,
        isOpen: true,
        type: 'ble'
    };
}

export async function writeBLE(connection: BluetoothConnection, data: string): Promise<void> {
    if (!connection.txChar) throw new Error('Device is not writable');

    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);

    // Most BLE devices have a 20-byte MTU limit for simple characteristic writes
    // We should chunk larger commands if necessary, but for ELM327 (AT commands) 
    // it's usually small.
    await connection.txChar.writeValue(bytes);
}

export async function disconnectBLE(connection: BluetoothConnection): Promise<void> {
    if (connection.device.gatt?.connected) {
        connection.device.gatt.disconnect();
    }
    connection.isOpen = false;
}
