'use client';

import { motion } from 'framer-motion';
import {
    CircuitBoard,
    Plus,
    Cpu,
    Zap,
    RotateCcw,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Grid3X3,
    Minus,
    MousePointer2,
    Hand,
    Lightbulb,
    Gauge,
    Radio,
    BatteryCharging,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import IDENavbar from '@/components/ide/navbar';

const components = [
    { name: 'LED', icon: Lightbulb, category: 'Output', color: 'text-yellow-400' },
    { name: 'Resistor', icon: Minus, category: 'Passive', color: 'text-orange-400' },
    { name: 'ESP32', icon: Cpu, category: 'MCU', color: 'text-cyan-primary' },
    { name: 'Arduino Uno', icon: CircuitBoard, category: 'MCU', color: 'text-blue-400' },
    { name: 'Sensor', icon: Gauge, category: 'Input', color: 'text-green-400' },
    { name: 'Buzzer', icon: Radio, category: 'Output', color: 'text-purple-400' },
    { name: 'Motor', icon: RotateCcw, category: 'Output', color: 'text-red-400' },
    { name: 'Battery', icon: BatteryCharging, category: 'Power', color: 'text-emerald-400' },
];

export default function CircuitsPage() {
    return (
        <div className="h-screen flex flex-col overflow-hidden bg-surface-base">
            <IDENavbar />

            <div className="flex-1 flex overflow-hidden">
                {/* Component Library Panel */}
                <motion.aside
                    initial={{ x: -250, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-60 bg-surface-1 border-r border-border-dim flex flex-col shrink-0"
                >
                    <div className="px-4 py-3 border-b border-border-dim">
                        <h2 className="text-sm font-semibold text-text-primary">
                            Component Library
                        </h2>
                        <p className="text-[11px] text-text-muted mt-0.5">
                            Drag components to canvas
                        </p>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-1">
                            {components.map((comp) => {
                                const Icon = comp.icon;
                                return (
                                    <motion.button
                                        key={comp.name}
                                        whileHover={{ x: 4 }}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-3/50 transition-all text-left group cursor-grab active:cursor-grabbing"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-surface-3/60 flex items-center justify-center group-hover:bg-surface-4 transition-colors">
                                            <Icon className={`w-4 h-4 ${comp.color}`} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-text-primary">
                                                {comp.name}
                                            </p>
                                            <p className="text-[10px] text-text-muted">{comp.category}</p>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <div className="p-3 border-t border-border-dim">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-surface-3/40 border-border-dim hover:bg-surface-4 text-xs gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Import Component
                        </Button>
                    </div>
                </motion.aside>

                {/* Canvas Area */}
                <div className="flex-1 flex flex-col relative">
                    {/* Toolbar */}
                    <div className="h-10 bg-surface-1 border-b border-border-dim flex items-center px-3 gap-1">
                        {[
                            { icon: MousePointer2, label: 'Select' },
                            { icon: Hand, label: 'Pan' },
                            { icon: ZoomIn, label: 'Zoom In' },
                            { icon: ZoomOut, label: 'Zoom Out' },
                            { icon: Maximize2, label: 'Fit View' },
                            { icon: Grid3X3, label: 'Toggle Grid' },
                            { icon: RotateCcw, label: 'Undo' },
                        ].map((tool) => {
                            const Icon = tool.icon;
                            return (
                                <button
                                    key={tool.label}
                                    className="p-2 text-text-muted hover:text-text-primary hover:bg-white/5 rounded transition-all"
                                    title={tool.label}
                                >
                                    <Icon className="w-4 h-4" />
                                </button>
                            );
                        })}
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 relative overflow-hidden bg-surface-base">
                        {/* Grid background */}
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage:
                                    'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />

                        {/* Placeholder content */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="text-center"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-surface-2/50 border border-border-dim flex items-center justify-center mx-auto mb-4 animate-float">
                                    <CircuitBoard className="w-10 h-10 text-cyan-primary/40" />
                                </div>
                                <h3 className="text-sm font-semibold text-text-secondary mb-1">
                                    Circuit Builder
                                </h3>
                                <p className="text-xs text-text-muted max-w-xs">
                                    Drag components from the library to start designing your circuit.
                                    Connect pins to create wiring.
                                </p>
                            </motion.div>
                        </div>

                        {/* Example placed components */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="absolute top-20 left-40"
                        >
                            <div className="w-32 h-20 rounded-xl bg-surface-2/80 border border-cyan-primary/30 p-3 cursor-move hover:border-cyan-primary/50 transition-colors glow-cyan">
                                <div className="flex items-center gap-2 mb-2">
                                    <Cpu className="w-4 h-4 text-cyan-primary" />
                                    <span className="text-[10px] font-semibold text-text-primary">
                                        ESP32-S3
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-2 h-2 rounded-sm bg-surface-4 border border-border-dim"
                                            title={`GPIO ${i}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            className="absolute top-28 right-60"
                        >
                            <div className="w-24 h-16 rounded-xl bg-surface-2/80 border border-yellow-400/30 p-3 cursor-move hover:border-yellow-400/50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                                    <span className="text-[10px] font-semibold text-text-primary">
                                        LED
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Wire connecting them */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            <motion.path
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.4 }}
                                transition={{ delay: 1.2, duration: 0.8 }}
                                d="M 300 110 Q 450 105, 560 120"
                                fill="none"
                                stroke="#00D9FF"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                            />
                        </svg>
                    </div>
                </div>

                {/* Properties Panel */}
                <motion.aside
                    initial={{ x: 280, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="w-64 bg-surface-1 border-l border-border-dim flex flex-col shrink-0"
                >
                    <div className="px-4 py-3 border-b border-border-dim">
                        <h2 className="text-sm font-semibold text-text-primary">
                            Properties
                        </h2>
                    </div>

                    <div className="p-4 space-y-4">
                        <div>
                            <label className="text-[11px] text-text-muted block mb-1.5">
                                Component
                            </label>
                            <p className="text-xs font-medium text-text-primary">ESP32-S3</p>
                        </div>
                        <div>
                            <label className="text-[11px] text-text-muted block mb-1.5">
                                Position
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="px-2.5 py-1.5 bg-surface-3/40 border border-border-dim rounded text-xs text-text-secondary">
                                    X: 160
                                </div>
                                <div className="px-2.5 py-1.5 bg-surface-3/40 border border-border-dim rounded text-xs text-text-secondary">
                                    Y: 80
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] text-text-muted block mb-1.5">
                                Pins Used
                            </label>
                            <div className="flex flex-wrap gap-1">
                                {['GPIO2', 'GPIO4', 'GPIO5', 'GND', '3V3'].map((pin) => (
                                    <span
                                        key={pin}
                                        className="px-2 py-0.5 bg-surface-3/40 border border-border-dim rounded text-[10px] text-text-secondary"
                                    >
                                        {pin}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] text-text-muted block mb-1.5">
                                Connections
                            </label>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                    <span className="w-2 h-2 rounded-full bg-cyan-primary" />
                                    GPIO2 → LED (Anode)
                                </div>
                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                    <span className="w-2 h-2 rounded-full bg-orange-warning" />
                                    GND → LED (Cathode)
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.aside>
            </div>
        </div>
    );
}
