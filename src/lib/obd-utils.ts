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

import { MODE01_PIDS, MODE09_PIDS, OBD_FORMULAS } from '@/config/obd-pids';

/**
 * Decodes the raw hexadecimal response from an ELM327/OBDII adapter
 */
export function decodeOBDResponse(pid: string, bytes: string[], mode: string = '01'): { value: number | string; unit: string; label: string } | null {
    const config = mode === '01' ? MODE01_PIDS : MODE09_PIDS;
    const pidConfig = config[pid];
    if (!pidConfig) return null;

    // Convert hex strings to numbers
    const values = bytes.map(b => parseInt(b, 16));

    // Mode 09 (VIN) often has variable length or headers, we might need to be more flexible
    if (mode === '01' && values.length < pidConfig.bytes) return null;

    let decodedValue: number | string = 0;

    // 1. Check for hardcoded complex formulas first (e.g. VIN)
    const formulaKey = mode === '09' && pid === '02' ? 'VIN' : pid;
    const hardcodedFormula = OBD_FORMULAS[formulaKey];

    if (hardcodedFormula) {
        decodedValue = hardcodedFormula(values);
    }
    // 2. Linear Conversion Engine (AndrOBD style)
    else {
        // Concatenate bytes into a single raw value (Big Endian)
        let raw = 0;
        for (let i = 0; i < pidConfig.bytes; i++) {
            raw = (raw << 8) | (values[i] || 0);
        }

        // Apply bit-level masking if defined
        if (pidConfig.bitMask !== undefined) {
            raw = raw & pidConfig.bitMask;
        }
        if (pidConfig.bitOffset !== undefined && pidConfig.bitLength !== undefined) {
            raw = (raw >> pidConfig.bitOffset) & ((1 << pidConfig.bitLength) - 1);
        }

        // Apply Linear Math: (raw * FACT / DIV) + OFFS
        const fact = pidConfig.fact ?? 1;
        const div = pidConfig.div ?? 1;
        const offs = pidConfig.offs ?? 0;

        const result = (raw * fact / div) + offs;

        // Format based on precision
        decodedValue = Number.isInteger(result) ? result : Number(result.toFixed(2));
    }

    return {
        value: decodedValue,
        unit: pidConfig.unit || '',
        label: pidConfig.description.split(':')[0].split('—')[0].trim()
    };
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

/**
 * High-level parser for ELM327 raw lines
 */
export function parseOBDLine(line: string): { key: string; data: { value: number | string; unit: string; label: string } } | null {
    const cleanLine = line.trim().replace(/\s+/g, '');

    // 1. Handle Battery Voltage (ATRV) -> e.g. "12.4V"
    if (cleanLine.includes('V') && /^\d+\.\d+V$/.test(cleanLine)) {
        return {
            key: 'VOLTAGE',
            data: { value: cleanLine.replace('V', ''), unit: 'V', label: 'Battery' }
        };
    }

    // 2. Handle Service 01 Responses (41 XX ...) - Live Data
    if (cleanLine.startsWith('41')) {
        const pid = cleanLine.substring(2, 4);
        const bytes = [];
        for (let i = 4; i < cleanLine.length; i += 2) {
            bytes.push(cleanLine.substring(i, i + 2));
        }

        const decoded = decodeOBDResponse(pid, bytes, '01');
        if (decoded) {
            const key = Object.keys(MODE01_PIDS).find(
                k => MODE01_PIDS[k].pid === pid
            );
            if (key) {
                return { key, data: decoded };
            }
        }
    }

    // 3. Handle Service 09 Responses (49 XX ...) - Vehicle Info
    if (cleanLine.startsWith('49')) {
        const pid = cleanLine.substring(2, 4);
        const bytes = [];
        for (let i = 4; i < cleanLine.length; i += 2) {
            bytes.push(cleanLine.substring(i, i + 2));
        }

        const decoded = decodeOBDResponse(pid, bytes, '09');
        if (decoded) {
            return { key: 'VEHICLE_INFO_' + pid, data: decoded };
        }
    }

    // 4. Handle ELM327 status messages
    const upper = cleanLine.toUpperCase();
    if (upper === 'NODATA' || upper === 'SEARCHING' || upper === 'STOPPED' || upper === 'BUSINIT') {
        const labels: Record<string, string> = {
            'NODATA': 'ECU Not Responding (No Data)',
            'SEARCHING': 'Searching for Protocol...',
            'STOPPED': 'Connection Stopped',
            'BUSINIT': 'Bus Initialization in progress...'
        };
        return {
            key: 'ELM_STATUS',
            data: { value: upper, unit: '', label: labels[upper] || upper }
        };
    }

    return null;
}
