'use client';

import { useIDEStore } from '@/store/ide-store';
import dynamic from 'next/dynamic';
import { useCallback } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center bg-surface-2">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-cyan-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-text-muted">Loading editor...</span>
            </div>
        </div>
    ),
});

export default function CodeEditor() {
    const { editorContent, editorLanguage, setEditorContent, setCursorPosition } =
        useIDEStore();

    const handleChange = useCallback(
        (value: string | undefined) => {
            if (value !== undefined) setEditorContent(value);
        },
        [setEditorContent]
    );

    const handleMount = useCallback(
        (editor: any) => {
            editor.onDidChangeCursorPosition((e: any) => {
                setCursorPosition(e.position.lineNumber, e.position.column);
            });

            // Custom theme
            editor.getModel()?.updateOptions({ tabSize: 2 });
        },
        [setCursorPosition]
    );

    const beforeMount = useCallback((monaco: any) => {
        monaco.editor.defineTheme('circuito-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '546E7A', fontStyle: 'italic' },
                { token: 'keyword', foreground: '00D9FF' },
                { token: 'string', foreground: '22C55E' },
                { token: 'number', foreground: 'F59E0B' },
                { token: 'type', foreground: 'A855F7' },
                { token: 'function', foreground: '60A5FA' },
                { token: 'variable', foreground: 'F1F5F9' },
                { token: 'preprocessor', foreground: 'EF4444' },
                { token: 'operator', foreground: '94A3B8' },
            ],
            colors: {
                'editor.background': '#0F1629',
                'editor.foreground': '#F1F5F9',
                'editor.lineHighlightBackground': '#1A233240',
                'editor.selectionBackground': '#00D9FF20',
                'editorLineNumber.foreground': '#3B4A5E',
                'editorLineNumber.activeForeground': '#64748B',
                'editor.selectionHighlightBackground': '#00D9FF10',
                'editorCursor.foreground': '#00D9FF',
                'editorIndentGuide.background': '#1E293B40',
                'editorIndentGuide.activeBackground': '#334155',
                'editorGutter.background': '#0F1629',
                'editorWidget.background': '#141B2D',
                'editorWidget.border': '#1E293B',
                'minimap.background': '#0A0F1C',
            },
        });
    }, []);

    return (
        <div className="flex-1 min-w-0">
            <MonacoEditor
                height="100%"
                language={editorLanguage}
                value={editorContent}
                onChange={handleChange}
                onMount={handleMount}
                beforeMount={beforeMount}
                theme="circuito-dark"
                options={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    minimap: { enabled: true, scale: 1 },
                    scrollBeyondLastLine: false,
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    padding: { top: 8 },
                    lineNumbers: 'on',
                    glyphMargin: false,
                    folding: true,
                    bracketPairColorization: { enabled: true },
                    automaticLayout: true,
                    wordWrap: 'off',
                }}
            />
        </div>
    );
}
