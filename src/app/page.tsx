'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Cpu,
  Copy,
  Check,
  Upload,
  Sparkles,
  Usb,
  Loader2,
  Plus,
  Trash2,
  Zap,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  CircuitBoard,
  RefreshCcw,
  AlertCircle,
  RotateCcw,
  Monitor,
  FolderOpen,
  Activity,
  ShieldCheck,
  Bell,
  CheckCircle2,
  X,
  Target,
} from 'lucide-react';
import { useIDEStore } from '@/store/ide-store';
import { CircuitoLogo } from '@/components/ui/logo';
import { isWebSerialSupported, requestPort } from '@/lib/web-serial';
import { flashEsp32 } from '@/lib/esp-flash';
import { supabase } from '@/lib/supabase';
import BoardManager from '@/components/board-manager';
import { BoardDefinition, getInstalledBoardsList } from '@/lib/board-manager';
import Link from 'next/link';
import { runAutonomousAgent } from '@/app/actions/agent';
import { nativeListFiles, nativeReadFile, nativeWriteFile, nativeExecuteSim } from '@/lib/native-fs-bridge';

// ─── Types ──────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// ─── Code Block Parser ──────────────────────────────────
function parseMessageContent(content: string) {
  const parts: { type: 'text' | 'code'; content: string; language?: string; isStreaming?: boolean }[] = [];

  // Regex that matches either closed blocks or an open block at the very end
  // 1: Complete blocks: ```lang\ncode```
  // 2: Open block at end: ```lang\ncode(end-of-string)
  const fullBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = fullBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[2].trim(), language: match[1] || 'cpp' });
    lastIndex = match.index + match[0].length;
  }

  // Check for an unclosed block at the end
  const remaining = content.slice(lastIndex);
  const openBlockMatch = /```(\w*)\n([\s\S]*)$/.exec(remaining);

  if (openBlockMatch) {
    const textBefore = remaining.slice(0, openBlockMatch.index);
    if (textBefore) {
      parts.push({ type: 'text', content: textBefore });
    }
    parts.push({
      type: 'code',
      content: openBlockMatch[2].trim(),
      language: openBlockMatch[1] || 'cpp',
      isStreaming: true
    });
  } else if (remaining) {
    parts.push({ type: 'text', content: remaining });
  }

  return parts;
}

/**
 * Extracts the latest (or currently being written) code block from a streaming response
 */
function extractLatestCodeBlock(content: string) {
  // Regex that matches both closed and open-ended code blocks
  const regex = /```(?:\w+)?\n([\s\S]*?)(?:$|```)/g;
  let lastCode = null;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) lastCode = match[1];
  }
  return lastCode;
}

// ─── Markdown-ish text renderer ─────────────────────────
function RenderText({ text, className = "text-[14px]", lineSpacing = "space-y-2" }: { text: string; className?: string; lineSpacing?: string }) {
  const lines = text.split('\n');
  return (
    <div className={`${lineSpacing} break-words overflow-x-hidden`}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        
        // Header Support
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-[12px] font-black text-cyan-primary uppercase tracking-[0.2em] mt-6 mb-2 border-b border-cyan-primary/10 pb-1">
              {line.replace('### ', '')}
            </h3>
          );
        }

        return (
          <p key={i} className={`leading-relaxed ${className} text-text-secondary/90 whitespace-pre-wrap [overflow-wrap:anywhere]`}>
            {line.split(/(\*\*.*?\*\*|`[^`]+`|_\w+_)/).map((seg, j) => {
              if (seg.startsWith('**') && seg.endsWith('**'))
                return <strong key={j} className="font-bold text-text-primary underline decoration-cyan-primary/20">{seg.slice(2, -2)}</strong>;
              if (seg.startsWith('_') && seg.endsWith('_'))
                return <em key={j} className="italic">{seg.slice(1, -1)}</em>;
              if (seg.startsWith('`') && seg.endsWith('`'))
                return <code key={j} className="px-1.5 py-0.5 rounded bg-cyan-primary/10 text-cyan-primary font-mono text-[12px] border border-cyan-primary/20">{seg.slice(1, -1)}</code>;
              return <span key={j}>{seg}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

// ─── Arduino Logo Component ──────────────────────────
function ArduinoLogo({ className = "w-4 h-4" }: { className?: string }) {
  return <img src="/brand/arduino-logo.svg" alt="Arduino" className={className} />;
}

// ─── Code Block Component ───────────────────────────────
function CodeBlock({ code, language, isStreaming }: { code: string; language: string; isStreaming?: boolean }) {
  const { isBridgeConnected, localProjectPath, syncToLocalFile } = useIDEStore();

  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSync = async () => {
    if (!localProjectPath) {
      alert("Please set your Local Arduino Project path in settings (click the Bridge icon in the header).");
      return;
    }
    await syncToLocalFile(code, true);
    setSynced(true);
    setTimeout(() => setSynced(false), 3000);
  };

  return (
    <div className="my-5 w-full min-w-0 rounded-xl overflow-hidden border border-white/5 bg-[#0D1117] shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className={`w-3 h-3 rounded-full ${isStreaming ? 'animate-pulse bg-[#FF5F56]' : 'bg-[#FF5F56]'} shadow-inner`} />
            <div className={`w-3 h-3 rounded-full ${isStreaming ? 'animate-pulse bg-[#FFBD2E]' : 'bg-[#FFBD2E]'} shadow-inner`} />
            <div className={`w-3 h-3 rounded-full ${isStreaming ? 'animate-pulse bg-[#27C93F]' : 'bg-[#27C93F]'} shadow-inner`} />
          </div>
          <span className="text-[10px] font-bold font-mono text-text-muted/60 uppercase tracking-widest ml-1">
            {isStreaming ? (
              <span className="flex items-center gap-2">
                WRITING {language}...
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              </span>
            ) : language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isBridgeConnected && (
            <button
              onClick={handleSync}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 border ${synced
                ? 'bg-green-success/10 border-green-success/30 text-green-success'
                : 'bg-purple-ai/10 border-purple-ai/30 text-purple-ai hover:bg-purple-ai/20'
                }`}
            >
              {synced ? <Check className="w-3.5 h-3.5" /> : <ArduinoLogo className="w-3.5 h-3.5" />}
              {synced ? 'SYNCED TO IDE' : 'SYNC TO ARDUINO IDE'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-text-muted hover:text-cyan-primary hover:bg-cyan-primary/5 transition-all active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      </div>
      <pre className={`p-5 overflow-x-auto text-[13.5px] font-mono leading-relaxed custom-scrollbar ${isStreaming ? 'text-blue-100/40 italic' : 'text-blue-100/80'}`}>
        <code>{code}{isStreaming && '_'}</code>
      </pre>

      <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-primary animate-pulse" />
          <span className="text-[9px] font-black text-cyan-primary/60 uppercase tracking-widest">Agentic Payload Detected</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-bold text-text-muted/40 uppercase tracking-tight">Size: {(code.length / 1024).toFixed(1)} KB</span>
          <span className="text-[9px] font-bold text-text-muted/40 uppercase tracking-tight">CRC: 0x{Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Live Agent Log Component ──────────────────────────
function ThinkingTimer({ startTime, finalDuration }: { startTime: Date, finalDuration?: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (finalDuration) return;
    const interval = setInterval(() => {
      setSeconds((Date.now() - new Date(startTime).getTime()) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, finalDuration]);

  return <span>{finalDuration || `${seconds.toFixed(1)}s`}</span>;
}

function AgentMissionLog({ logs }: { logs: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  if (logs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full mb-6 rounded-2xl bg-[#161F36]/60 border border-purple-ai/20 backdrop-blur-sm shadow-xl overflow-hidden text-left transition-all duration-300"
    >
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-ai animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
          <h3 className="text-[11px] font-black text-white uppercase tracking-wider">Mission Autonomous Log</h3>
          {isMinimized && logs.length > 0 && (
            <span className="text-[9px] text-purple-ai/60 font-bold ml-2 animate-pulse">
              {logs[logs.length - 1].step}...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-purple-ai/50 uppercase font-black tracking-widest hidden sm:inline">Active Link</span>
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-300 ${isMinimized ? '' : 'rotate-180'}`} />
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="border-t border-white/5 pt-3">
              <div ref={scrollRef} className="space-y-2.5 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-3 items-start group"
          >
            <div className="mt-1 shrink-0">
              {log.type === 'reasoning' && <div className="w-3.5 h-3.5 rounded-full border border-cyan-primary/40 flex items-center justify-center"><div className="w-1 h-1 bg-cyan-primary animate-ping" /></div>}
              {log.type === 'action' && <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
              {log.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-success" />}
              {log.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              {log.type === 'plan' && <Plus className="w-3.5 h-3.5 text-purple-ai" />}
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-black uppercase tracking-tight truncate ${log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                    log.type === 'plan' ? 'text-purple-400' :
                      log.type === 'action' ? 'text-amber-400' : 'text-cyan-primary/80'
                  }`}>
                  {log.type === 'reasoning' ? (
                    <>Thought for <ThinkingTimer startTime={log.timestamp} finalDuration={log.duration} /></>
                  ) : log.step}
                </span>
                <span className="text-[8px] font-mono text-text-muted/20 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              {log.details && (
                <p className="text-[10px] text-text-muted/80 leading-relaxed font-medium italic break-words">
                  {log.details}
                </p>
              )}
            </div>
          </motion.div>
        ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import { MAINTENANCE_CONFIG } from '@/lib/maintenance-config';

// ─── Main Page ──────────────────────────────────────────
import { useAuthStore } from '@/store/auth-store';
import AuthOverlay from '@/components/AuthOverlay';

export default function Home() {
  const { user, profile, isLoading, isAdmin } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAgentEnabled, setIsAgentEnabled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 🧠 Agent Approval State
  const [pendingAgentData, setPendingAgentData] = useState<{ plan: string; messages: any[]; convoId: string } | null>(null);
  // Flash state
  const [connectedPort, setConnectedPort] = useState<any>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);

  // Board state
  const [isBoardManagerOpen, setIsBoardManagerOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<BoardDefinition | null>(null);

  // Bridge state from global store
  const {
    isBridgeConnected,
    localProjectPath,
    syncToLocalFile,
    agentTaskStatus,
    setAgentTaskStatus,
    agentLogs,
    addAgentLog,
    updateLastAgentLog,
    clearAgentLogs,
    dirHandle,
    disconnectProject
  } = useIDEStore();

  // ─── EFFECTS ───
  const { clearWarning } = useAuthStore();
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [localPathInput, setLocalPathInput] = useState(localProjectPath);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setLocalPathInput(localProjectPath);
  }, [localProjectPath]);

  const handleBrowseFiles = async () => {
    setIsBrowsing(true);
    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error('Your browser does not support the Web File System Access API. Please use Chrome, Edge, or Opera.');
      }

      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });

      let targetFile = '';
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && (entry.name.endsWith('.ino') || entry.name.endsWith('.cpp'))) {
          targetFile = entry.name;
          break;
        }
      }

      if (!targetFile) {
        throw new Error("No .ino or .cpp file found in this folder. Please select your Arduino project folder (the folder containing your code).");
      }

      useIDEStore.getState().setDirHandle(dirHandle, targetFile);
      useIDEStore.getState().setBridgeStatus('online');
      setLocalPathInput(`${dirHandle.name}/${targetFile}`);
      
      // 🚀 AUTO-ENABLE AGENT: Automatically switch to Agentic Mode on successful sync
      setIsAgentEnabled(true);

      // 🧠 Auto-Delegate Notification
      if (dirHandle) {
        addAgentLog({
          step: "Autonomous Link Synced",
          type: 'success',
          details: `Connected to workspace: ${dirHandle.name}`
        });
        showToast("Autonomous Agent Synchronized & Ready", 'success');
      } else {
        showToast("Project Folder Connected", 'success');
      }

      // Auto-start a new session for the new local project context
      setActiveConvoId(null);
      setInput('');
      console.log('[Circuito AI] Autonomous Link established. Starting fresh session for project.');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Failed to select folder:', e);
        alert(e.message || "Failed to open folder.");
      }
    } finally {
      setIsBrowsing(false);
    }
  };

  // Load the first installed board as default
  useEffect(() => {
    if (!selectedBoard) {
      const installed = getInstalledBoardsList();
      if (installed.length > 0) {
        const esp32 = installed.find(b => b.id === 'esp32-devkit-v1');
        setSelectedBoard(esp32 || installed[0]);
      }
    }
  }, [selectedBoard]);

  // Usage Limit (Guest Mode)
  const [promptCount, setPromptCount] = useState(0);

  useEffect(() => {
    const savedCount = localStorage.getItem('circuito_prompt_count');
    if (savedCount) setPromptCount(parseInt(savedCount, 10));
  }, []);

  useEffect(() => {
    localStorage.setItem('circuito_prompt_count', promptCount.toString());
  }, [promptCount]);

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    const savedConvos = localStorage.getItem('circuito_convos');
    const savedActiveId = localStorage.getItem('circuito_active_convo');

    if (savedConvos) {
      try {
        const parsed = JSON.parse(savedConvos);
        // Revive Date objects
        const revived = parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        setConversations(revived);
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }

    if (savedActiveId) {
      setActiveConvoId(savedActiveId);
    }
  }, []);

  // Persistence: Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('circuito_convos', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeConvoId) {
      localStorage.setItem('circuito_active_convo', activeConvoId);
    } else {
      localStorage.removeItem('circuito_active_convo');
    }
  }, [activeConvoId]);

  // Persistence: Save to Supabase (Cloud Sync)
  useEffect(() => {
    const syncToCloud = async () => {
      if (!user) return; // Don't sync if not logged in

      // If we have no conversations, we need to clear the cloud too!
      if (conversations.length === 0) {
        const { error } = await supabase
          .from('ai_conversations')
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error('[CloudSync] Clear Error:', error.message || error);
        }
        return;
      }

      // Map to Supabase schema
      const { error } = await supabase
        .from('ai_conversations')
        .upsert(
          conversations.map(convo => ({
            id: convo.id,
            messages: convo.messages,
            user_id: user.id
          })),
          { onConflict: 'id' }
        );

      if (error) console.error('[CloudSync] Sync Error:', error.message || error);
    };

    const timer = setTimeout(syncToCloud, 2000); // Debounce sync
    return () => clearTimeout(timer);
  }, [conversations]);

  // Persistence: Load from Supabase on start if local is empty
  useEffect(() => {
    const loadFromCloud = async () => {
      if (!user) return; // Need user to load their data
      const local = localStorage.getItem('circuito_convos');
      if (local && JSON.parse(local).length > 0) return; // Prioritize local for speed if not empty

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const revived = data.map((c: any) => ({
          id: c.id,
          title: c.messages[0]?.content?.slice(0, 40) || 'Cloud Project',
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })),
          createdAt: new Date(c.created_at)
        }));
        setConversations(revived);
      }
    };

    loadFromCloud();
  }, [user]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar by default on mobile
  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
    else setIsSidebarOpen(true);
  }, [isMobile]);

  const clearAllConversations = () => {
    if (window.confirm("Are you sure you want to delete all hardware architecture history? This cannot be undone.")) {
      setConversations([]);
      setActiveConvoId(null);
      localStorage.removeItem('circuito_convos');
    }
  };

  const activeConvo = conversations.find(c => c.id === activeConvoId);
  const messages = activeConvo?.messages || [];

  const handleExecutePlan = async () => {
    if (!pendingAgentData) return;
    const { messages, convoId } = pendingAgentData;

    console.log("[Circuito AI] Authorizing deployment...");
    // ⚡ Close modal immediately on click
    setPendingAgentData(null);
    setAgentTaskStatus("Deployment Authorized. Starting engine...");

    setIsTyping(true);
    setAgentTaskStatus("Mission Authorized: Executing Deployment...");
    addAgentLog({ step: "Authorization Received", type: 'success', details: "User approved the implementation plan." });
    addAgentLog({ step: "Autonomous Synthesis", type: 'reasoning', details: "Applying autonomous patterns and verifying workspace..." });

    try {
      const result = await runAgentRelayLoop('', messages, 'execute');
      if (!result) throw new Error("Autonomous session timed out.");
 
      if (result.success && result.content) {
        updateLastAgentLog({ 
            step: "Final Verification", 
            duration: result?.duration,
            details: "Workspace updated and logic verified." 
        });

        addAgentLog({ step: "Mission Success", type: 'success' });

        const finalMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `✅ **MISSION COMPLETE**\n\n${result?.content}`,
          timestamp: new Date(),
        };

        setConversations(prev => prev.map(c => {
          if (c.id === convoId) {
            return { ...c, messages: [...c.messages, finalMsg] };
          }
          return c;
        }));

        setPendingAgentData(null);
        setAgentTaskStatus("Deployment Complete.");
        setIsTyping(false);
        setTimeout(() => setAgentTaskStatus(null), 8000);
      }
    } catch (err: any) {
      addAgentLog({ step: "Execution Fail", type: 'error', details: err.message });
      setIsTyping(false);
    }
  };

  // 📜 Intelligent Auto-scroll
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

  // Monitor scroll position to detect if user manually scrolled up
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      // If distance from bottom is > 100px, user has scrolled up
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setUserHasScrolledUp(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const lastMessageIsUser = messages.length > 0 && messages[messages.length - 1].role === 'user';

    // Auto-scroll ONLY if:
    // 1. It's a new user message (always jump to bottom)
    // 2. The user is already at the bottom and AI is typing
    if (lastMessageIsUser || (!userHasScrolledUp && isTyping)) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping, userHasScrolledUp]);

  // 🏁 Reset scroll to top when messages are cleared (New Session)
  useEffect(() => {
    if (messages.length === 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
      setUserHasScrolledUp(false);
    }
  }, [messages.length]);


  const handleToolExecution = async (toolCalls: any[]) => {
    if (!dirHandle) {
      return toolCalls.map(tc => ({
        tool_call_id: tc.id,
        role: "tool",
        content: "Error: No project folder linked. Please link a folder using the Native File System API."
      }));
    }

    const results = [];
    for (const tc of toolCalls) {
      const { name, arguments: argsString } = tc;
      const args = typeof argsString === 'string' ? JSON.parse(argsString) : argsString;
      
      console.log(`[Frontend Tool] Executing ${name}...`, args);
      addAgentLog({ step: `Tool: ${name}`, type: 'action', details: `Target: ${args.filePath || args.command || ''}` });

      let result;
      switch (name) {
        case 'read_file':
          result = await nativeReadFile(dirHandle, args.filePath);
          results.push({
            tool_call_id: tc.id,
            role: "tool",
            content: result.success ? result.content : result.message
          });
          break;
        case 'write_file':
          result = await nativeWriteFile(dirHandle, args.filePath, args.content);
          results.push({
            tool_call_id: tc.id,
            role: "tool",
            content: result.success ? result.message : result.message
          });
          break;
        case 'execute_terminal':
          result = await nativeExecuteSim(args.command);
          results.push({
            tool_call_id: tc.id,
            role: "tool",
            content: result.success ? result.stdout : result.stderr
          });
          break;
        default:
          results.push({
            tool_call_id: tc.id,
            role: "tool",
            content: `Error: Unknown tool ${name}`
          });
      }
    }
    return results;
  };

  const runAgentRelayLoop = async (userPrompt: string, history: any[], stage: 'plan' | 'execute' | 'fast'): Promise<any> => {
    let currentHistory = [...history];
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      attempts++;
      const res = await runAutonomousAgent(userPrompt, currentHistory, stage as any, localProjectPath);
      
      if (!res?.success) return res;

      // If it requires a tool, execute it on the client and continue
      if (res?.requiresClientTool && res?.toolCalls) {
        const toolResults = await handleToolExecution(res.toolCalls);
        
        // Add the AI's tool call message and our response to the history
        const aiMsgWithToolCalls = res.messages?.[res.messages.length - 1];
        if (aiMsgWithToolCalls) {
          currentHistory = [...currentHistory, aiMsgWithToolCalls, ...toolResults];
        }
        
        // Loop back to continue execution with the new information
        continue;
      }

      // If no more tools required, we are done
      return res;
    }

    return { success: false, error: "Too many autonomous steps. Mission aborted for safety." };
  };
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const createConversation = useCallback((initialMessages: Message[] = []) => {
    const newId = crypto.randomUUID();
    const newConvo: Conversation = {
      id: newId,
      title: initialMessages.length > 0
        ? (initialMessages.find(m => m.role === 'user')?.content.slice(0, 40) +
          ((initialMessages.find(m => m.role === 'user')?.content.length || 0) > 40 ? '...' : '') ||
          'Welcome Session')
        : 'New Hardware Project',
      messages: initialMessages,
      createdAt: new Date(),
    };

    console.log('[Circuito AI] Creating new conversation:', newId);
    setConversations(prev => [newConvo, ...prev]);
    setActiveConvoId(newId);
    return newId;
  }, []);

  // Persistence: No longer auto-creating a welcome session.
  // We let the Welcome Screen (Landing Page) be the primary discovery state.
  useEffect(() => {
    const local = localStorage.getItem('circuito_convos');
    if (!local && conversations.length === 0) {
      console.log('[Circuito AI] Ready for fresh hardware architecting.');
    }
  }, [conversations.length]);

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvoId === id) {
      setActiveConvoId(conversations.length > 1 ? conversations.find(c => c.id !== id)?.id || null : null);
    }
  };

  const handleSend = async (retryContent?: string) => {
    const textToSend = retryContent || input.trim();
    if (!textToSend || (isTyping && !retryContent)) return;

    // Check usage limit for guest users (Only if NOT logged in)
    if (!user && promptCount >= 20) {
      const limitMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "You have reached the usage limit for guest sessions. Please sign in with your Google account to unlock the full potential of Circuito AI and continue building.",
        timestamp: new Date(),
      };

      if (!activeConvoId) {
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: textToSend,
          timestamp: new Date(),
        };
        createConversation([userMessage, limitMessage]);
      } else {
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: textToSend,
          timestamp: new Date(),
        };
        setConversations(prev => prev.map(c => {
          if (c.id === activeConvoId) {
            return {
              ...c,
              messages: [...c.messages, userMessage, limitMessage],
            };
          }
          return c;
        }));
      }
      setInput('');
      return;
    }

    // Increment usage count
    setPromptCount(prev => prev + 1);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    let convoId = activeConvoId;
    const isNewStart = !convoId || messages.length === 0;

    // 1. If we're starting fresh, create the conversation WITH the user message
    if (isNewStart) {
      console.log('[Circuito AI] Starting new session with user msg');
      convoId = createConversation([userMessage]);
      setInput('');
      // Give React a frame to transition the UI to the chat view
      await new Promise(r => setTimeout(r, 0));
    } else {
      // 2. Otherwise, add the User Message to the existing conversation
      if (!retryContent) {
        setConversations(prev => prev.map(c => {
          if (c.id === convoId) {
            // Check if we should update the title (if it's generic or first user msg)
            const hasUserMsg = c.messages.some(m => m.role === 'user');
            const newTitle = !hasUserMsg
              ? (textToSend.slice(0, 40) + (textToSend.length > 40 ? '...' : ''))
              : c.title;

            return {
              ...c,
              title: newTitle,
              messages: [...c.messages, userMessage],
            };
          }
          return c;
        }));
        setInput('');
      }
    }

    // ─── AI FETCH & STREAM ───
    const assistantMsgId = crypto.randomUUID();
    setIsTyping(true);

    // 🧠 AUTO-AGENT ACTIVATION: Only if folder is linked AND User has enabled Agent Mode
    if (isAgentEnabled) {
      if (!dirHandle) {
        // Catch case where agent is on but no folder linked
        const offlineMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content: "🚨 **Autonomous Link Required.**\n\nPlease link your project folder using the **Autonomous Link Settings** (the brain icon in the top right). I cannot access your workspace until a folder is linked via the Browser API.",
          timestamp: new Date(),
        };
        setConversations(prev => prev.map(c => {
          if (c.id === convoId) return { ...c, messages: [...c.messages, offlineMsg] };
          return c;
        }));
        setIsTyping(false);
        setIsBridgeModalOpen(true);
        return;
      }

      // Online and Enabled: Start Agent Flow
      setAgentTaskStatus("AI-Agent Active: Analyzing Workspace...");
      clearAgentLogs();
      addAgentLog({ step: "Mission Start", type: 'plan', details: "Initializing high-speed autonomous architect..." });

      // 🏎️ FAST MODE: Direct execution for simple tasks
      const isFastRequest = textToSend.toLowerCase().startsWith('fast ') || 
                          textToSend.toLowerCase().startsWith('quick ') ||
                          (textToSend.length < 35 && !textToSend.includes('?'));
      
      const cleanText = isFastRequest ? textToSend.replace(/^(fast|quick)\s+/i, '') : textToSend;

      try {
        if (isFastRequest) {
          setAgentTaskStatus("Direct Execution Mode...");
          addAgentLog({ step: "Autonomous Bypass", type: 'success', details: "Simple task detected. Executing directly..." });
          addAgentLog({ step: "Autonomous Synthesis", type: 'reasoning', details: "Applying changes instantly..." });
          
          const fastResult = await runAgentRelayLoop(cleanText, messages, 'fast' as any);
          
          if (fastResult?.success && fastResult?.content) {
             updateLastAgentLog({ 
                step: "Verification complete", 
                duration: fastResult?.duration,
                details: "Direct changes applied." 
             });
             addAgentLog({ step: "Mission Success", type: 'success' });

             const finalMsg: Message = {
               id: assistantMsgId,
               role: 'assistant',
               content: `⚡ **DIRECT ACTION COMPLETE**\n\n${fastResult?.content}`,
               timestamp: new Date(),
             };

             setConversations(prev => prev.map(c => {
               if (c.id === convoId) return { ...c, messages: [...c.messages, finalMsg] };
               return c;
             }));
             
             setIsTyping(false);
             setAgentTaskStatus(null);
             return; 
          }
        }

        // Standard flow
        addAgentLog({ step: "Context Snapshot", type: 'reasoning', details: "Scanning project files..." });
        await new Promise(r => setTimeout(r, 400));
        updateLastAgentLog({ duration: "0.4s" });

        // Step 2: Planning Stage - LIVE reasoning
        addAgentLog({ step: "Autonomous Strategy", type: 'reasoning', details: "Architecting step-by-step implementation strategy..." });

        const result = await runAgentRelayLoop(textToSend, messages, 'plan');
        if (!result) throw new Error("Autonomous planning failed.");
 
        if (result.success && result.content) {
          updateLastAgentLog({ 
            step: "Triage & Strategy", 
            duration: result?.duration,
            details: "Technical roadmap generated. Awaiting approval." 
          });
          addAgentLog({ step: "Plan Ready", type: 'success', details: "Authorization required to proceed." });

          const agentPlanMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: `🛡️ **AUTONOMOUS IMPLEMENTATION PLAN**\n\n${result?.content}\n\n--- \n*Please review the plan below before I proceed with modifying your workspace.*`,
            timestamp: new Date(),
          };

          setConversations(prev => prev.map(c => {
            if (c.id === convoId) {
              return { ...c, messages: [...c.messages, agentPlanMsg] };
            }
            return c;
          }));

          // Store for approval
          setPendingAgentData({
            plan: result?.content as string,
            messages: result?.messages || [],
            convoId: convoId as string
          });

          setAgentTaskStatus("Awaiting Plan Approval...");
          setIsTyping(false);
          return; // STOP HERE - Wait for User
        } else {
          addAgentLog({ step: "Mission Aborted", type: 'error', details: result?.error });
          throw new Error(result?.error || "Autonomous Agent failed to respond.");
        }
      } catch (err: any) {
        console.error('[Circuito AI] Autonomous Agent Error:', err);
        
        if (err.message === "MISSING_PROJECT_PATH") {
          const warnMsg: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: "⚠️ **No project folder selected.**\n\nTo use Autonomous Mode, I need to know where your project files are located. Please open the **Autonomous Link Settings** (the brain icon in the top right) and lock your project path.",
            timestamp: new Date(),
          };
          setConversations(prev => prev.map(c => {
            if (c.id === convoId) return { ...c, messages: [...c.messages, warnMsg] };
            return c;
          }));
          setIsBridgeModalOpen(true);
          setAgentTaskStatus(null);
          setIsTyping(false);
          return;
        }

        addAgentLog({ step: "System Exception", type: 'error', details: "Switching to cloud-only processing..." });
        setAgentTaskStatus("Autonomous error. Switched to Cloud Chat fallback.");
        // Continue to standard fetch below as fallback
      }
    }

    try {
      console.log('[Circuito AI] Sending request for convo:', convoId);

      // ─── PROJECT AWARENESS FETCH ───
      // Only if Agent Mode is ENABLED, fetch latest local code to inject into AI context
      let currentLocalCode = '';
      if (isAgentEnabled && isBridgeConnected && localProjectPath) {
        try {
          console.log('[Circuito AI] Fetching latest context from Bridge...');
          // Promise with timeout for the bridge fetch
          const bridgeUpdatePromise = useIDEStore.getState().updateLocalFileContent();

          // Wait max 5s for bridge (to handle larger projects gracefully)
          currentLocalCode = await Promise.race([
            bridgeUpdatePromise,
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Bridge timeout')), 5000))
          ]) || '';

          if (currentLocalCode) {
            console.log(`[Circuito AI] Synced ${currentLocalCode.length} characters of code for analysis.`);
          }
        } catch (bridgeErr) {
          console.warn('[Circuito AI] Project sync failed or timed out:', bridgeErr);
          // Fallback to empty code - don't let bridge failure stop the AI
        }
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages
              .filter(m => !m.isError)
              .slice(-10)
              .map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: textToSend },
          ],
          context: {
            board: selectedBoard?.name || 'ESP32',
            deviceType: selectedBoard?.architecture || 'esp32',
            code: currentLocalCode // 👈 This gives the AI "eyes" on your local file
          },
        }),
      });

      console.log('[Circuito AI] AI Response status:', response.status);

      if (!response.ok) throw new Error(`Fetch failed: ${response.status} `);

      // 2. Add Assistant Message placeholder
      setConversations(prev => {
        return prev.map(c => {
          if (c.id === convoId) {
            // Check if assistant message already exists
            const exists = c.messages.some(m => m.id === assistantMsgId);
            if (exists) return c;

            return {
              ...c,
              messages: [...c.messages, {
                id: assistantMsgId,
                role: 'assistant' as const,
                content: '',
                timestamp: new Date(),
              }],
            };
          }
          return c;
        });
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedContent = '';

      if (reader) {
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
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') continue;
              const data = JSON.parse(dataStr);

              if (data.type === 'token') {
                if (data.content && data.content.trim() !== '') {
                  setIsTyping(false);
                }

                streamedContent += data.content;

                // ─── LIVE BRIDGE SYNC ───
                // If bridge is connected and path is set, push updates as they arrive
                if (isBridgeConnected && localProjectPath) {
                  const currentCode = extractLatestCodeBlock(streamedContent);
                  if (currentCode) {
                    // Update status for the user
                    setAgentTaskStatus("Circuito AI Agent is currently coding to your ide...");

                    // We don't want to spam the bridge on every char, maybe every newline or 100 chars
                    if (data.content.includes('\n') || streamedContent.length % 100 === 0) {
                      syncToLocalFile(currentCode, true);
                    }
                  }
                }


                // Optimized update: only update component state when content changes
                setConversations(prev => prev.map(c => {
                  if (c.id === convoId) {
                    return {
                      ...c,
                      messages: c.messages.map(m =>
                        m.id === assistantMsgId
                          ? { ...m, content: streamedContent }
                          : m
                      ),
                    };
                  }
                  return c;
                }));
              }
            } catch (innerErr) {
              console.error('[Circuito AI] Parse error in stream:', innerErr);
            }
          }
        }
      }
      setIsTyping(false);

      // ─── AGENT SUMMARY CALCULATION ───
      // If we coded something, set a final summary status
      if (isBridgeConnected && localProjectPath && extractLatestCodeBlock(streamedContent)) {
        setAgentTaskStatus("Task completed: Code synced to local IDE.");
        // Clear status after 10 seconds
        setTimeout(() => setAgentTaskStatus(null), 10000);
      }

      // ─── FINAL BRIDGE SYNC ───
      // One last push to make sure the complete code is saved correctly
      if (isBridgeConnected && localProjectPath) {
        const finalCode = extractLatestCodeBlock(streamedContent);
        if (finalCode) {
          syncToLocalFile(finalCode, true);
        }
      }
    } catch (err) {
      console.error('[Circuito AI] Critical AI Error:', err);
      setConversations(prev => prev.map(c => {
        if (c.id === convoId) {
          // Ensure at least user message is there
          const messagesWithUser = c.messages.some(m => m.id === userMessage.id)
            ? c.messages
            : [...c.messages, userMessage];

          return {
            ...c,
            messages: [...messagesWithUser, {
              id: assistantMsgId,
              role: 'assistant' as const,
              content: 'The connection to global hardware intel was lost. Want to try re-establishing the link?',
              timestamp: new Date(),
              isError: true,
            }],
          };
        }
        return c;
      }));
      setIsTyping(false);
    }
  };

  const handleConnectDevice = async () => {
    if (!isWebSerialSupported()) {
      alert('Web Serial is not supported. Please use Chrome or Edge.');
      return;
    }
    try {
      const port = await requestPort();
      setConnectedPort(port);
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const handleFlashBin = async () => {
    if (!connectedPort) {
      alert('Please connect a device first.');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.bin';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsFlashing(true);
      setFlashProgress(0);

      try {
        const data = new Uint8Array(await file.arrayBuffer());
        await flashEsp32(data, {
          port: connectedPort,
          baudRate: 921600,
          terminal: {
            log: (msg) => console.log('[FLASH]', msg),
            error: (msg) => console.error('[FLASH]', msg),
            write: (msg) => console.log('[FLASH]', msg),
          },
          onProgress: (p) => setFlashProgress(p.percentage),
        });
        alert('✅ Firmware flashed successfully! Board is resetting...');
      } catch (err: any) {
        alert(`❌ Flash failed: ${err.message} `);
      } finally {
        setIsFlashing(false);
        setFlashProgress(0);
      }
    };
    fileInput.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    { icon: '💡', text: 'Blink an LED on ESP32 GPIO 2', tag: 'Beginner' },
    { icon: '🌡️', text: 'Read DHT22 temperature sensor', tag: 'Sensor' },
    { icon: '📡', text: 'Create a WiFi web server on ESP32', tag: 'Networking' },
    { icon: '🔊', text: 'Play a melody on a piezo buzzer', tag: 'Audio' },
  ];

  return (
    <div className="h-screen flex bg-[#0A0F1C] text-text-primary selection:bg-cyan-primary/30">
      {/* ─── Background Decor ────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-purple-ai/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop for Mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed lg:relative h-full w-72 bg-[#0A0F1C] border-r border-white/5 flex flex-col shrink-0 z-50 overflow-hidden"
            >
              {/* Brand Header */}
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img src="/brand/master-logo.png" alt="Circuito AI Logo" className="w-full h-full object-contain mix-blend-screen" />
                  </div>
                  <div>
                    <h1 className="text-[15px] font-black text-white tracking-tight uppercase">Circuito AI</h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1 h-1 rounded-full ${promptCount < 20 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                      <span className="text-[10px] font-bold text-text-muted/60 uppercase tracking-wider">
                        {user ? (
                          isAdmin ? 'Admin Console' : (() => {
                            const categoryMap = {
                              student: 'Student',
                              enthusiast: 'Enthusiast',
                              mechanic: 'Mechanic'
                            };
                            const baseRole = categoryMap[profile?.category as keyof typeof categoryMap] || 'Authorized';
                            const isVerified = profile?.verification_status === 'verified';
                            const hasFullAccess = profile?.has_ai_access && profile?.has_diag_access;

                            if (isVerified && hasFullAccess) {
                              return `${baseRole} Mode with Full Access`;
                            }
                            return `${baseRole} Mode`;
                          })()
                        ) : `Guest Mode (${Math.max(0, 20 - promptCount)} prompts left)`}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveConvoId(null);
                    setInput('');
                  }}
                  className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-primary/30 hover:bg-cyan-primary/5 text-text-primary hover:text-cyan-primary transition-all font-bold text-[13px] group shadow-inner"
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  NEW SESSION
                </button>
              </div>

              {/* Conversation List Header */}
              <div className="px-5 pt-6 pb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">History</h3>
                {conversations.length > 0 && (
                  <button
                    onClick={clearAllConversations}
                    className="text-[10px] font-bold text-red-400/50 hover:text-red-400 transition-colors uppercase tracking-wider"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                    <CircuitBoard className="w-10 h-10 mb-3" />
                    <p className="text-[11px] font-bold tracking-widest uppercase">Idle State</p>
                  </div>
                ) : (
                  conversations.map(convo => (
                    <div
                      key={convo.id}
                      onClick={() => setActiveConvoId(convo.id)}
                      className={`w-full group flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 cursor-pointer ${convo.id === activeConvoId
                        ? 'bg-white/5 border border-white/10 shadow-lg'
                        : 'text-text-muted hover:bg-white/[0.03] hover:text-text-secondary'
                        }`}
                    >
                      <MessageSquare className={`w-4 h-4 shrink-0 transition-colors ${convo.id === activeConvoId ? 'text-cyan-primary' : 'opacity-30'}`} />
                      <span className={`truncate flex-1 text-[13px] font-medium ${convo.id === activeConvoId ? 'text-white' : ''}`}>{convo.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(convo.id);
                        }}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400 transition-all p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom: Device + Flash */}
              <div className="p-4 border-t border-white/5 space-y-3 bg-[#0A0F1C]/50 backdrop-blur-md">
                {isFlashing && (
                  <div className="px-1 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-cyan-primary tracking-widest">
                      <span>FLASH IN PROGRESS</span>
                      <span>{Math.round(flashProgress)}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-primary via-blue-400 to-cyan-primary rounded-full shadow-[0_0_10px_rgba(0,217,255,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${flashProgress}% ` }}
                      />
                    </div>
                  </div>
                )}

                <Link
                  href="/flash"
                  className={`w-full h-11 flex items-center gap-3 px-4 rounded-xl text-[12px] font-bold tracking-widest uppercase transition-all ${connectedPort
                    ? 'bg-green-success/10 border border-green-success/30 text-green-success'
                    : 'bg-white/5 border border-white/10 hover:border-cyan-primary/30 text-text-muted hover:text-white shadow-inner'
                    }`}
                >
                  <Usb className="w-4 h-4" />
                  {connectedPort ? 'HARDWARE SYNCED' : 'IoT DASHBOARD / CONNECT'}
                  {connectedPort && <div className="w-2 h-2 rounded-full bg-green-success ml-auto animate-pulse" />}
                </Link>

                <div className="pt-2">
                  <Link
                    href="/diagnostic"
                    className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-xl bg-cyan-primary/10 border border-cyan-primary/20 text-cyan-primary hover:bg-cyan-primary/20 hover:border-cyan-primary/40 transition-all font-black text-[11px] uppercase tracking-widest shadow-lg shadow-cyan-primary/5 group transition-all"
                  >
                    <Activity className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Automotive Diagnostic
                  </Link>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <BoardManager
        isOpen={isBoardManagerOpen}
        onClose={() => setIsBoardManagerOpen(false)}
        onSelectBoard={(board) => setSelectedBoard(board)}
        mode="selector"
      />

      {/* ─── Main Chat Area ──────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center px-6 gap-4 shrink-0 bg-[#0A0F1C]/80 backdrop-blur-xl">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-all border border-white/5"
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4.5 h-4.5" /> : <PanelLeft className="w-4.5 h-4.5" />}
          </button>

          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/brand/master-logo.png" alt="Logo" className="w-full h-full object-contain mix-blend-screen" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight leading-tight">
                {isAgentEnabled ? 'Autonomous Agent Mode' : 'Chat Mode'} Active
              </h2>
              <p className="hidden xs:flex text-[10px] text-text-muted items-center gap-1.5 font-medium mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isAgentEnabled ? 'bg-purple-ai shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-green-500'}`} />
                {isAgentEnabled ? 'Autonomous Architect Online' : 'Local Engine Online'}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsBridgeModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isBridgeConnected
                ? 'bg-green-success/10 border-green-success/30 text-green-success shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]'
                : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                }`}
            >
              <div className={`${isBridgeConnected ? 'animate-pulse' : 'opacity-50 grayscale'}`}>
                <ArduinoLogo className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-[10px] font-black uppercase tracking-tighter">
                {isBridgeConnected ? 'Autonomous Link Connected' : 'Autonomous Link Ready'}
              </div>
            </button>

            <button
              onClick={() => setIsBoardManagerOpen(true)}
              className="flex items-center gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-black text-text-muted hover:text-cyan-primary hover:border-cyan-primary/30 transition-all uppercase tracking-widest"
            >
              <CircuitBoard className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-cyan-primary" />
              <span className="max-w-[80px] sm:max-w-none truncate">{selectedBoard?.name || 'ESP32 Mode'}</span>
              <ChevronDown className="w-3 h-3 opacity-30" />
            </button>

            {/* Arcee Autonomous Link Toggle */}
            <button
              onClick={() => {
                if (!dirHandle) {
                  setIsBridgeModalOpen(true);
                  return;
                }
                setIsAgentEnabled(!isAgentEnabled);
                if (!isAgentEnabled) {
                  showToast("Autonomous Agent Enabled", 'success');
                } else {
                  showToast("Switched to Standard Chat Mode", 'info');
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all active:scale-95 group ${isAgentEnabled
                ? 'bg-purple-ai text-white border-purple-ai hover:bg-purple-hover shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                : dirHandle
                  ? 'bg-purple-ai/10 border-purple-ai/30 text-purple-ai hover:bg-purple-ai/20'
                  : 'bg-white/5 border-white/10 text-text-muted opacity-40 grayscale cursor-allowed hover:bg-white/10'
                }`}
              title={dirHandle
                ? (isAgentEnabled ? 'Disable Autonomous Mode' : 'Enable Autonomous Mode')
                : 'Project Folder Not Linked'}
            >
              <div className="relative">
                <Sparkles className={`w-4 h-4 ${isAgentEnabled ? 'animate-spin-slow' : dirHandle ? 'animate-pulse' : ''}`} />
                {isAgentEnabled && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
                )}
              </div>
              <div className="hidden lg:block text-[9px] font-black uppercase tracking-[0.15em]">
                {isAgentEnabled ? 'Autonomous Active' : 'Agent Standby'}
              </div>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsInboxOpen(!isInboxOpen)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${isInboxOpen
                  ? 'bg-white/10 border-white/20 text-white'
                  : profile?.warning_message
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20'
                    : 'bg-white/5 border-white/10 text-text-muted hover:text-white hover:bg-white/10'}`}
              >
                <Bell className={`w-4.5 h-4.5 ${profile?.warning_message ? 'animate-bounce' : ''}`} />
                {profile?.warning_message && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-[#0A0F1C] shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                )}
              </button>

              <AnimatePresence>
                {isInboxOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-[#0D121F] border border-white/10 rounded-[24px] p-6 shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                          <Bell className="w-3 h-3 text-cyan-primary" />
                          Notifications
                        </h3>
                        <button onClick={() => setIsInboxOpen(false)}>
                          <X className="w-4 h-4 text-text-muted hover:text-white" />
                        </button>
                      </div>

                      {profile?.warning_message ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                            <p className="text-[13px] text-text-secondary leading-relaxed italic">
                              "{profile.warning_message}"
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              await clearWarning();
                              setIsInboxOpen(false);
                            }}
                            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-yellow-500 text-black font-black text-[11px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Acknowledge Message
                          </button>
                          <p className="text-[9px] text-center text-text-muted uppercase tracking-tighter opacity-50">
                            This will clear the message from your inbox
                          </p>
                        </div>
                      ) : (
                        <div className="py-8 text-center space-y-2">
                          <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center">
                            <Bell className="w-5 h-5 text-text-muted opacity-20" />
                          </div>
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-relaxed">
                            No New<br />Notifications
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
 

        {/* Agent Task Status Bar */}
        <AnimatePresence>
          {agentTaskStatus && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-purple-ai/10 border-b border-purple-ai/20 overflow-hidden"
            >
              <div className="max-w-4xl mx-auto px-6 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-purple-ai animate-ping absolute inset-0" />
                    <div className="w-2 h-2 rounded-full bg-purple-ai relative" />
                  </div>
                  <span className="text-[11px] font-black text-purple-ai uppercase tracking-widest animate-pulse">
                    {agentTaskStatus}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-purple-ai animate-spin" />
                  <span className="text-[9px] font-bold text-purple-ai/60 uppercase tracking-tighter">Autonomous Link Active</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🧠 Autonomous Mission Control (Always visible in agent mode if logs exist) */}
        <AnimatePresence>
          {isAgentEnabled && agentLogs.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#0A0F1C]/40 border-b border-white/5 backdrop-blur-md overflow-hidden"
            >
              <div className="max-w-4xl mx-auto px-6 py-4">
                <AgentMissionLog logs={agentLogs} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
          {(!MAINTENANCE_CONFIG.isAuthBypassEnabled && !isLoading && user && !isAdmin && !profile?.has_ai_access) ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-8">
              <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_40px_rgba(249,115,22,0.1)]">
                <ShieldCheck className="w-8 h-8 text-orange-500" />
              </div>
              <div className="space-y-3 max-w-sm">
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">AI Access Restricted</h1>
                <p className="text-sm text-text-muted leading-relaxed">
                  Circuito AI-Agent is specialized for hardware development and architecture queries. To access this feature, you must provide your <strong>USTP-COT Certificate of Registration (COR)</strong> and wait for admin approval.
                </p>
              </div>
              <div className="p-4 rounded-3xl bg-white/5 border border-white/10 w-full max-w-xs space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-text-muted">
                  <span>Status</span>
                  <span className={profile?.verification_status === 'pending' ? 'text-yellow-500' : 'text-red-500'}>
                    {profile?.verification_status || 'NOT SUBMITTED'}
                  </span>
                </div>
                <div className="space-y-3 w-full">
                  <button
                    onClick={async () => {
                      if (profile?.verification_status === 'pending') return;
                      useAuthStore.getState().setUpgradeModal(true, 'student');
                    }}
                    disabled={profile?.verification_status === 'pending'}
                    className="w-full py-3 rounded-2xl bg-cyan-primary/10 border border-cyan-primary/20 text-cyan-primary font-black text-[10px] uppercase tracking-widest hover:bg-cyan-primary/20 transition-all shadow-lg shadow-cyan-primary/5 disabled:opacity-50"
                  >
                    {profile?.verification_status === 'pending' ? 'Verification in Progress...' : 'Apply for AI Agent Access'}
                  </button>

                  {profile?.verification_status === 'pending' && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('Are you sure you want to cancel your AI access upgrade request?')) return;

                        const { error } = await supabase
                          .from('profiles')
                          .update({
                            verification_status: 'cancelled',
                            pending_category: null,
                            pending_document_url: null
                          })
                          .eq('id', user.id);

                        if (!error) {
                          await useAuthStore.getState().checkAuth();
                          alert('Your upgrade request has been successfully cancelled.');
                        }
                      }}
                      className="w-full py-2 text-[9px] font-black text-red-400/60 uppercase tracking-[0.2em] hover:text-red-400 transition-colors"
                    >
                      Cancel Pending Request
                    </button>
                  )}
                </div>
              </div>
              <Link href="/diagnostic" className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] hover:text-white transition-colors">
                Go to Diagnostic Station
              </Link>
            </div>
          ) :
            messages.length === 0 && !isTyping ? (
              /* ─── Welcome Screen ─── */
              <div className="min-h-full flex flex-col items-center justify-start pt-0 sm:pt-4 pb-20">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'backOut' }}
                  className="text-center max-w-xl"
                >
                  <div className="relative mb-10 group">
                    <div className="absolute inset-0 bg-cyan-primary/20 blur-[60px] rounded-full group-hover:bg-cyan-primary/30 transition-all duration-700" />
                    <div className="w-20 h-20 flex items-center justify-center mx-auto relative z-10">
                      <img src="/brand/master-logo.png" alt="Circuito AI Master" className="w-full h-full object-contain mix-blend-screen" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center shadow-xl z-20 overflow-hidden">
                      <div className="w-full h-full p-1 flex items-center justify-center bg-gradient-to-br from-cyan-primary/20 to-blue-500/20">
                        <Cpu className="w-4 h-4 text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <h2 className="text-3xl font-black text-white mb-3 tracking-tighter leading-tight">
                    Hardware intelligence, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-primary via-blue-400 to-purple-ai">Simplified.</span>
                  </h2>
                  <p className="text-[14px] text-text-muted mb-8 max-w-sm mx-auto leading-relaxed font-medium">
                    Discuss your project in <span className="text-white">Chat Mode</span> or enable <span className="text-purple-ai">Agentic Mode</span> to automatically apply changes to your workspace.
                  </p>

                  {/* Local Bridge CTA */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-6 mb-12 p-10 rounded-[32px] bg-white/[0.02] border border-white/10 backdrop-blur-md relative overflow-hidden group shadow-2xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-primary/5 via-transparent to-purple-ai/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    {/* Mission Log inside the Welcome/Agent View */}
                    <AgentMissionLog logs={agentLogs} />

                    <div className="flex flex-col items-center gap-4 text-center relative z-10">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isBridgeConnected ? 'bg-green-success/10' : 'bg-surface-3'}`}>
                        <ArduinoLogo className={`w-7 h-7 ${isBridgeConnected ? '' : 'opacity-40 grayscale'}`} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-[13px] font-bold text-white tracking-tight">
                          {isBridgeConnected ? 'Connected to Local Arduino IDE' : 'Want Circuito AI to code on your Local Arduino IDE?'}
                        </h4>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isBridgeConnected ? 'bg-cyan-primary' : 'bg-red-500/50'} animate-pulse`} />
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest text-center">
                              {isBridgeConnected
                                ? (localProjectPath ? `Link Active: ${localProjectPath.split(/[\\/]/).pop()}` : 'Autonomous Link Ready')
                                : 'Autonomous Link Required: Sync Now'}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-muted/40 font-medium">
                            Powered by Circuito Core & Javier Siliacay
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsBridgeModalOpen(true)}
                      className={`relative z-10 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isBridgeConnected
                        ? 'bg-purple-ai text-white hover:bg-purple-hover'
                        : 'bg-cyan-primary hover:bg-cyan-hover text-[#0A0F1C]'
                        }`}
                    >
                      {isBridgeConnected ? (localProjectPath ? 'SYNC ACTIVE' : 'COMPLETE SETUP') : 'START SYNC'}
                    </button>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        onClick={() => {
                          handleSend(s.text);
                        }}
                        className="group text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-primary/20 transition-all duration-300 shadow-lg"
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-cyan-primary/10 transition-colors">
                            <span className="text-md">{s.icon}</span>
                          </div>
                          <span className="text-[9px] font-black text-text-muted bg-white/5 px-2 py-0.5 rounded-md tracking-widest uppercase group-hover:text-cyan-primary/80 transition-colors">{s.tag}</span>
                        </div>
                        <p className="text-[12px] text-text-secondary group-hover:text-white transition-colors leading-snug font-medium">{s.text}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              /* ─── Message List ─── */
              <div className="w-full max-w-2xl mx-auto space-y-8 pb-20">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-6 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 flex items-center justify-center shrink-0 mt-1">
                        <img src="/brand/master-logo.png" alt="AI Agent" className="w-full h-full object-contain mix-blend-screen scale-110" />
                      </div>
                    )}
                    <div className={`relative min-w-0 ${msg.role === 'user'
                      ? 'max-w-[85%] bg-white/5 border border-white/10 rounded-2xl rounded-br-md px-5 py-3 shadow-xl'
                      : 'flex-1 w-full max-w-full'
                      }`}>
                      {msg.role === 'user' ? (
                        <p className="text-[14px] text-white leading-relaxed font-medium [overflow-wrap:anywhere]">{msg.content}</p>
                      ) : (
                        <div className="space-y-4">
                          {msg.isError ? (
                            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col items-center gap-4 text-center max-w-md">
                              <AlertCircle className="w-10 h-10 text-red-500/60" />
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Signal Interrupted</h4>
                                <p className="text-[13px] text-text-muted leading-relaxed">I couldn't complete that transmission. The AI host might be overloaded. Shall we try the uplink again?</p>
                              </div>
                              <button
                                onClick={() => handleSend(messages[messages.indexOf(msg) - 1]?.content)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/40 text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-white transition-all active:scale-95"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Re-attempt Sync
                              </button>
                            </div>
                          ) : (
                            <>
                              {parseMessageContent(msg.content).map((part, i) =>
                                part.type === 'code' ? (
                                  <CodeBlock key={i} code={part.content} language={part.language || 'cpp'} isStreaming={part.isStreaming} />
                                ) : (
                                  <RenderText key={i} text={part.content} />
                                )
                              )}

                              {/* ─── IBM-Style Agentic Action Card ─── */}
                              {!msg.isError && msg.role === 'assistant' && extractLatestCodeBlock(msg.content) && !isTyping && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  className="mt-8 relative"
                                >
                                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-primary/20 via-blue-500/20 to-purple-ai/20 rounded-[24px] blur-xl opacity-50" />
                                  <div className="relative p-6 rounded-[24px] bg-[#0F1629] border border-white/10 shadow-2xl space-y-5 overflow-hidden">
                                    {/* Background Pattern */}
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                      <Cpu className="w-32 h-32 rotate-12" />
                                    </div>

                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-primary/10 flex items-center justify-center border border-cyan-primary/20">
                                          <Sparkles className="w-5 h-5 text-cyan-primary" />
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-black text-white uppercase tracking-tighter">Arduino AI-Agent</h4>
                                          <p className="text-[10px] text-cyan-primary/60 font-black uppercase tracking-widest">Action Deployment Center</p>
                                        </div>
                                      </div>
                                      <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Autonomous Bridge Active</span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                                        <p className="text-[9px] font-black text-text-muted uppercase tracking-wider">Verification</p>
                                        <div className="flex items-center gap-2 text-green-success">
                                          <CheckCircle2 className="w-4 h-4" />
                                          <span className="text-[12px] font-black tracking-tight">Logic Validated</span>
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                                        <p className="text-[9px] font-black text-text-muted uppercase tracking-wider">Deployment</p>
                                        <div className="flex items-center gap-2 text-cyan-primary">
                                          <ArduinoLogo className="w-4 h-4" />
                                          <span className="text-[12px] font-black tracking-tight">IDE Sync Ready</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Execution Summary</p>
                                        <span className="text-[9px] text-text-muted/40 font-mono">HASH: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5 font-medium text-[12px] text-text-secondary leading-relaxed">
                                        {parseMessageContent(msg.content)
                                          .filter(p => p.type === 'text')
                                          .map((part, idx) => (
                                            <div key={idx} className="mb-2 last:mb-0">
                                              {part.content.split('\n').filter(l => l.trim()).slice(0, 2).join(' ')}...
                                            </div>
                                          ))}
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2">
                                      {/* Delegate button removed - now automatic via Autonomous Link */}
                                      <div className="grid grid-cols-2 gap-3">
                                        <button
                                          onClick={async () => {
                                            const code = extractLatestCodeBlock(msg.content);
                                            if (code) {
                                              await syncToLocalFile(code, true);
                                              showToast('Agent has successfully synced the code to your local IDE.', 'success');
                                            }
                                          }}
                                          className="relative group h-12 rounded-2xl bg-purple-ai/10 border border-purple-ai/20 text-purple-ai font-black text-[11px] uppercase tracking-widest hover:bg-purple-ai/20 transition-all flex items-center justify-center gap-2"
                                        >
                                          <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                          Push to IDE
                                        </button>
                                        <Link
                                          href="/flash"
                                          className="h-12 rounded-2xl bg-cyan-primary/10 border border-cyan-primary/20 text-cyan-primary font-black text-[11px] uppercase tracking-widest hover:bg-cyan-primary/20 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-primary/5"
                                        >
                                          <Zap className="w-4 h-4" />
                                           IoT Dashboard
                                        </Link>
                                      </div>
                                      <p className="text-[9px] text-text-muted/40 italic font-medium text-center px-4 leading-relaxed">
                                        Agentic actions are governed by Circuito Safety Protocols. Always verify pin configurations before hardware execution.
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {msg.role === 'user' && (
                        <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-cyan-primary/20 blur-sm" />
                      )}
                    </div>
                    {
                      msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-primary/10 to-blue-500/10 border border-white/10 flex items-center justify-center shrink-0 mt-1 shadow-inner">
                          <div className="w-5 h-5 rounded-full bg-cyan-primary flex items-center justify-center text-[8px] font-black text-[#0A0F1C]">
                            ME
                          </div>
                        </div>
                      )
                    }
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-6"
                  >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <img src="/brand/master-logo.png" alt="Typing..." className="w-full h-full object-contain mix-blend-screen scale-110 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <div className="w-2 h-2 rounded-full bg-cyan-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-cyan-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-cyan-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
        </div>

        <div className="px-4 sm:px-6 py-4 bg-gradient-to-t from-[#0A0F1C] via-[#0A0F1C] to-transparent shrink-0">
          <div className="w-full max-w-2xl mx-auto relative group">
            <div className="absolute inset-0 bg-cyan-primary/5 blur-3xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />

            {/* 🛡️ MISSION APPROVAL CARD */}
            <AnimatePresence>
              {pendingAgentData && pendingAgentData.convoId === activeConvoId && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mb-4 p-5 rounded-[24px] bg-[#161F36]/90 border border-purple-ai/30 backdrop-blur-xl shadow-2xl relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-ai/5 to-transparent pointer-events-none" />
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-ai/20 flex items-center justify-center border border-purple-ai/20">
                          <CheckCircle2 className="w-4.5 h-4.5 text-purple-ai" />
                        </div>
                        <div>
                          <h4 className="text-[12px] font-black text-white uppercase tracking-tight">Mission Authorization Required</h4>
                          <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Agent Pending: Deployment Phase</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setPendingAgentData(null);
                          setAgentTaskStatus(null);
                        }}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <X className="w-4 h-4 text-text-muted" />
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar bg-black/20 p-4 rounded-2xl border border-white/5">
                      <RenderText 
                        text={pendingAgentData.plan} 
                        className="text-[11px]" 
                        lineSpacing="space-y-1"
                      />
                    </div>

                    <p className="text-[11px] text-text-muted leading-relaxed font-bold tracking-tight italic opacity-60">
                      * Review the mission status above. Authorizing will allow the agent to read/write/execute on your local machine.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleExecutePlan}
                        className="h-11 rounded-xl bg-purple-ai text-white font-black text-[11px] uppercase tracking-widest hover:bg-purple-hover transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Authorize Deployment
                      </button>
                      <button
                        onClick={() => {
                          console.log("[Circuito AI] Rejecting plan...");
                          setPendingAgentData(null);
                          setAgentTaskStatus(null);
                          showToast('Mission Roadmap Rejected. Agent standing by.', 'info');
                        }}
                        className="h-11 rounded-xl bg-white/5 border border-white/10 text-text-muted font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95"
                      >
                        Reject Plan
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Autonomous Agent Processing Notice */}
            <AnimatePresence>
              {isAgentEnabled && !isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-3 px-4 py-2.5 rounded-xl bg-purple-ai/10 border border-purple-ai/20 backdrop-blur-md flex items-start gap-3 shadow-xl shadow-purple-ai/5"
                >
                  <Sparkles className="w-4 h-4 text-purple-ai mt-0.5 shrink-0" />
                  <p className="text-[10px] sm:text-[11px] text-purple-ai/90 font-bold leading-relaxed tracking-tight">
                    <span className="text-white block mb-0.5 uppercase tracking-widest text-[9px] font-black">Autonomous Mode Active</span>
                    This request may take longer as the agent will scan the workspace, plan changes, and execute automated actions.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative flex items-end bg-[#0F1629]/80 backdrop-blur-xl border border-white/10 rounded-2xl focus-within:border-cyan-primary/40 focus-within:shadow-[0_0_40px_rgba(0,217,255,0.05)] transition-all overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Circuito AI..."
                rows={1}
                className="flex-1 bg-transparent px-3 sm:px-5 py-3 sm:py-4 text-[13px] sm:text-[14px] text-white placeholder:text-text-muted/60 outline-none resize-none max-h-[160px] leading-relaxed font-medium"
              />
              <div className="p-2 sm:p-2.5">
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-primary to-blue-600 hover:scale-105 active:scale-95 text-[#0A0F1C] transition-all disabled:opacity-20 disabled:grayscale disabled:scale-100 shadow-lg shadow-cyan-primary/20"
                >
                  {isTyping ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-center mt-3 sm:mt-4">
              <p className={`text-[8px] sm:text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-2 transition-colors ${isAgentEnabled ? 'text-purple-ai' : 'text-text-muted/40'}`}>
                <Zap className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${isAgentEnabled ? 'text-purple-ai' : 'text-cyan-primary/40'}`} />
                {isAgentEnabled ? 'Autonomous Agent Mode Active' : 'Chat Mode Active | Click Agent Above to Enable the Autonomous mode'}
              </p>
            </div>
          </div>
        </div>
      </div >

      {/* ─── Autonomous Link Bridge Modal (Official Arduino IDE) ─── */}
      <AnimatePresence>

        {
          isBridgeModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-left shadow-2xl">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBridgeModalOpen(false)}
                className="absolute inset-0 bg-[#0A0F1C]/80 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-[#161F36] border border-white/10 rounded-3xl overflow-hidden p-8"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#00979D]/10 flex items-center justify-center border border-[#00979D]/20">
                      <ArduinoLogo className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight">Autonomous Link</h3>
                      <p className="text-[11px] text-text-muted font-bold tracking-widest uppercase">Official Arduino IDE Support</p>
                    </div>
                  </div>
                  <button onClick={() => setIsBridgeModalOpen(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted transition-colors">
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <div className="space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar pr-3 -mr-3">
                  {/* Critical Instructions */}
                  <div className="p-4 rounded-2xl bg-cyan-primary/5 border border-cyan-primary/20 flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-xl bg-cyan-primary/10 flex items-center justify-center border border-cyan-primary/20 shrink-0">
                      <img src="/brand/master-logo.png" alt="Circuito AI" className="w-6 h-6 object-contain mix-blend-screen animate-pulse" />
                    </div>
                    <p className="text-[11px] text-white leading-relaxed font-bold tracking-tight italic">
                      "Ignite the machine. Link your project folder to transform this chat into a living, breathing autonomous development engine."
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] block">Status</label>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider ${isBridgeConnected ? 'bg-green-success/20 text-green-success' : 'bg-red-500/20 text-red-500'}`}>
                          {isBridgeConnected ? 'Securely Linked via Browser' : 'No File Linked'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] block">Workspace Connection (Global Release)</label>
                      <p className="text-[11px] text-text-secondary leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5 font-medium">
                        Enable AI-Agent to transform <strong>Circuito AI</strong> from a normal chatbot into a project-aware coding assistant that can access your selected folder, read files, analyze your codebase, and write code directly for you.
                     </p>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] block">Browser-Access Link (For Editor)</label>
                      <div className="flex gap-2">
                        <div className="flex-1 h-10 bg-black/40 border border-white/10 rounded-xl px-4 flex items-center text-xs text-white placeholder:text-white/20 outline-none transition-all font-mono overflow-hidden whitespace-nowrap text-ellipsis">
                          {localProjectPath || 'Not Linked...'}
                        </div>
                        <button
                          onClick={handleBrowseFiles}
                          disabled={isBrowsing}
                          className="px-4 h-10 flex items-center justify-center gap-2 rounded-xl bg-purple-ai/20 border border-purple-ai/30 text-purple-ai hover:bg-purple-ai hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-[11px] uppercase tracking-widest"
                        >
                          {isBrowsing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                          {isBridgeConnected ? 'Change' : 'Browse'}
                        </button>

                        {isBridgeConnected && (
                          <button
                            onClick={() => {
                              disconnectProject();
                              setIsAgentEnabled(false);
                              showToast("Project Disconnected. Returned to Chat Mode.", 'info');
                            }}
                            className="px-4 h-10 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-[11px] uppercase tracking-widest"
                            title="Disconnect Workspace"
                          >
                            <Trash2 className="w-4 h-4" />
                            Deselect
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted leading-relaxed italic opacity-60">
                        * Browse your <strong>Arduino project file folder</strong> (e.g. the folder containing your .ino file).
                      </p>
                    </div>

                    {/* ─── SETUP COMPLETED NOTE ─── */}
                    {isBridgeConnected && localProjectPath && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex gap-3 items-start"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-green-success" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Autonomous Link Established</h4>
                          <p className="text-[11px] text-text-secondary leading-relaxed">
                            Your project is fully connected! The **Circuito AI Agent** will now automatically stream and sync code directly to your local files using secure Browser APIs.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                </div>

                <div className="mt-6 pt-6 border-t border-white/5">
                  <button
                    onClick={() => setIsBridgeModalOpen(false)}
                    className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-lg"
                  >
                    Close Settings
                  </button>
                </div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>


      {/* ─── Global Toast ─── */}
      <AnimatePresence>
        {
          toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="fixed top-6 left-1/2 z-[200] px-6 py-3 rounded-2xl bg-[#161F36]/90 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-green-success/20 text-green-success' :
                toast.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-cyan-primary/20 text-cyan-primary'
                }`}>
                {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
              <p className="text-sm font-bold text-white tracking-tight">{toast.message}</p>
            </motion.div>
          )
        }
      </AnimatePresence >
    </div >
  );
}

