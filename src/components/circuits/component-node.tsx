'use client';

import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { Lightbulb, Minus, Gauge, Radio, RotateCcw, BatteryCharging } from 'lucide-react';

const ICONS = {
    'LED': Lightbulb,
    'Resistor': Minus,
    'Sensor': Gauge,
    'Buzzer': Radio,
    'Motor': RotateCcw,
    'Battery': BatteryCharging,
};

const COLORS = {
    'LED': 'text-yellow-400',
    'Resistor': 'text-orange-400',
    'Sensor': 'text-green-400',
    'Buzzer': 'text-purple-400',
    'Motor': 'text-red-400',
    'Battery': 'text-emerald-400',
};

export function ComponentNode({ data }: { data: { label: string; type: string } }) {
    const Icon = ICONS[data.label as keyof typeof ICONS] || Minus;
    const colorClass = COLORS[data.label as keyof typeof COLORS] || 'text-text-primary';

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-3 rounded-lg bg-surface-3 border border-border-dim min-w-[100px] flex items-center flex-col gap-2 relative shadow-md hover:border-border-bright transition-all"
        >
            <Handle
                type="target"
                position={Position.Left}
                id="in"
                style={{ left: -4, background: '#444', border: '1px solid #666' }}
            />

            <div className={`w-10 h-10 rounded-full bg-surface-base flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${colorClass}`} />
            </div>

            <span className="text-[10px] font-semibold text-text-primary text-center">{data.label}</span>

            <Handle
                type="source"
                position={Position.Right}
                id="out"
                style={{ right: -4, background: '#444', border: '1px solid #666' }}
            />
        </motion.div>
    );
}
