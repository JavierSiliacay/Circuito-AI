'use client';

import IDENavbar from '@/components/ide/navbar';
import IDESidebar from '@/components/ide/sidebar';
import FileExplorer from '@/components/ide/file-explorer';
import EditorTabs from '@/components/ide/editor-tabs';
import CodeEditor from '@/components/ide/code-editor';
import BottomPanel from '@/components/ide/bottom-panel';
import AIPanel from '@/components/ide/ai-panel';
import StatusBar from '@/components/ide/status-bar';
import { motion } from 'framer-motion';

export default function IDEPage() {
    return (
        <div className="h-screen flex flex-col overflow-hidden bg-surface-base">
            {/* Top Navbar */}
            <IDENavbar />

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar icons */}
                <IDESidebar />

                {/* File Explorer */}
                <FileExplorer />

                {/* Editor area */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex-1 flex flex-col min-w-0"
                >
                    {/* Tabs */}
                    <EditorTabs />

                    {/* Code editor */}
                    <div className="flex-1 flex min-h-0">
                        <CodeEditor />
                    </div>

                    {/* Bottom panel */}
                    <BottomPanel />
                </motion.div>

                {/* AI Panel */}
                <AIPanel />
            </div>

            {/* Status Bar */}
            <StatusBar />
        </div>
    );
}
