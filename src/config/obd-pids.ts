export interface OBDPID {
    pid: string;
    bytes: number;
    description: string;
    unit?: string;
    formula?: (bytes: number[]) => number | string;
}

export const MODE01_PIDS: Record<string, OBDPID> = {
    "04": { "pid": "04", "bytes": 1, "description": "Calculated engine load value", "unit": "%" },
    "05": { "pid": "05", "bytes": 1, "description": "Engine coolant temperature", "unit": "°C" },
    "06": { "pid": "06", "bytes": 1, "description": "Short term fuel % trim—Bank 1", "unit": "%" },
    "07": { "pid": "07", "bytes": 1, "description": "Long term fuel % trim—Bank 1", "unit": "%" },
    "08": { "pid": "08", "bytes": 1, "description": "Short term fuel % trim—Bank 2", "unit": "%" },
    "09": { "pid": "09", "bytes": 1, "description": "Long term fuel % trim—Bank 2", "unit": "%" },
    "0A": { "pid": "0A", "bytes": 1, "description": "Fuel pressure", "unit": "kPa" },
    "0B": { "pid": "0B", "bytes": 1, "description": "Intake manifold absolute pressure", "unit": "kPa" },
    "0C": { "pid": "0C", "bytes": 2, "description": "Engine RPM", "unit": "RPM" },
    "0D": { "pid": "0D", "bytes": 1, "description": "Vehicle speed", "unit": "km/h" },
    "0E": { "pid": "0E", "bytes": 1, "description": "Timing advance", "unit": "°" },
    "0F": { "pid": "10", "bytes": 1, "description": "Intake air temperature", "unit": "°C" },
    "10": { "pid": "10", "bytes": 2, "description": "MAF air flow rate", "unit": "g/s" },
    "11": { "pid": "11", "bytes": 1, "description": "Throttle position", "unit": "%" },
    "1F": { "pid": "1F", "bytes": 2, "description": "Run time since engine start", "unit": "sec" },
    "21": { "pid": "21", "bytes": 2, "description": "Distance traveled with MIL on", "unit": "km" },
    "2F": { "pid": "2F", "bytes": 1, "description": "Fuel Level Input", "unit": "%" },
    "33": { "pid": "33", "bytes": 1, "description": "Barometric pressure", "unit": "kPa" },
    "42": { "pid": "42", "bytes": 2, "description": "Control module voltage", "unit": "V" },
    "43": { "pid": "43", "bytes": 2, "description": "Absolute load value", "unit": "%" },
    "46": { "pid": "46", "bytes": 1, "description": "Ambient air temperature", "unit": "°C" },
    "5C": { "pid": "5C", "bytes": 1, "description": "Engine oil temperature", "unit": "°C" },
};

export const MODE09_PIDS: Record<string, OBDPID> = {
    "02": { "pid": "02", "bytes": 20, "description": "Vehicle Identification Number (VIN)" },
    "0A": { "pid": "0A", "bytes": 20, "description": "ECU name" },
};

export const OBD_FORMULAS: Record<string, (bytes: number[]) => number | string> = {
    "0C": (bytes) => Math.round(((bytes[0] * 256) + bytes[1]) / 4),
    "0D": (bytes) => bytes[0],
    "05": (bytes) => bytes[0] - 40,
    "0F": (bytes) => bytes[0] - 40,
    "04": (bytes) => Math.round((bytes[0] * 100) / 255),
    "11": (bytes) => Math.round((bytes[0] * 100) / 255),
    "06": (bytes) => Number(((bytes[0] - 128) * 100 / 128).toFixed(1)),
    "07": (bytes) => Number(((bytes[0] - 128) * 100 / 128).toFixed(1)),
    "08": (bytes) => Number(((bytes[0] - 128) * 100 / 128).toFixed(1)),
    "09": (bytes) => Number(((bytes[0] - 128) * 100 / 128).toFixed(1)),
    "0A": (bytes) => bytes[0] * 3,
    "0B": (bytes) => bytes[0],
    "10": (bytes) => Number(((bytes[0] * 256 + bytes[1]) / 100).toFixed(2)),
    "0E": (bytes) => (bytes[0] - 128) / 2,
    "1F": (bytes) => bytes[0] * 256 + bytes[1],
    "21": (bytes) => bytes[0] * 256 + bytes[1],
    "2F": (bytes) => Math.round((bytes[0] * 100) / 255),
    "33": (bytes) => bytes[0],
    "42": (bytes) => Number(((bytes[0] * 256 + bytes[1]) / 1000).toFixed(2)),
    "43": (bytes) => Math.round((bytes[0] * 256 + bytes[1]) * 100 / 255),
    "46": (bytes) => bytes[0] - 40,
    "5C": (bytes) => bytes[0] - 40,
};
