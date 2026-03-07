/**
 * OBDII Protocol Utility
 * Standard PIDs and service commands for vehicle diagnostics.
 */

export const OBD_SERVICES = {
    LIVE_DATA: '01',
    FREEZE_FRAME: '02',
    SHOW_DTC: '03',
    CLEAR_DTC: '04',
    O2_MONITOR: '05',
    NON_CAN_MONITOR: '06',
    PENDING_DTC: '07',
    CONTROL_OPERATION: '08',
    VEHICLE_INFO: '09',
    PERMANENT_DTC: '0A',
};

export const COMMON_PIDS = {
    RPM: '0C',             // 01 0C 
    SPEED: '0D',           // 01 0D
    COOLANT_TEMP: '05',    // 01 05
    ENGINE_LOAD: '04',     // 01 04
    FUEL_TRIM_SHORT: '06', // 01 06
    FUEL_TRIM_LONG: '07',  // 01 07
    THROTTLE_POS: '11',    // 01 11
    BATTERY_VOLTAGE: 'ATRV', // ELM327 specific for battery
};

/**
 * Decodes the raw hexadecimal response from an ELM327/OBDII adapter
 */
export function decodeOBDResponse(pid: string, bytes: string[]): { value: number; unit: string; label: string } | null {
    if (bytes.length < 2) return null;

    // Convert hex strings to numbers
    const values = bytes.map(b => parseInt(b, 16));
    const A = values[0];
    const B = values[1];

    switch (pid) {
        case COMMON_PIDS.RPM:
            return { value: Math.round(((A * 256) + B) / 4), unit: 'RPM', label: 'Engine Speed' };
        case COMMON_PIDS.SPEED:
            return { value: A, unit: 'km/h', label: 'Vehicle Speed' };
        case COMMON_PIDS.COOLANT_TEMP:
            return { value: A - 40, unit: '°C', label: 'Engine Coolant' };
        case COMMON_PIDS.ENGINE_LOAD:
            return { value: Math.round((A * 100) / 255), unit: '%', label: 'Calculated Load' };
        case COMMON_PIDS.THROTTLE_POS:
            return { value: Math.round((A * 100) / 255), unit: '%', label: 'Throttle Position' };
        default:
            return null;
    }
}

/**
 * Format a DTC from hex bytes (e.g. 03 02 -> P0302)
 */
export function decodeDTC(byte1: string, byte2: string): string {
    const b1 = parseInt(byte1, 16);
    const b2 = byte2; // Keep as hex string part

    const prefixes = ['P', 'C', 'B', 'U'];
    const prefix = prefixes[(b1 & 0xC0) >> 6];
    const digit1 = (b1 & 0x30) >> 4;
    const digit2 = b1 & 0x0F;

    return `${prefix}${digit1}${digit2}${b2}`;
}
