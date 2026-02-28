'use client';

import { useCallback, useRef, useState } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    Background,
    Controls,
    Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { motion } from 'framer-motion';
import {
    Plus,
    CircuitBoard,
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
    Trash2,
    Sparkles,
    Loader2,
    Wand2,
    Image as ImageIcon,
    Download,
    AlertTriangle,
    Code2,
    ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import IDENavbar from '@/components/ide/navbar';
import Link from 'next/link';
import { CircuitoLogo } from '@/components/ui/logo';
import { BrandBot } from '@/components/ui/brand-bot';
import { useProjectStore } from '@/store/project-store';
import { useCircuitStore } from '@/store/circuit-store';
import { MCUNode } from '@/components/circuits/mcu-node';
import { ComponentNode } from '@/components/circuits/component-node';
import { useIDEStore } from '@/store/ide-store';
import { useRouter } from 'next/navigation';

const nodeTypes = {
    mcu: MCUNode,
    component: ComponentNode,
};

const components = [
    { name: 'ESP32', icon: Cpu, category: 'MCU', color: 'text-cyan-primary', type: 'mcu' },
    { name: 'Arduino Uno', icon: CircuitBoard, category: 'MCU', color: 'text-blue-400', type: 'mcu' },
    { name: 'LED', icon: Lightbulb, category: 'Output', color: 'text-yellow-400', type: 'component' },
    { name: 'Resistor', icon: Minus, category: 'Passive', color: 'text-orange-400', type: 'component' },
    { name: 'Sensor', icon: Gauge, category: 'Input', color: 'text-green-400', type: 'component' },
    { name: 'Buzzer', icon: Radio, category: 'Output', color: 'text-purple-400', type: 'component' },
    { name: 'Motor', icon: RotateCcw, category: 'Output', color: 'text-red-400', type: 'component' },
    { name: 'Battery', icon: BatteryCharging, category: 'Power', color: 'text-emerald-400', type: 'component' },
];

function CircuitBuilder() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [prompt, setPrompt] = useState('');

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        setEdges,
        addNode,
        deleteNode,
        selectedNodeId,
        setSelectedNodeId,
        clearCircuit,
        isAiGenerating,
        setAiGenerating,
        aiGeneratedImage,
        setAiGeneratedImage
    } = useCircuitStore();

    const [error, setError] = useState<string | null>(null);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const { setEditorContent } = useIDEStore();
    const router = useRouter();

    const handleAiGenerate = async () => {
        if (!prompt.trim()) return;
        setAiGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/circuit-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate schematic');
            }

            const data = await response.json();
            setIsImageLoading(true); // Start image loading for the <img> tag
            setAiGeneratedImage(data.imageUrl);
        } catch (err) {
            console.error('AI Generation Error:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            // For demo purposes if API key is missing, show a simulated failure or specific message
            if (err instanceof Error && err.message.includes('API Key')) {
                alert('OpenRouter API Key not found. Please add it to your .env.local to enable real AI schematic generation.');
            }
        } finally {
            setAiGenerating(false);
        }
    };

    const handleInteractiveGenerate = async () => {
        if (!prompt.trim()) return;
        setAiGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/circuit-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to build circuit');
            }

            const data = await response.json();
            if (data.nodes && data.edges) {
                setNodes(data.nodes);
                setEdges(data.edges);
                setAiGeneratedImage(null); // Close blueprint view if open
            }
        } catch (err) {
            console.error('Interactive Build Error:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setAiGenerating(false);
        }
    };

    const handleGenerateCode = async () => {
        if (nodes.length === 0) {
            setError('Add components to the canvas first!');
            return;
        }

        setIsGeneratingCode(true);
        setError(null);

        try {
            const mcuNode = nodes.find(n => n.type === 'mcu');
            const response = await fetch('/api/ai/circuit-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodes,
                    edges,
                    boardType: mcuNode?.data.label || 'ESP32'
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Code generation failed');
            }

            const data = await response.json();
            if (data.code) {
                // Save to IDE editor and navigate
                setEditorContent(data.code);
                router.push('/ide');
            }
        } catch (err) {
            console.error('Code Generation Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate code');
        } finally {
            setIsGeneratingCode(false);
        }
    };

    const handleDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowInstance || !reactFlowWrapper.current) return;

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const dataStr = event.dataTransfer.getData('application/reactflow');
            if (!dataStr) return;

            const { type, label } = JSON.parse(dataStr);

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNode = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: { label, board: label },
            };

            addNode(newNode);
        },
        [reactFlowInstance, addNode]
    );

    const onNodeClick = (_: React.MouseEvent | React.TouchEvent, node: any) => {
        setSelectedNodeId(node.id);
    };

    const onPaneClick = () => {
        setSelectedNodeId(null);
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: Library & AI Designer */}
            <motion.aside
                initial={{ x: -250, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="w-72 bg-surface-1 border-r border-border-dim flex flex-col shrink-0"
            >
                {/* AI Design Mode */}
                <div className="p-4 border-b border-border-dim bg-gradient-to-b from-purple-ai/10 to-transparent">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-ai to-indigo-500 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h2 className="text-sm font-bold text-text-primary">AI Circuit Designer</h2>
                    </div>

                    <div className="space-y-3">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your project (e.g., 'An ESP32 home weather station with OLED and BME280 sensor')"
                            className="w-full h-24 bg-surface-base border border-border-dim rounded-xl p-3 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-purple-ai/40 transition-all resize-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={handleAiGenerate}
                                disabled={isAiGenerating || !prompt.trim()}
                                className="bg-surface-3 border border-border-dim hover:bg-surface-4 text-text-primary text-[10px] h-9 gap-1.5 transition-all shadow-md"
                            >
                                {isAiGenerating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <ImageIcon className="w-3 h-3 text-purple-ai" />
                                )}
                                Blueprint
                            </Button>
                            <Button
                                onClick={handleInteractiveGenerate}
                                disabled={isAiGenerating || !prompt.trim()}
                                className="bg-gradient-to-r from-purple-ai to-indigo-600 hover:from-purple-hover hover:to-indigo-700 text-white text-[10px] h-9 gap-1.5 transition-all shadow-lg glow-purple disabled:opacity-50"
                            >
                                {isAiGenerating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Wand2 className="w-3 h-3" />
                                )}
                                Build Lab
                            </Button>
                        </div>

                        {/* Generate Code Button */}
                        <Button
                            onClick={handleGenerateCode}
                            disabled={isGeneratingCode || nodes.length === 0}
                            className="w-full bg-gradient-to-r from-cyan-primary to-blue-500 hover:from-cyan-400 hover:to-blue-600 text-surface-base font-bold text-[10px] h-9 gap-1.5 transition-all shadow-lg disabled:opacity-50"
                        >
                            {isGeneratingCode ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Code2 className="w-3 h-3" />
                            )}
                            {isGeneratingCode ? 'Generating...' : 'Generate Smart Code'}
                            {!isGeneratingCode && <ArrowRight className="w-3 h-3" />}
                        </Button>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-[10px] text-red-400 bg-red-400/5 p-2 rounded border border-red-500/20"
                            >
                                {error}
                            </motion.p>
                        )}
                    </div>
                </div>

                <div className="px-4 py-3 border-b border-border-dim">
                    <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                        Component Library
                    </h2>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-1">
                        {components.map((comp) => {
                            const Icon = comp.icon;
                            return (
                                <motion.div
                                    key={comp.name}
                                    draggable
                                    onDragStart={(e: any) => handleDragStart(e, comp.type, comp.name)}
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
                                </motion.div>
                            );
                        })}
                    </div>
                </ScrollArea>

                <div className="p-3 border-t border-border-dim">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-surface-3/40 border-border-dim hover:bg-surface-4 text-xs gap-2"
                        onClick={clearCircuit}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Clear Canvas
                    </Button>
                </div>
            </motion.aside>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col relative" ref={reactFlowWrapper}>
                {aiGeneratedImage ? (
                    <div className="absolute inset-0 bg-surface-base z-50 flex flex-col items-center p-4 md:p-8 overflow-y-auto scrollbar-thin">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="max-w-4xl w-full bg-surface-1 rounded-3xl border border-purple-ai/20 overflow-hidden glow-purple my-auto"
                        >
                            <div className="px-6 py-4 border-b border-border-dim flex items-center justify-between bg-surface-2/50">
                                <div className="flex items-center gap-3">
                                    <CircuitoLogo className="w-8 h-8" />
                                    <div>
                                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">AI Blueprint Generated</h3>
                                        <p className="text-[10px] text-text-muted">Powered by NVIDIA Nemotron & Riverflow Synthesis</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setAiGeneratedImage(null)} className="text-xs border-border-dim">
                                        Back to Workbench
                                    </Button>
                                    <Button size="sm" className="bg-purple-ai hover:bg-purple-hover text-white text-xs gap-2">
                                        <Download className="w-3.5 h-3.5" />
                                        Save Image
                                    </Button>
                                </div>
                            </div>

                            <div className="p-6 relative group flex justify-center items-center min-h-[400px]">
                                {isImageLoading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-2/20 backdrop-blur-sm z-10">
                                        <Loader2 className="w-10 h-10 text-purple-ai animate-spin mb-4" />
                                        <p className="text-xs text-purple-ai font-medium animate-pulse">Rendering technical details...</p>
                                    </div>
                                )}
                                {error && !isImageLoading && (
                                    <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 bg-red-400/10 border border-red-500/20 p-8 rounded-2xl text-center backdrop-blur-md">
                                        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                                        <h4 className="text-lg font-bold text-text-primary mb-2">Architectural Generation Failed</h4>
                                        <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">{error}</p>
                                        <Button
                                            onClick={() => {
                                                setError(null);
                                                handleAiGenerate();
                                            }}
                                            className="bg-surface-3 hover:bg-surface-4 text-text-primary border border-border-dim"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 mr-2" />
                                            Re-attempt Synthesis
                                        </Button>
                                    </div>
                                )}
                                <img
                                    src={aiGeneratedImage}
                                    alt="AI Generated Circuit"
                                    onLoad={() => setIsImageLoading(false)}
                                    onError={() => {
                                        setIsImageLoading(false);
                                        setError("The image generator is currently under high load. Please try again in a moment.");
                                    }}
                                    className={`w-full h-auto rounded-xl border border-border-dim shadow-2xl transition-opacity duration-700 ${isImageLoading || error ? 'opacity-0' : 'opacity-100'}`}
                                />
                                {!isImageLoading && (
                                    <div className="absolute inset-x-6 bottom-12 bg-gradient-to-t from-surface-base/90 to-transparent p-6 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-text-secondary italic">"{prompt}"</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                ) : null}

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    fitView
                    className="circuito-flow"
                >
                    <Background color="#1a1a1a" gap={24} />
                    <Controls showInteractive={false} className="bg-surface-2 border-border-dim fill-text-primary" />

                    <Panel position="top-left" className="bg-surface-1/80 backdrop-blur-md rounded-lg border border-border-dim p-1 flex gap-1 m-2">
                        {[
                            { icon: MousePointer2, label: 'Select' },
                            { icon: Hand, label: 'Pan' },
                            { icon: ZoomIn, label: 'Zoom In' },
                            { icon: ZoomOut, label: 'Zoom Out' },
                            { icon: Maximize2, label: 'Fit View' },
                        ].map((tool) => {
                            const Icon = tool.icon;
                            return (
                                <button
                                    key={tool.label}
                                    className="p-2 text-text-muted hover:text-cyan-primary transition-all"
                                    title={tool.label}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                </button>
                            );
                        })}
                    </Panel>
                </ReactFlow>

                {/* Loading State Overlay */}
                {isAiGenerating && (
                    <div className="absolute inset-0 bg-surface-base/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                        <div className="relative">
                            <motion.div
                                className="w-24 h-24 rounded-full border-4 border-purple-ai/20 border-t-purple-ai"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <BrandBot className="w-10 h-10 text-purple-ai" />
                            </div>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 text-center"
                        >
                            <h3 className="text-lg font-bold text-text-primary">AI is Designing...</h3>
                            <p className="text-sm text-text-muted max-w-xs px-6 mt-2">
                                Analyzing pins, voltages, and best practices via NVIDIA & Riverflow specialized models.
                            </p>
                        </motion.div>
                    </div>
                )}

                {/* Empty State Overlay */}
                {nodes.length === 0 && !isAiGenerating && !aiGeneratedImage && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center opacity-40">
                            <div className="w-16 h-16 rounded-2xl bg-surface-2/50 border border-border-dim flex items-center justify-center mx-auto mb-4">
                                <CircuitBoard className="w-8 h-8 text-cyan-primary" />
                            </div>
                            <h3 className="text-sm font-semibold text-text-secondary mb-1">
                                Empty Workbench
                            </h3>
                            <p className="text-[10px] text-text-muted">
                                Drag components from the left or use the AI Designer.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Properties Panel */}
            <motion.aside
                initial={{ x: 280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="w-64 bg-surface-1 border-l border-border-dim flex flex-col shrink-0"
            >
                <div className="px-4 py-3 border-b border-border-dim flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">
                        Properties
                    </h2>
                    {selectedNode && (
                        <button
                            onClick={() => deleteNode(selectedNode.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                        {!selectedNode ? (
                            <div className="py-20 text-center">
                                <MousePointer2 className="w-8 h-8 text-border-dim mx-auto mb-3" />
                                <p className="text-[11px] text-text-muted px-4">
                                    Select a component on the canvas to view and edit its properties.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="text-[11px] text-text-muted block mb-1.5">
                                        Component Name
                                    </label>
                                    <p className="text-xs font-bold text-cyan-primary uppercase">{selectedNode.data.label}</p>
                                </div>
                                <div>
                                    <label className="text-[11px] text-text-muted block mb-1.5">
                                        ID
                                    </label>
                                    <p className="text-[10px] font-mono text-text-secondary bg-surface-base px-2 py-1 rounded border border-border-dim">{selectedNode.id}</p>
                                </div>
                                <div>
                                    <label className="text-[11px] text-text-muted block mb-1.5">
                                        Position
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="px-2.5 py-1.5 bg-surface-base border border-border-dim rounded text-[10px] text-text-secondary">
                                            X: {Math.round(selectedNode.position.x)}
                                        </div>
                                        <div className="px-2.5 py-1.5 bg-surface-base border border-border-dim rounded text-[10px] text-text-secondary">
                                            Y: {Math.round(selectedNode.position.y)}
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-border-dim" />

                                <div>
                                    <h3 className="text-[10px] font-bold text-text-muted uppercase mb-3">Live Connections</h3>
                                    {edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId).length === 0 ? (
                                        <p className="text-[10px] text-text-muted italic">No active connections.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId).map(edge => (
                                                <div key={edge.id} className="p-2 rounded bg-cyan-primary/5 border border-cyan-primary/10 flex items-center justify-between text-[10px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-primary animate-pulse" />
                                                        <span className="text-text-primary font-mono">{edge.sourceHandle || 'OUT'} → {edge.targetHandle || 'IN'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </ScrollArea>
            </motion.aside>
        </div>
    );
}

function Separator({ className }: { className?: string }) {
    return <div className={`h-[1px] w-full ${className}`} />;
}

export default function CircuitsPage() {
    return (
        <ReactFlowProvider>
            <div className="h-screen flex flex-col overflow-hidden bg-surface-base">
                <IDENavbar />
                <CircuitBuilder />
            </div>
        </ReactFlowProvider>
    );
}
