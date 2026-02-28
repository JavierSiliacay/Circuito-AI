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
} from 'lucide-react';
import { CircuitoLogo } from '@/components/ui/logo';
import { isWebSerialSupported, requestPort } from '@/lib/web-serial';
import { flashEsp32 } from '@/lib/esp-flash';
import { supabase } from '@/lib/supabase';
import BoardManager from '@/components/board-manager';
import { BoardDefinition, getInstalledBoardsList } from '@/lib/board-manager';

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
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[2].trim(), language: match[1] || 'cpp' });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts;
}

// ─── Markdown-ish text renderer ─────────────────────────
function RenderText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        return (
          <p key={i} className="leading-relaxed text-[14.5px] text-text-secondary/90">
            {line.split(/(\*\*.*?\*\*|`[^`]+`)/).map((seg, j) => {
              if (seg.startsWith('**') && seg.endsWith('**'))
                return <strong key={j} className="font-bold text-text-primary underline decoration-cyan-primary/20">{seg.slice(2, -2)}</strong>;
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

// ─── Code Block Component ───────────────────────────────
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-5 rounded-xl overflow-hidden border border-white/5 bg-[#0D1117] shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-inner" />
          </div>
          <span className="text-[10px] font-bold font-mono text-text-muted/60 uppercase tracking-widest ml-1">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-text-muted hover:text-cyan-primary hover:bg-cyan-primary/5 transition-all active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-success" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'COPIED' : 'COPY CODE'}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto text-[13.5px] font-mono leading-relaxed text-blue-100/80 custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────
export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Flash state
  const [connectedPort, setConnectedPort] = useState<any>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);

  // Board state
  const [isBoardManagerOpen, setIsBoardManagerOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<BoardDefinition | null>(null);

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
    }
  }, [activeConvoId]);

  // Persistence: Save to Supabase (Cloud Sync)
  useEffect(() => {
    const syncToCloud = async () => {
      if (conversations.length === 0) return;

      // Map to Supabase schema
      const { error } = await supabase
        .from('ai_conversations')
        .upsert(
          conversations.map(convo => ({
            id: convo.id,
            messages: convo.messages,
            // You can add user_id here once auth is implemented
          })),
          { onConflict: 'id' }
        );

      if (error) console.error('Supabase Sync Error:', error);
    };

    const timer = setTimeout(syncToCloud, 2000); // Debounce sync
    return () => clearTimeout(timer);
  }, [conversations]);

  // Persistence: Load from Supabase on start if local is empty
  useEffect(() => {
    const loadFromCloud = async () => {
      const local = localStorage.getItem('circuito_convos');
      if (local) return; // Prioritize local for speed

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
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
  }, []);

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

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  // Auto-resize textarea
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

    // Check usage limit for guest users
    if (promptCount >= 20) {
      const limitMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "According to my creator Javier G. Siliacay he instructed me to limit my potential since he haven't configure the google sign-in",
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

    // 1. If we're starting fresh, create the conversation WITH the user message
    if (!convoId) {
      convoId = createConversation([userMessage]);
      setInput('');
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

    const assistantMsgId = crypto.randomUUID();

    setIsTyping(true);

    try {
      console.log('[Circuito AI] Sending request for convo:', convoId);

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
            deviceType: selectedBoard?.architecture || 'esp32'
          },
        }),
      });

      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

      // 2. Add Assistant Message placeholder
      setConversations(prev => {
        // We find the convo in the MOST RECENT state (which includes new ones from functional updates)
        const updatedConversations = prev.map(c => {
          if (c.id === convoId) {
            const hasUserMsg = c.messages.some(m => m.id === userMessage.id);
            const finalMessages = hasUserMsg ? [...c.messages] : [...c.messages, userMessage];

            return {
              ...c,
              messages: [...finalMessages, {
                id: assistantMsgId,
                role: 'assistant' as const,
                content: '',
                timestamp: new Date(),
              }],
            };
          }
          return c;
        });
        return updatedConversations;
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';

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

              if (data.type === 'token') {
                if (data.content && data.content.trim() !== '') {
                  setIsTyping(false);
                }

                streamedContent += data.content;

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
        alert(`❌ Flash failed: ${err.message}`);
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
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              />
            )}
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`fixed lg:relative h-full bg-[#0F1629]/98 lg:bg-[#0F1629]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col overflow-hidden shrink-0 z-50 ${isMobile ? 'w-[280px]' : 'w-[300px]'}`}
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
                        Guest Mode ({Math.max(0, 20 - promptCount)} prompts left)
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
                        animate={{ width: `${flashProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleConnectDevice}
                  className={`w-full h-11 flex items-center gap-3 px-4 rounded-xl text-[12px] font-bold tracking-widest uppercase transition-all ${connectedPort
                    ? 'bg-green-success/10 border border-green-success/30 text-green-success'
                    : 'bg-white/5 border border-white/10 hover:border-cyan-primary/30 text-text-muted hover:text-white shadow-inner'
                    }`}
                >
                  <Usb className="w-4 h-4" />
                  {connectedPort ? 'HARDWARE SYNCED' : 'CONNECT DEVICE'}
                  {connectedPort && <div className="w-2 h-2 rounded-full bg-green-success ml-auto animate-pulse" />}
                </button>

                <button
                  onClick={handleFlashBin}
                  disabled={!connectedPort || isFlashing}
                  className="w-full h-11 flex items-center gap-3 px-4 rounded-xl border border-white/10 text-[12px] font-bold tracking-widest uppercase text-text-muted hover:text-cyan-primary hover:bg-cyan-primary/5 hover:border-cyan-primary/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  {isFlashing ? (
                    <RefreshCcw className="w-4 h-4 animate-spin text-cyan-primary" />
                  ) : (
                    <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  )}
                  {isFlashing ? 'WRITING...' : 'FLASH FIRMWARE'}
                </button>
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
              <h2 className="text-sm font-bold text-white tracking-tight leading-tight">Current Session</h2>
              <p className="hidden xs:flex text-[10px] text-text-muted items-center gap-1.5 font-medium mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Local Engine Active
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsBoardManagerOpen(true)}
              className="flex items-center gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-black text-text-muted hover:text-cyan-primary hover:border-cyan-primary/30 transition-all uppercase tracking-widest"
            >
              <CircuitBoard className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-cyan-primary" />
              <span className="max-w-[80px] sm:max-w-none truncate">{selectedBoard?.name || 'ESP32 Mode'}</span>
              <ChevronDown className="w-3 h-3 opacity-30" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
          {messages.length === 0 && !isTyping ? (
            /* ─── Welcome Screen ─── */
            <div className="h-full flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'backOut' }}
                className="text-center max-w-xl"
              >
                <div className="relative mb-10 group">
                  <div className="absolute inset-0 bg-cyan-primary/20 blur-[60px] rounded-full group-hover:bg-cyan-primary/30 transition-all duration-700" />
                  <div className="w-24 h-24 flex items-center justify-center mx-auto relative z-10">
                    <img src="/brand/master-logo.png" alt="Circuito AI Master" className="w-full h-full object-contain mix-blend-screen scale-150" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-surface-3 border border-white/10 flex items-center justify-center shadow-xl z-20 overflow-hidden">
                    <div className="w-full h-full p-1.5 flex items-center justify-center bg-gradient-to-br from-cyan-primary/20 to-blue-500/20">
                      <Cpu className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </div>

                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter leading-tight">
                  Hardware intelligence, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-primary via-blue-400 to-purple-ai">Simplified.</span>
                </h2>
                <p className="text-[15px] text-text-muted mb-12 max-w-sm mx-auto leading-relaxed font-medium">
                  Describe your Arduino/ESP32 vision. I'll architect the code, assign the pins, and verify the logic.
                </p>

                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      onClick={() => {
                        handleSend(s.text);
                      }}
                      className="group text-left p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-primary/20 transition-all duration-300 shadow-lg"
                    >
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-cyan-primary/10 transition-colors">
                          <span className="text-lg">{s.icon}</span>
                        </div>
                        <span className="text-[10px] font-black text-text-muted bg-white/5 px-2.5 py-1 rounded-lg tracking-widest uppercase group-hover:text-cyan-primary/80 transition-colors">{s.tag}</span>
                      </div>
                      <p className="text-[13px] text-text-secondary group-hover:text-white transition-colors leading-snug font-medium">{s.text}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            /* ─── Message List ─── */
            <div className="max-w-4xl mx-auto space-y-10 pb-20">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-6 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 mt-1">
                      <img src="/brand/master-logo.png" alt="AI Agent" className="w-full h-full object-contain mix-blend-screen scale-125" />
                    </div>
                  )}
                  <div className={`relative ${msg.role === 'user'
                    ? 'max-w-[70%] bg-white/5 border border-white/10 rounded-3xl rounded-br-md px-6 py-4 shadow-xl'
                    : 'flex-1'
                    }`}>
                    {msg.role === 'user' ? (
                      <p className="text-[15px] text-white leading-relaxed font-medium">{msg.content}</p>
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
                          parseMessageContent(msg.content).map((part, i) =>
                            part.type === 'code' ? (
                              <CodeBlock key={i} code={part.content} language={part.language || 'cpp'} />
                            ) : (
                              <RenderText key={i} text={part.content} />
                            )
                          )
                        )}
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-cyan-primary/20 blur-sm" />
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-primary/10 to-blue-500/10 border border-white/10 flex items-center justify-center shrink-0 mt-1 shadow-inner">
                      <div className="w-6 h-6 rounded-full bg-cyan-primary flex items-center justify-center text-[10px] font-black text-[#0A0F1C]">
                        ME
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-6"
                >
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <img src="/brand/master-logo.png" alt="Typing..." className="w-full h-full object-contain mix-blend-screen scale-125 animate-pulse" />
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

        {/* ─── Input Area ──────────────────────── */}
        <div className="px-6 py-6 bg-gradient-to-t from-[#0A0F1C] via-[#0A0F1C] to-transparent">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-0 bg-cyan-primary/5 blur-3xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
            <div className="relative flex items-end bg-[#0F1629]/80 backdrop-blur-xl border border-white/10 rounded-3xl focus-within:border-cyan-primary/40 focus-within:shadow-[0_0_40px_rgba(0,217,255,0.05)] transition-all overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="State your hardware requirements..."
                rows={1}
                className="flex-1 bg-transparent px-6 py-5 text-[15px] text-white placeholder:text-text-muted/60 outline-none resize-none max-h-[200px] leading-relaxed font-medium"
              />
              <div className="p-3">
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-primary to-blue-600 hover:scale-105 active:scale-95 text-[#0A0F1C] transition-all disabled:opacity-20 disabled:grayscale disabled:scale-100 shadow-lg shadow-cyan-primary/20"
                >
                  {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-center mt-4">
              <p className="text-[10px] font-bold text-text-muted/40 tracking-[0.2em] uppercase flex items-center gap-2">
                <Zap className="w-3 h-3 text-cyan-primary/40" />
                Neural Link Active | End-to-End Encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
