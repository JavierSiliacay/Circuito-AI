'use client';

import { Handle, Position } from 'reactflow';
import { Cpu, CircuitBoard } from 'lucide-react';
import { motion } from 'framer-motion';

const MCU_PINS = {
    'ESP32': [
        '3V3', 'EN', 'VP', 'VN', 'G34', 'G35', 'G32', 'G33',
        'G25', 'G26', 'G27', 'G14', 'G12', 'G13', 'GND'
    ],
    'Arduino Uno': [
        'RESET', '3.3V', '5V', 'GND', 'VIN', 'A0', 'A1', 'A2',
        'A3', 'A4', 'A5', 'D0', 'D1', 'D2', 'D3', 'D4'
    ]
};

export function MCUNode({ data }: { data: { label: string; board: keyof typeof MCU_PINS } }) {
    const pins = MCU_PINS[data.board] || [];
    const Icon = data.board === 'Arduino Uno' ? CircuitBoard : Cpu;

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-4 py-3 rounded-xl bg-surface-2 border-2 border-cyan-primary/30 min-w-[180px] shadow-lg glow-cyan"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-primary/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-cyan-primary" />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">{data.label}</h3>
                    <p className="text-[10px] text-text-muted">{data.board}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 relative">
                {/* Left side handles (input/output) */}
                <div className="space-y-2">
                    {pins.slice(0, Math.ceil(pins.length / 2)).map((pin, i) => (
                        <div key={pin} className="flex items-center gap-2 group">
                            <div className="relative">
                                <Handle
                                    type="source"
                                    position={Position.Left}
                                    id={pin}
                                    style={{ left: -18, top: 4, background: '#00D9FF', border: 'none', width: 8, height: 8 }}
                                />
                                <span className="text-[9px] font-mono text-text-muted group-hover:text-cyan-primary transition-colors">{pin}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right side handles */}
                <div className="space-y-2 text-right">
                    {pins.slice(Math.ceil(pins.length / 2)).map((pin, i) => (
                        <div key={pin} className="flex items-center justify-end gap-2 group">
                            <div className="relative">
                                <span className="text-[9px] font-mono text-text-muted group-hover:text-cyan-primary transition-colors">{pin}</span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={pin}
                                    style={{ right: -18, top: 4, background: '#00D9FF', border: 'none', width: 8, height: 8 }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
