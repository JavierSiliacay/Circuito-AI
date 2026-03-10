export interface OBDPID {
    pid: string;
    bytes: number;
    description: string;
    unit?: string;
    // AndrOBD-style Linear Conversion Engine parameters
    fact?: number;
    div?: number;
    offs?: number;
    // Bit-level masking
    bitOffset?: number;
    bitLength?: number;
    bitMask?: number;
    // Fallback or complex formula
    formula?: (bytes: number[]) => number | string;
}

export const MODE01_PIDS: Record<string, OBDPID> = {
    "01": { "pid": "01", "bytes": 4, "description": "Monitor status: MIL status and DTC count" },
    "04": { "pid": "04", "bytes": 1, "description": "Calculated engine load value", "unit": "%", "fact": 100, "div": 255 },
    "05": { "pid": "05", "bytes": 1, "description": "Engine coolant temperature", "unit": "°C", "offs": -40 },
    "06": { "pid": "06", "bytes": 1, "description": "Short term fuel % trim—Bank 1", "unit": "%", "fact": 100, "div": 128, "offs": -100 },
    "07": { "pid": "07", "bytes": 1, "description": "Long term fuel % trim—Bank 1", "unit": "%", "fact": 100, "div": 128, "offs": -100 },
    "08": { "pid": "08", "bytes": 1, "description": "Short term fuel % trim—Bank 2", "unit": "%", "fact": 100, "div": 128, "offs": -100 },
    "09": { "pid": "09", "bytes": 1, "description": "Long term fuel % trim—Bank 2", "unit": "%", "fact": 100, "div": 128, "offs": -100 },
    "0A": { "pid": "0A", "bytes": 1, "description": "Fuel pressure", "unit": "kPa", "fact": 3 },
    "0B": { "pid": "0B", "bytes": 1, "description": "Intake manifold absolute pressure", "unit": "kPa" },
    "0C": { "pid": "0C", "bytes": 2, "description": "Engine RPM", "unit": "RPM", "div": 4 },
    "0D": { "pid": "0D", "bytes": 1, "description": "Vehicle speed", "unit": "km/h" },
    "0E": { "pid": "0E", "bytes": 1, "description": "Timing advance", "unit": "°", "fact": 1, "div": 2, "offs": -64 },
    "0F": { "pid": "10", "bytes": 1, "description": "Intake air temperature", "unit": "°C", "offs": -40 },
    "10": { "pid": "10", "bytes": 2, "description": "MAF air flow rate", "unit": "g/s", "div": 100 },
    "11": { "pid": "11", "bytes": 1, "description": "Throttle position", "unit": "%", "fact": 100, "div": 255 },
    "1F": { "pid": "1F", "bytes": 2, "description": "Run time since engine start", "unit": "sec" },
    "21": { "pid": "21", "bytes": 2, "description": "Distance traveled with MIL on", "unit": "km" },
    "2F": { "pid": "2F", "bytes": 1, "description": "Fuel Level Input", "unit": "%", "fact": 100, "div": 255 },
    "31": { "pid": "31", "bytes": 2, "description": "Distance traveled since codes cleared", "unit": "km" },
    "33": { "pid": "33", "bytes": 1, "description": "Barometric pressure", "unit": "kPa" },
    "42": { "pid": "42", "bytes": 2, "description": "Control module voltage", "unit": "V", "div": 1000 },
    "43": { "pid": "43", "bytes": 2, "description": "Absolute load value", "unit": "%", "fact": 100, "div": 255 },
    "46": { "pid": "46", "bytes": 1, "description": "Ambient air temperature", "unit": "°C", "offs": -40 },
    "5C": { "pid": "5C", "bytes": 1, "description": "Engine oil temperature", "unit": "°C", "offs": -40 },
    "A6": { "pid": "A6", "bytes": 4, "description": "Odometer", "unit": "km", "div": 10 },
};

export const MODE09_PIDS: Record<string, OBDPID> = {
    "02": { "pid": "02", "bytes": 20, "description": "Vehicle Identification Number (VIN)" },
    "0A": { "pid": "0A", "bytes": 20, "description": "ECU name" },
};

export const OBD_FORMULAS: Record<string, (bytes: number[]) => number | string> = {
    "01": (bytes) => {
        const milOn = (bytes[0] & 0x80) !== 0;
        const dtcCount = bytes[0] & 0x7F;
        return `${milOn ? 'MIL ON' : 'CLEAN'} (${dtcCount} DTCs)`;
    },
    "0B": (bytes) => bytes[0],
    "1F": (bytes) => bytes[0] * 256 + bytes[1],
    "21": (bytes) => bytes[0] * 256 + bytes[1],
    "31": (bytes) => bytes[0] * 256 + bytes[1],
    "33": (bytes) => bytes[0],
    "A6": (bytes) => Number(((bytes[0] * 16777216 + bytes[1] * 65536 + bytes[2] * 256 + bytes[3]) / 10).toFixed(1)),
    // Mode 09 VIN Decoder
    "VIN": (bytes) => {
        // Skip first byte if it's the message count or similar depending on ELM protocol
        // Standard ISO 15765-4 returns bytes starting from offset
        return bytes
            .filter(b => b > 31 && b < 127) // Only printable ASCII
            .map(b => String.fromCharCode(b))
            .join('')
            .trim();
    }
};
