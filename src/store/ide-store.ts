import { create } from 'zustand';

export interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    children?: FileNode[];
    content?: string;
    language?: string;
    isOpen?: boolean;
}

export interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    suggestions?: string[];
    codeBlocks?: { language: string; code: string }[];
}

export interface DeviceInfo {
    board: string;
    port: string;
    status: 'connected' | 'disconnected' | 'flashing';
    chipType?: string;
    features?: string[];
}

interface IDEState {
    // File system
    files: FileNode[];
    activeFileId: string | null;
    openTabs: string[];

    // Editor
    editorContent: string;
    editorLanguage: string;
    cursorPosition: { line: number; column: number };

    // Panels
    sidebarTab: 'explorer' | 'search' | 'circuits' | 'team' | 'settings';
    bottomPanelTab: 'problems' | 'output' | 'serial' | 'terminal';
    isAIPanelOpen: boolean;
    isBottomPanelOpen: boolean;

    // Device
    device: DeviceInfo;
    baudRate: number;

    // AI
    aiMessages: AIMessage[];
    isAITyping: boolean;
    isAIApplying: boolean;
    aiApplyProgress: number;  // 0-100
    isCompiling: boolean;
    isUploading: boolean;
    outputContent: string[];

    // Desktop Bridge (Web File System Access API)
    isBridgeConnected: boolean;
    bridgeStatus: 'online' | 'offline' | 'error';
    localProjectPath: string;
    isBridgeSyncEnabled: boolean;
    localFileContent: string;
    fileHandle: any | null;

    // Actions
    setIsCompiling: (compiling: boolean) => void;
    setIsUploading: (uploading: boolean) => void;
    addOutput: (line: string) => void;
    clearOutputContent: () => void;
    setFiles: (files: FileNode[]) => void;
    setActiveFile: (id: string) => void;
    setEditorContent: (content: string) => void;
    setSidebarTab: (tab: IDEState['sidebarTab']) => void;
    setBottomPanelTab: (tab: IDEState['bottomPanelTab']) => void;
    toggleAIPanel: () => void;
    toggleBottomPanel: () => void;
    setCursorPosition: (line: number, column: number) => void;
    addAIMessage: (message: AIMessage) => void;
    setIsAITyping: (typing: boolean) => void;
    openTab: (fileId: string) => void;
    closeTab: (fileId: string) => void;
    setBaudRate: (rate: number) => void;
    setDevice: (device: Partial<DeviceInfo>) => void;
    setIsAIApplying: (applying: boolean) => void;
    setAIApplyProgress: (progress: number) => void;
    applyCodeToEditor: (code: string) => Promise<void>;

    // Desktop Bridge Actions
    setBridgeStatus: (status: 'online' | 'offline' | 'error') => void;
    setLocalProjectPath: (path: string) => void;
    setFileHandle: (handle: any) => void;
    toggleBridgeSync: () => void;
    checkBridgeConnection: () => Promise<boolean>;
    syncToLocalFile: (code: string, force?: boolean) => Promise<void>;
    updateLocalFileContent: () => Promise<string | null>;
}

// Default project template — this is displayed when no project is loaded
const defaultFiles: FileNode[] = [
    {
        id: 'root',
        name: 'Blink_ESP32',
        type: 'folder',
        isOpen: true,
        children: [
            {
                id: 'vscode',
                name: '.vscode',
                type: 'folder',
                children: [],
            },
            {
                id: 'include',
                name: 'include',
                type: 'folder',
                children: [],
            },
            {
                id: 'lib',
                name: 'lib',
                type: 'folder',
                children: [],
            },
            {
                id: 'src',
                name: 'src',
                type: 'folder',
                isOpen: true,
                children: [
                    {
                        id: 'main-cpp',
                        name: 'main.cpp',
                        type: 'file',
                        language: 'cpp',
                        content: `#include <Arduino.h>

// Define LED pin for ESP32 Built-in LED
const int ledPin = 2;

void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  Serial.println("System Initialized...");
}

void loop() {
  // Turn the LED on
  digitalWrite(ledPin, HIGH);
  Serial.println("LED Status: ON");
  delay(1000);

  // Turn the LED off
  digitalWrite(ledPin, LOW);
  Serial.println("LED Status: OFF");
  delay(1000);
}`,
                    },
                ],
            },
            {
                id: 'platformio-ini',
                name: 'platformio.ini',
                type: 'file',
                language: 'ini',
                content: `[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200`,
            },
            {
                id: 'readme',
                name: 'README.md',
                type: 'file',
                language: 'markdown',
                content: `# Blink ESP32\n\nSimple LED blink example for ESP32 DevKit V1.\n\n## Wiring\n- Built-in LED on GPIO 2\n\n## Usage\n1. Connect ESP32 via USB\n2. Click Flash to upload\n3. Open Serial Monitor at 115200 baud`,
            },
        ],
    },
];

