import { create } from 'zustand';

export interface ProjectFile {
    id: string;
    name: string;
    path: string;
    content: string | null;
    language: string | null;
    type: 'file' | 'folder';
    parent_id: string | null;
}

export interface Project {
    id: string;
    name: string;
    board: string;
    board_fqbn: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
    is_public: boolean;
    tags: string[] | null;
    project_files: ProjectFile[];
}

interface ProjectStore {
    projects: Project[];
    isLoading: boolean;
    error: string | null;
    dbReady: boolean;

    // Actions
    loadProjects: () => Promise<void>;
    createProject: (name: string, board: string, boardFqbn?: string) => Promise<Project | null>;
    deleteProject: (id: string) => Promise<void>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
    updateFile: (fileId: string, content: string) => Promise<void>;
    checkDbStatus: () => Promise<boolean>;
}

// Default file templates for new projects
function getDefaultFiles(board: string): Omit<ProjectFile, 'id' | 'parent_id'>[] {
    const isESP = board.toLowerCase().includes('esp');
    const isArduino = board.toLowerCase().includes('arduino') || board.toLowerCase().includes('uno') || board.toLowerCase().includes('mega') || board.toLowerCase().includes('nano');

    if (isESP) {
        return [
            {
                name: 'main.cpp',
                path: 'src/main.cpp',
                type: 'file',
                language: 'cpp',
                content: `#include <Arduino.h>

// ${board} — Default Project
const int ledPin = 2; // Built-in LED

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  Serial.println("${board} Initialized!");
}

void loop() {
  digitalWrite(ledPin, HIGH);
  Serial.println("LED: ON");
  delay(1000);

  digitalWrite(ledPin, LOW);
  Serial.println("LED: OFF");
  delay(1000);
}`,
            },
            {
                name: 'platformio.ini',
                path: 'platformio.ini',
                type: 'file',
                language: 'ini',
                content: `[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200`,
            },
            {
                name: 'README.md',
                path: 'README.md',
                type: 'file',
                language: 'markdown',
                content: `# ${board} Project\n\nCreated with Circuito AI.\n\n## Getting Started\n1. Connect your ${board} via USB\n2. Click Flash to upload firmware\n3. Open Serial Monitor at 115200 baud`,
            },
        ];
    }

    if (isArduino) {
        return [
            {
                name: 'sketch.ino',
                path: 'sketch.ino',
                type: 'file',
                language: 'cpp',
                content: `// ${board} — Default Sketch

const int ledPin = 13; // Built-in LED

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
  Serial.println("${board} Ready!");
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(1000);
  
  digitalWrite(ledPin, LOW);
  delay(1000);
}`,
            },
            {
                name: 'README.md',
                path: 'README.md',
                type: 'file',
                language: 'markdown',
                content: `# ${board} Project\n\nCreated with Circuito AI.\n\n## Wiring\n- Built-in LED on pin 13\n\n## Usage\n1. Connect via USB\n2. Upload sketch\n3. Open Serial Monitor at 9600 baud`,
            },
        ];
    }

    // Generic default
    return [
        {
            name: 'main.cpp',
            path: 'src/main.cpp',
            type: 'file',
            language: 'cpp',
            content: `#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  Serial.println("Hello from ${board}!");\n}\n\nvoid loop() {\n  delay(1000);\n}`,
        },
        {
            name: 'README.md',
            path: 'README.md',
            type: 'file',
            language: 'markdown',
            content: `# ${board} Project\n\nCreated with Circuito AI.`,
        },
    ];
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
    projects: [],
    isLoading: false,
    error: null,
    dbReady: false,

    checkDbStatus: async () => {
        try {
            const res = await fetch('/api/db/setup');
            const data = await res.json();
            const ready = data.status === 'ready';
            set({ dbReady: ready });
            return ready;
        } catch {
            set({ dbReady: false });
            return false;
        }
    },

    loadProjects: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch('/api/projects');
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to load projects');
            }
            const data = await res.json();
            set({ projects: data.projects || [], isLoading: false });
        } catch (err) {
            console.error('Failed to load projects:', err);
            // Fall back to localStorage
            try {
                const stored = localStorage.getItem('circuito-projects');
                if (stored) {
                    set({ projects: JSON.parse(stored), isLoading: false });
                    return;
                }
            } catch {
                // ignore
            }
            set({
                error: err instanceof Error ? err.message : 'Failed to load projects',
                isLoading: false,
            });
        }
    },

    createProject: async (name, board, boardFqbn) => {
        set({ isLoading: true, error: null });
        try {
            const files = getDefaultFiles(board);

            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    board,
                    board_fqbn: boardFqbn || null,
                    files,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create project');
            }

            const data = await res.json();
            set((state) => ({
                projects: [data.project, ...state.projects],
                isLoading: false,
            }));

            return data.project;
        } catch (err) {
            console.error('Failed to create project:', err);
            set({
                error: err instanceof Error ? err.message : 'Failed to create project',
                isLoading: false,
            });
            return null;
        }
    },

    deleteProject: async (id) => {
        try {
            const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete project');
            }

            set((state) => ({
                projects: state.projects.filter((p) => p.id !== id),
            }));
        } catch (err) {
            console.error('Failed to delete project:', err);
            set({
                error: err instanceof Error ? err.message : 'Failed to delete project',
            });
        }
    },

    updateProject: async (id, updates) => {
        try {
            const res = await fetch('/api/projects', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update project');
            }

            const data = await res.json();
            set((state) => ({
                projects: state.projects.map((p) =>
                    p.id === id ? { ...p, ...data.project } : p
                ),
            }));
        } catch (err) {
            console.error('Failed to update project:', err);
        }
    },

    updateFile: async (fileId, content) => {
        try {
            const res = await fetch('/api/projects/files', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: fileId, content }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update file');
            }
        } catch (err) {
            console.error('Failed to save file:', err);
        }
    },
}));
