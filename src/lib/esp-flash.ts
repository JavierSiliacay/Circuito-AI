import { ESPLoader, Transport } from 'esptool-js';

export interface FlashProgress {
    percentage: number;
    message: string;
}

export interface FlashOptions {
    port: any; // SerialPort
    baudRate: number;
    terminal?: {
        log: (msg: string) => void;
        error: (msg: string) => void;
        write: (msg: string) => void;
    };
    onProgress?: (progress: FlashProgress) => void;
}

/**
 * Perform a real ESP32 flash using esptool-js
 */
export async function flashEsp32(binaryData: Uint8Array, options: FlashOptions) {
    const { port, baudRate, terminal, onProgress } = options;

    const transport = new Transport(port);

    // esptool-js uses a specific interface for terminal
    const espTerminal = terminal ? {
        log: (msg: string) => terminal.log(msg),
        error: (msg: string) => terminal.error(msg),
        write: (msg: string) => terminal.write(msg),
        writeLine: (msg: string) => terminal.log(msg),
        clean: () => { },
    } : undefined;

    const esploader = new ESPLoader({
        transport,
        baudrate: baudRate,
        terminal: espTerminal,
        romBaudrate: 115200
    });

    try {
        if (onProgress) onProgress({ percentage: 0, message: 'Connecting to ESP32...' });

        // Connect and detect chip
        const chip = await esploader.main();
        if (terminal) terminal.log(`Detected Chip: ${chip}`);

        if (onProgress) onProgress({ percentage: 10, message: `Detected ${chip}. Preparing flash...` });

        // Convert Uint8Array to binary string because esptool-js types expect string
        // but often the implementation handles both. To be safe for types:
        const binaryString = Array.from(binaryData, (byte) => String.fromCharCode(byte)).join('');

        // Flash parameters
        const flashOptions = {
            fileArray: [{
                data: binaryString,
                address: 0x10000
            }],
            flashSize: 'keep',
            flashMode: 'keep',
            flashFreq: 'keep',
            eraseAll: false,
            compress: true,
            reportProgress: (fileIndex: number, written: number, total: number) => {
                const progress = (written / total) * 100;
                if (onProgress) {
                    onProgress({
                        percentage: 20 + (progress * 0.8),
                        message: `Writing... ${Math.round(progress)}%`
                    });
                }
            }
        };

        await esploader.writeFlash(flashOptions);

        if (onProgress) onProgress({ percentage: 100, message: 'Done! Resetting board...' });

        // Reset the board to start the new app
        await esploader.after('hard_reset');

        return true;
    } catch (err: any) {
        if (terminal) terminal.error(`Flash error: ${err.message}`);
        throw err;
    }
}
