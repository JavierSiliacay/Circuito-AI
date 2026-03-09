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

import { MODE01_PIDS, OBD_FORMULAS } from '@/config/obd-pids';

/**
 * Decodes the raw hexadecimal response from an ELM327/OBDII adapter
 */
export function decodeOBDResponse(pid: string, bytes: string[]): { value: number | string; unit: string; label: string } | null {
    const pidConfig = MODE01_PIDS[pid];
    if (!pidConfig) return null;

    // Convert hex strings to numbers
    const values = bytes.map(b => parseInt(b, 16));

    // Check if we have enough bytes
    if (values.length < pidConfig.bytes) return null;

    const formula = OBD_FORMULAS[pid];
    if (formula) {
        return {
            value: formula(values),
            unit: pidConfig.unit || '',
            label: pidConfig.description.split(':')[0].split('—')[0].trim() // Clean up long descriptions
        };
    }

    return null;
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

    // 2. Handle Service 01 Responses (41 XX ...)
    if (cleanLine.startsWith('41')) {
        const pid = cleanLine.substring(2, 4);
        const bytes = [];
        for (let i = 4; i < cleanLine.length; i += 2) {
            bytes.push(cleanLine.substring(i, i + 2));
        }

        const decoded = decodeOBDResponse(pid, bytes);
        if (decoded) {
            const key = Object.keys(MODE01_PIDS).find(
                k => MODE01_PIDS[k].pid === pid
            );
            if (key) {
                return { key, data: decoded };
            }
        }
    }

    return null;
}
