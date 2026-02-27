'use client';

import { Bot, Send, MoreVertical, Sparkles, Copy, Check, ClipboardCheck, Play, Loader2 } from 'lucide-react';
import { useIDEStore } from '@/store/ide-store';
import { getInstalledLibraries } from '@/lib/library-manager';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';

export default function AIPanel() {
    const { aiMessages, isAIPanelOpen, isAITyping, isAIApplying, aiApplyProgress, addAIMessage, setIsAITyping, applyCodeToEditor } =
        useIDEStore();
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [panelWidth, setPanelWidth] = useState(360);
    const isResizing = useRef(false);
    const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

    const handleCopyCode = (code: string, blockId: string) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopiedBlockId(blockId);
            setTimeout(() => setCopiedBlockId(null), 2000);
        });
    };

    // Extract code blocks from a message
    function extractCodeBlocks(content: string): { language: string; code: string }[] {
        const blocks: { language: string; code: string }[] = [];
        const parts = content.split('```');
        for (let i = 1; i < parts.length; i += 2) {
            const lines = parts[i].split('\n');
            const lang = lines[0]?.trim() || 'cpp';
            const code = lines.slice(1).join('\n').trim();
            if (code) blocks.push({ language: lang, code });
        }
        return blocks;
    }

    // Handle "Apply this code" — AI agent writes code into the editor
    const handleApplyCode = async (messageContent: string) => {
        const blocks = extractCodeBlocks(messageContent);
        if (blocks.length === 0) return;

        // Use the first (or largest) code block
        const mainBlock = blocks.reduce((a, b) => a.code.length > b.code.length ? a : b);

        // Add a status message
        addAIMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: '⚡ **Applying code to editor...** Writing your code now.',
            timestamp: new Date(),
        });

        // Apply with typing animation
        await applyCodeToEditor(mainBlock.code);

        // Confirmation message
        addAIMessage({
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '✅ **Code applied!** Your editor has been updated. You can now review the code, flash it to your board, or ask me to modify it.',
            timestamp: new Date(),
            suggestions: ['Explain this code', 'Add error handling', 'Flash to board'],
        });
    };

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [aiMessages, isAITyping]);

    // Drag-to-resize handler
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        const startX = e.clientX;
        const startWidth = panelWidth;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const delta = startX - e.clientX;
            const newWidth = Math.min(Math.max(startWidth + delta, 280), 600);
            setPanelWidth(newWidth);
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [panelWidth]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        addAIMessage({
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
            timestamp: new Date(),
        });
        setInput('');
        setIsAITyping(true);

        // Create a placeholder message that will be updated as tokens stream in
        const assistantMsgId = (Date.now() + 1).toString();

        try {
            const state = useIDEStore.getState();

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        ...state.aiMessages
                            .filter((m) => m.role === 'user' || m.role === 'assistant')
                            .slice(-10)
                            .map((m) => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userMessage },
                    ],
                    context: {
                        board: state.device.board,
                        code: state.editorContent,
                        deviceType: state.device.board,
                        libs: getInstalledLibraries().map(l => l.name),
                    },
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'AI service error');
            }

            // Add the assistant message immediately (empty, will fill via streaming)
            addAIMessage({
                id: assistantMsgId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
            });
            setIsAITyping(false); // Hide bouncing dots — we're streaming now

            // Read the SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let modelRole = 'hardware';

            if (reader) {
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;

                        try {
                            const data = JSON.parse(trimmed.slice(6));

                            if (data.type === 'meta') {
                                modelRole = data.modelRole || 'hardware';
                            } else if (data.type === 'token') {
                                fullContent += data.content;
                                // Update the message in-place for live typing effect
                                useIDEStore.setState((s) => ({
                                    aiMessages: s.aiMessages.map((m) =>
                                        m.id === assistantMsgId
                                            ? { ...m, content: fullContent }
                                            : m
                                    ),
                                }));
                            } else if (data.type === 'done') {
                                // Add suggestions now that the response is complete
                                useIDEStore.setState((s) => ({
                                    aiMessages: s.aiMessages.map((m) =>
                                        m.id === assistantMsgId
                                            ? {
                                                ...m,
                                                content: fullContent,
                                                suggestions: generateSuggestions(fullContent, modelRole),
                                            }
                                            : m
                                    ),
                                }));
                            }
                        } catch {
                            // Skip unparseable
                        }
                    }
                }
            }
        } catch (error) {
            console.error('AI request failed:', error);
            setIsAITyping(false);
            addAIMessage({
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: `⚠️ Sorry, I couldn't process that request. ${error instanceof Error ? error.message : 'Please try again.'}`,
                timestamp: new Date(),
            });
        }
    };

    // Generate contextual suggestions based on AI response
    function generateSuggestions(content: string, modelRole?: string): string[] {
        if (content.includes('```')) return ['Apply this code', 'Explain more'];
        if (content.includes('GPIO') || content.includes('pin')) return ['Show pinout', 'Generate wiring'];
        if (modelRole === 'rag') return ['More details', 'Show example'];
        return ['Tell me more', 'Show code example'];
    }

    if (!isAIPanelOpen) return null;

    return (
        <>
            {/* Resize handle */}
            <div
                onMouseDown={handleMouseDown}
                className="w-1 cursor-col-resize bg-transparent hover:bg-cyan-primary/30 active:bg-cyan-primary/50 transition-colors shrink-0 relative z-10"
                style={{ marginRight: '-1px' }}
            />

            <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: panelWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ width: panelWidth }}
                className="bg-surface-1 border-l border-border-dim flex flex-col shrink-0 overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-ai to-indigo-500 flex items-center justify-center glow-purple">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary">
                                Circuito AI
                            </h3>
                            <p className="text-[10px] text-green-success flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-success animate-pulse-dot" />
                                Hardware Assistant Online
                            </p>
                        </div>
                    </div>
                    <button className="text-text-muted hover:text-text-secondary transition-colors">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>

                {/* Messages — scrollable container */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 min-h-0"
                >
                    <div className="space-y-4">
                        {aiMessages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-ai to-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] ${msg.role === 'user'
                                        ? 'bg-cyan-primary/15 border border-cyan-primary/20 text-text-primary rounded-2xl rounded-br-sm px-3.5 py-2.5'
                                        : 'bg-surface-3/60 border border-border-dim text-text-secondary rounded-2xl rounded-bl-sm px-3.5 py-2.5'
                                        }`}
                                >
                                    <div className="text-xs leading-relaxed whitespace-pre-wrap">
                                        {msg.content.split('```').map((part, i) => {
                                            if (i % 2 === 1) {
                                                const lines = part.split('\n');
                                                const lang = lines[0] || '';
                                                const code = lines.slice(1).join('\n');
                                                return (
                                                    <div
                                                        key={i}
                                                        className="my-2 rounded-lg overflow-hidden bg-surface-base border border-border-dim"
                                                    >
                                                        <div className="px-3 py-1.5 bg-surface-3/40 border-b border-border-dim flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-text-muted font-mono">{lang}</span>
                                                                {/* Status during streaming */}
                                                                {msg.role === 'assistant' && !msg.suggestions && msg.content.endsWith('```') === false && (
                                                                    <div className="flex items-center gap-1.5 ml-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-primary animate-pulse" />
                                                                        <span className="text-[9px] text-cyan-primary/70 font-mono uppercase tracking-wider">Writing Code...</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyCode(code, `${msg.id}-${i}`);
                                                                }}
                                                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all hover:bg-white/5"
                                                            >
                                                                {copiedBlockId === `${msg.id}-${i}` ? (
                                                                    <>
                                                                        <Check className="w-3 h-3 text-green-success" />
                                                                        <span className="text-green-success">Copied!</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="w-3 h-3 text-text-muted" />
                                                                        <span className="text-text-muted">Copy</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <pre className="p-3 text-[11px] font-mono text-text-primary overflow-x-auto">
                                                            <code>{code}</code>
                                                        </pre>
                                                        {/* Apply to Editor button */}
                                                        <div className="px-3 py-2 bg-surface-3/20 border-t border-border-dim flex items-center justify-end">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!isAIApplying) handleApplyCode(msg.content);
                                                                }}
                                                                disabled={isAIApplying}
                                                                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold bg-gradient-to-r from-purple-ai/20 to-indigo-500/20 text-purple-ai border border-purple-ai/20 hover:from-purple-ai/30 hover:to-indigo-500/30 disabled:opacity-50 transition-all"
                                                            >
                                                                {isAIApplying ? (
                                                                    <>
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                        Applying...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Play className="w-3 h-3" />
                                                                        Apply to Editor
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            // Bold parsing
                                            return part.split('**').map((segment, j) => {
                                                if (j % 2 === 1) {
                                                    return (
                                                        <strong key={`${i}-${j}`} className="font-semibold text-text-primary">
                                                            {segment}
                                                        </strong>
                                                    );
                                                }
                                                // Inline code
                                                return segment.split('`').map((s, k) => {
                                                    if (k % 2 === 1) {
                                                        return (
                                                            <code
                                                                key={`${i}-${j}-${k}`}
                                                                className="px-1 py-0.5 rounded bg-surface-base text-cyan-primary font-mono text-[11px]"
                                                            >
                                                                {s}
                                                            </code>
                                                        );
                                                    }
                                                    return <span key={`${i}-${j}-${k}`}>{s}</span>;
                                                });
                                            });
                                        })}
                                    </div>

                                    {/* Suggestions */}
                                    {msg.suggestions && msg.suggestions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                                            {msg.suggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion}
                                                    onClick={() => {
                                                        if (suggestion === 'Apply this code') {
                                                            const lastCodeMsg = [...aiMessages].reverse().find(
                                                                (m) => m.role === 'assistant' && m.content.includes('```')
                                                            );
                                                            if (lastCodeMsg) handleApplyCode(lastCodeMsg.content);
                                                        } else {
                                                            setInput(suggestion);
                                                            setTimeout(() => {
                                                                const sendBtn = document.getElementById('ai-send-btn');
                                                                if (sendBtn) sendBtn.click();
                                                            }, 50);
                                                        }
                                                    }}
                                                    disabled={suggestion === 'Apply this code' && isAIApplying}
                                                    className={`px-2.5 py-1 text-[10px] font-medium rounded-full border transition-all ${suggestion === 'Apply this code'
                                                        ? 'bg-gradient-to-r from-purple-ai/10 to-indigo-500/10 text-purple-ai border-purple-ai/20 hover:from-purple-ai/20 hover:to-indigo-500/20 disabled:opacity-50'
                                                        : 'bg-cyan-primary/10 text-cyan-primary border-cyan-primary/20 hover:bg-cyan-primary/20'
                                                        }`}
                                                >
                                                    {suggestion === 'Apply this code' && isAIApplying ? (
                                                        <span className="flex items-center gap-1">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Applying...
                                                        </span>
                                                    ) : (
                                                        suggestion
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {/* Typing indicator */}
                        <AnimatePresence>
                            {isAITyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="flex gap-2.5"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-ai to-indigo-500 flex items-center justify-center shrink-0">
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="bg-surface-3/60 border border-border-dim rounded-2xl rounded-bl-sm px-4 py-3">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map((i) => (
                                                <div
                                                    key={i}
                                                    className="w-1.5 h-1.5 rounded-full bg-purple-ai animate-bounce"
                                                    style={{ animationDelay: `${i * 0.15}s` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* AI Applying indicator */}
                        <AnimatePresence>
                            {isAIApplying && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="flex gap-2.5"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-ai to-indigo-500 flex items-center justify-center shrink-0">
                                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                    </div>
                                    <div className="flex-1 bg-surface-3/60 border border-border-dim rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                                        <p className="text-[10px] text-purple-ai font-semibold mb-1.5">
                                            AI Agent Writing Code...
                                        </p>
                                        <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-purple-ai to-indigo-500 rounded-full"
                                                initial={{ width: '0%' }}
                                                animate={{ width: `${aiApplyProgress}%` }}
                                                transition={{ duration: 0.1 }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-text-muted mt-1">
                                            {aiApplyProgress}% complete
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border-dim shrink-0">
                    <div className="flex items-center gap-2 bg-surface-3/40 border border-border-dim rounded-xl px-3 py-2 focus-within:border-cyan-primary/30 transition-colors">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ask about code, hardware, or errors..."
                            className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
                        />
                        <Button
                            id="ai-send-btn"
                            size="sm"
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="h-7 w-7 p-0 rounded-lg bg-cyan-primary hover:bg-cyan-hover text-surface-base disabled:opacity-30"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </motion.div >
        </>
    );
}