// Welcome message from AI — no fake conversation
const defaultAIMessages: AIMessage[] = [
    {
        id: '1',
        role: 'assistant',
        content: 'Welcome to **Circuito AI**! I\'m your hardware assistant. Ask me anything about Arduino, ESP32, wiring, or code. I can help with:\n\n• Writing and debugging firmware\n• Pin mapping and wiring\n• Library recommendations\n• Datasheet lookups\n\nWhat would you like to work on?',
        timestamp: new Date(),
        suggestions: ['Help me get started', 'Explain this code'],
    },
];

export const useIDEStore = create<IDEState>((set, get) => ({
    files: defaultFiles,
    activeFileId: 'main-cpp',
    openTabs: ['main-cpp', 'platformio-ini'],
    editorContent: defaultFiles[0].children![3].children![0].content!,
    editorLanguage: 'cpp',
    cursorPosition: { line: 1, column: 1 },
    sidebarTab: 'explorer',
    bottomPanelTab: 'serial',
    isAIPanelOpen: true,
    isBottomPanelOpen: true,
    device: {
        board: 'Not Connected',
        port: '—',
        status: 'disconnected',
    },
    baudRate: 115200,
    aiMessages: defaultAIMessages,
    isAITyping: false,
    isAIApplying: false,
    aiApplyProgress: 0,
    isCompiling: false,
    isUploading: false,
    outputContent: [],

    // Bridge initial state
    isBridgeConnected: false,
    bridgeStatus: 'offline',
    localProjectPath: '',
    isBridgeSyncEnabled: false,
    localFileContent: '',
    fileHandle: null,

    setIsCompiling: (compiling) => set({ isCompiling: compiling }),
    setIsUploading: (uploading) => set({ isUploading: uploading }),
    addOutput: (line) => set((state) => ({ outputContent: [...state.outputContent, line] })),
    clearOutputContent: () => set({ outputContent: [] }),

    setFiles: (files) => set({ files }),

    setActiveFile: (id) =>
        set((state) => {
            const file = findFile(state.files, id);
            if (file && file.type === 'file') {
                return {
                    activeFileId: id,
                    editorContent: file.content || '',
                    editorLanguage: file.language || 'plaintext',
                    openTabs: state.openTabs.includes(id)
                        ? state.openTabs
                        : [...state.openTabs, id],
                };
            }
            return {};
        }),

    setEditorContent: (content) => set({ editorContent: content }),

    setSidebarTab: (tab) => set({ sidebarTab: tab }),

    setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),

    toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),

    toggleBottomPanel: () =>
        set((state) => ({ isBottomPanelOpen: !state.isBottomPanelOpen })),

    setCursorPosition: (line, column) =>
        set({ cursorPosition: { line, column } }),

    addAIMessage: (message) =>
        set((state) => ({ aiMessages: [...state.aiMessages, message] })),

    setIsAITyping: (typing) => set({ isAITyping: typing }),

    openTab: (fileId) =>
        set((state) => ({
            openTabs: state.openTabs.includes(fileId)
                ? state.openTabs
                : [...state.openTabs, fileId],
        })),

    closeTab: (fileId) =>
        set((state) => ({
            openTabs: state.openTabs.filter((id) => id !== fileId),
            activeFileId:
                state.activeFileId === fileId
                    ? state.openTabs[state.openTabs.indexOf(fileId) - 1] || state.openTabs[state.openTabs.indexOf(fileId) + 1] || null
                    : state.activeFileId,
        })),

    setBaudRate: (rate) => set({ baudRate: rate }),

    setDevice: (device) =>
        set((state) => ({
            device: { ...state.device, ...device },
        })),

    setIsAIApplying: (applying) => set({ isAIApplying: applying }),
    setAIApplyProgress: (progress) => set({ aiApplyProgress: progress }),

    setBridgeStatus: (status) => set({ bridgeStatus: status, isBridgeConnected: status === 'online' }),
    setLocalProjectPath: (path) => set({ localProjectPath: path }),
    setFileHandle: (handle) => set({ fileHandle: handle }),
    toggleBridgeSync: () => set((state) => ({ isBridgeSyncEnabled: !state.isBridgeSyncEnabled })),

    checkBridgeConnection: async () => {
        const state = get();
        // With Web API, connected means we have a handle
        if (state.fileHandle) {
            set({ bridgeStatus: 'online', isBridgeConnected: true });
            return true;
        } else {
            set({ bridgeStatus: 'offline', isBridgeConnected: false });
            return false;
        }
    },

    syncToLocalFile: async (code: string, force = false) => {
        const state = get();
        if (!state.isBridgeConnected || !state.fileHandle) return;
        if (!state.isBridgeSyncEnabled && !force) return;

        try {
            // Check permission to write, but do NOT request it (requires user activation)
            const options = { mode: 'readwrite' };
            if ((await state.fileHandle.queryPermission(options)) !== 'granted') {
                console.warn('[Store] Write permission not granted. Cannot sync.');
                return;
            }
            const writable = await state.fileHandle.createWritable();
            await writable.write(code);
            await writable.close();
        } catch (e: any) {
            console.error('[Store] Sync to local file failed:', e);
            if (e.name === 'InvalidStateError' || e.name === 'NotFoundError') {
                set({
                    bridgeStatus: 'offline',
                    isBridgeConnected: false,
                    fileHandle: null,
                    localProjectPath: ''
                });
                alert('Your linked file changed externally and browser security requires you to re-link your project file. Please click Select File in the UI.');
            }
        }
    },

    updateLocalFileContent: async () => {
        const state = get();
        if (!state.isBridgeConnected || !state.fileHandle) return null;

        try {
            // Check permission to read
            const options = { mode: 'read' };
            if ((await state.fileHandle.queryPermission(options)) !== 'granted') {
                console.warn('[Store] Read permission not granted, cannot read file.');
                return null;
            }

            // This is the line that throws InvalidStateError if the user modified the file externally
            const file = await state.fileHandle.getFile();
            const content = await file.text();
            set({ localFileContent: content });
            return content as string;
        } catch (e: any) {
            console.error('[Store] Read from local file failed:', e);

            // If the state is invalid, the OS/Browser invalidated our handle because the file 
            // changed externally in a way that breaks the reference (common on Windows).
            // We must disconnect and require the user to re-select the file.
            if (e.name === 'InvalidStateError' || e.name === 'NotFoundError') {
                set({
                    bridgeStatus: 'offline',
                    isBridgeConnected: false,
                    fileHandle: null,
                    localProjectPath: ''
                });
                alert('Your linked file changed externally and browser security requires you to re-select it. Please click Select File again in the UI.');
            }
        }
        return null;
    },

    applyCodeToEditor: async (code: string) => {
        set({ isAIApplying: true, aiApplyProgress: 0 });

        // Simulate an AI agent typing the code character by character
        const lines = code.split('\n');
        const totalChars = code.length;
        let written = 0;
        let currentContent = '';

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            // Write line in chunks for speed (3-8 chars at a time)
            let charIdx = 0;
            while (charIdx < line.length) {
                const chunkSize = Math.min(3 + Math.floor(Math.random() * 6), line.length - charIdx);
                currentContent += line.substring(charIdx, charIdx + chunkSize);
                charIdx += chunkSize;
                written += chunkSize;

                set({
                    editorContent: currentContent,
                    aiApplyProgress: Math.round((written / totalChars) * 100),
                });

                // Periodic sync to bridge if enabled
                if (written % 50 === 0) {
                    useIDEStore.getState().syncToLocalFile(currentContent);
                }

                // Variable typing speed: faster for whitespace, slower for code
                const delay = line.trim().length === 0 ? 5 : 8 + Math.random() * 12;
                await new Promise((r) => setTimeout(r, delay));
            }

            // Add newline (except for last line)
            if (lineIdx < lines.length - 1) {
                currentContent += '\n';
                written += 1;
                set({
                    editorContent: currentContent,
                    aiApplyProgress: Math.round((written / totalChars) * 100),
                });
                await new Promise((r) => setTimeout(r, 15));
            }
        }

        // Final state & final sync
        set({
            editorContent: code,
            isAIApplying: false,
            aiApplyProgress: 100,
        });

        useIDEStore.getState().syncToLocalFile(code);
    },
}));

function findFile(files: FileNode[], id: string): FileNode | null {
    for (const file of files) {
        if (file.id === id) return file;
        if (file.children) {
            const found = findFile(file.children, id);
            if (found) return found;
        }
    }
    return null;
}
