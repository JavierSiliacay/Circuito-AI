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
    // Clean the line: remove whitespace and potential frame/protocol headers
    // ELM327 often adds "0:", "1:", etc. for multi-frame or protocol IDs like "7E8"
    let cleanLine = line.trim().replace(/\s+/g, '').toUpperCase();

    // 🔍 STRIP COMMON PROTOCOL HEADERS
    // Strip frame numbers (0:, 1:, etc)
    cleanLine = cleanLine.replace(/^[0-9]:/, '');
    // Strip ISO 15765-4 PCI (Protocol Control Information) 
    // e.g. "10 14 49 02..." -> some adapters might keep these
    if (cleanLine.length > 2 && /^[0-9A-F]{2}/.test(cleanLine)) {
        // If it looks like a long hex string, we try to find 41, 49, or 62 inside
        const start41 = cleanLine.indexOf('41');
        const start49 = cleanLine.indexOf('49');
        const start62 = cleanLine.indexOf('62'); // UDS Response

        let targetStart = -1;
        if (start41 !== -1) targetStart = start41;
        if (start49 !== -1 && (targetStart === -1 || start49 < targetStart)) targetStart = start49;
        if (start62 !== -1 && (targetStart === -1 || start62 < targetStart)) targetStart = start62;

        if (targetStart !== -1) {
            cleanLine = cleanLine.substring(targetStart);
        }
    }

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

    // 4. Handle UDS Service 22 Responses (62 F1 90 ...) - Modern VIN
    if (cleanLine.startsWith('62F190')) {
        const bytes = [];
        for (let i = 6; i < cleanLine.length; i += 2) {
            bytes.push(cleanLine.substring(i, i + 2));
        }

        const formula = OBD_FORMULAS['VIN'];
        if (formula) {
            return {
                key: 'VEHICLE_INFO_02',
                data: {
                    value: formula(bytes.map(b => parseInt(b, 16))),
                    unit: '',
                    label: 'Vehicle Identification Number (UDS)'
                }
            };
        }
    }

    // 5. Handle Service 03 (Stored DTCs) and 07 (Pending DTCs)
    if (cleanLine.startsWith('43') || cleanLine.startsWith('47')) {
        const isPending = cleanLine.startsWith('47');
        const dtcs: string[] = [];
        // Each DTC is 2 bytes (4 hex chars). Standard OBD2 response starts after '43' or '47'
        for (let i = 2; i + 3 < cleanLine.length; i += 4) {
            const byte1 = cleanLine.substring(i, i + 2);
            const byte2 = cleanLine.substring(i + 2, i + 4);
            if (byte1 === '00' && byte2 === '00') continue; // Skip padding
            dtcs.push(decodeDTC(byte1, byte2));
        }

        if (dtcs.length === 0) {
            return {
                key: isPending ? 'PENDING_DTC' : 'STORED_DTC',
                data: { value: 'None', unit: '', label: isPending ? 'Pending Codes' : 'Stored Codes' }
            };
        }

        return {
            key: isPending ? 'PENDING_DTC' : 'STORED_DTC',
            data: {
                value: dtcs.join(', '),
                unit: '',
                label: isPending ? 'Pending Trouble Codes' : 'Stored Trouble Codes'
            }
        };
    }

    // 6. Handle Custom Arduino Sniffer Format (ID:0x7E8 D:43 01 ...)
    const upper = line.trim().toUpperCase();
    if (upper.startsWith('ID:0X')) {
        const idPart = upper.split('D:')[0].replace('ID:0X', '').trim();
        const dataPart = upper.split('D:')[1]?.trim() || '';

        // 🕵️ SCAVENGER: Even if it's raw CAN, check if Service 09 (VIN) or Service 62 (UDS) is hiding inside
        const scavengeLine = dataPart.replace(/\s+/g, '');
        const hasService09 = scavengeLine.includes('4902');
        const hasService62 = scavengeLine.includes('62F190');

        if (hasService09 || hasService62) {
            const startIndex = hasService09 ? scavengeLine.indexOf('4902') : scavengeLine.indexOf('62F190');
            return parseOBDLine(scavengeLine.substring(startIndex));
        }

        // Check if this is an OBD-style response (e.g. 0x7E8)
        if (dataPart.startsWith('41') || dataPart.startsWith('43') || dataPart.startsWith('47') || dataPart.startsWith('49')) {
            // Recurse using the data content to reuse existing OBD logic
            return parseOBDLine(dataPart.trim());
        }

        return {
            key: `RAW_CAN_0x${idPart}`,
            data: {
                value: dataPart,
                unit: 'HEX',
                label: `CAN ID: 0x${idPart}`
            }
        };
    }

    // 7. Handle ELM327 status messages
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

    // 8. Handle Custom Greetings
    if (upper.includes('GHOST_SNIFFER_ACTIVE')) {
        return {
            key: 'SYSTEM_STATUS',
            data: { value: 'READY', unit: '', label: 'Ghost Sniffer Active' }
        };
    }

    return null;
}
