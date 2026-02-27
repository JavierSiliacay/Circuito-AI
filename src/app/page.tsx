'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Code2,
  Cpu,
  CircuitBoard,
  Bot,
  ArrowRight,
  Sparkles,
  MonitorSmartphone,
  BarChart3,
  ChevronRight,
  Plus,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import IDENavbar from '@/components/ide/navbar';
import { useProjectStore, Project } from '@/store/project-store';

const features = [
  {
    icon: Code2,
    title: 'Cloud IDE',
    description: 'Full Monaco editor with Arduino/C++ intellisense, syntax highlighting, and auto-complete.',
    href: '/ide',
    color: 'from-cyan-primary to-cyan-500',
    glowColor: 'cyan',
  },
  {
    icon: Zap,
    title: 'Firmware Flash',
    description: 'Flash ESP32 & Arduino boards directly from the browser using Web Serial API.',
    href: '/flash',
    color: 'from-yellow-400 to-orange-500',
    glowColor: 'orange',
  },
  {
    icon: CircuitBoard,
    title: 'Circuit Builder',
    description: 'Visual drag-and-drop circuit designer with component library and wiring validation.',
    href: '/circuits',
    color: 'from-green-400 to-emerald-500',
    glowColor: 'green',
  },
  {
    icon: Bot,
    title: 'AI Assistant',
    description: 'Hardware-specialized AI that understands pins, voltages, datasheets, and code.',
    href: '/ide',
    color: 'from-purple-ai to-indigo-500',
    glowColor: 'purple',
  },
  {
    icon: MonitorSmartphone,
    title: 'Device Manager',
    description: 'Connect, monitor, and manage serial devices via Web Serial API.',
    href: '/devices',
    color: 'from-blue-400 to-blue-600',
    glowColor: 'blue',
  },
  {
    icon: BarChart3,
    title: 'IoT Dashboard',
    description: 'Real-time serial data viewer for connected devices.',
    href: '/dashboard',
    color: 'from-pink-400 to-rose-500',
    glowColor: 'pink',
  },
];

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function HomePage() {
  const { projects, isLoading, error, loadProjects, createProject, deleteProject } = useProjectStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectBoard, setNewProjectBoard] = useState('ESP32 Dev Module');

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await createProject(newProjectName.trim(), newProjectBoard);
    setNewProjectName('');
    setShowNewProject(false);
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this project? This cannot be undone.')) {
      deleteProject(id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-base">
      <IDENavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-primary/5 rounded-full blur-[100px]" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-ai/5 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,217,255,0.03)_0%,transparent_70%)]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-primary/10 border border-cyan-primary/20 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-cyan-primary" />
              <span className="text-xs font-medium text-cyan-primary">
                Powered by 3 specialized AI models
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
              <span className="text-text-primary">The </span>
              <span className="gradient-text-cyan">Hardware IDE</span>
              <br />
              <span className="text-text-primary">Built for </span>
              <span className="gradient-text-purple">Makers</span>
            </h1>

            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed">
              Write, flash, and debug Arduino & ESP32 firmware in the browser.
              With an AI assistant that actually understands hardware.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Link href="/ide">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-primary to-cyan-500 hover:from-cyan-hover hover:to-cyan-600 text-surface-base font-semibold glow-cyan px-8"
                >
                  <Code2 className="w-5 h-5 mr-2" />
                  Open IDE
                </Button>
              </Link>
              <Link href="/flash">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border-bright bg-surface-2/50 hover:bg-surface-3 text-text-primary px-8"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Flash Firmware
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Tech stack badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-3 mt-12 flex-wrap"
          >
            {['Next.js', 'Monaco Editor', 'Web Serial API', 'AI for Arduino', 'React Flow'].map(
              (tech) => (
                <span
                  key={tech}
                  className="px-3 py-1.5 text-xs text-text-muted bg-surface-2/50 border border-border-dim rounded-full"
                >
                  {tech}
                </span>
              )
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Everything you need for embedded development
          </h2>
          <p className="text-sm text-text-secondary">
            From code editor to firmware flash — all in one place.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
              >
                <Link href={feature.href}>
                  <div className="group relative p-5 rounded-xl bg-surface-2/40 border border-border-dim hover:border-border-bright transition-all duration-300 cursor-pointer hover:bg-surface-2/60">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-cyan-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Your Projects */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">
            Your Projects
          </h2>
          <Button
            size="sm"
            onClick={() => setShowNewProject(true)}
            className="bg-gradient-to-r from-cyan-primary to-cyan-500 hover:from-cyan-hover hover:to-cyan-600 text-surface-base text-xs gap-1.5 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Button>
        </div>

        {/* New project form */}
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-surface-2/40 border border-cyan-primary/20 mb-4"
          >
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-text-muted mb-1 block">Project Name</label>
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  placeholder="My_ESP32_Project"
                  className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border-dim text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-cyan-primary/30 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Board</label>
                <select
                  value={newProjectBoard}
                  onChange={(e) => setNewProjectBoard(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-base border border-border-dim text-sm text-text-primary outline-none focus:border-cyan-primary/30"
                >
                  <option value="ESP32 DevKit V1">ESP32 DevKit V1</option>
                  <option value="ESP32-S3">ESP32-S3</option>
                  <option value="Arduino Uno R3">Arduino Uno R3</option>
                  <option value="Arduino Mega 2560">Arduino Mega 2560</option>
                  <option value="ESP8266 NodeMCU">ESP8266 NodeMCU</option>
                </select>
              </div>
              <Button
                size="sm"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="bg-cyan-primary hover:bg-cyan-hover text-surface-base font-semibold disabled:opacity-40"
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNewProject(false)}
                className="text-text-muted hover:text-text-primary"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="flex flex-col items-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-2/50 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted mb-4">No projects yet. Create your first one!</p>
            <Button
              onClick={() => setShowNewProject(true)}
              variant="outline"
              className="border-border-dim bg-surface-2/50 hover:bg-surface-3 text-text-primary text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Project
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
              >
                <Link
                  href="/ide"
                >
                  <div className="group p-4 rounded-xl bg-surface-2/30 border border-border-dim hover:border-border-bright transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-text-muted" />
                        <span className="text-sm font-medium text-text-primary">
                          {project.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-error text-text-muted"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        {project.board}
                      </span>
                      <span>{getTimeAgo(project.updated_at)}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border-dim py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-primary to-cyan-500 flex items-center justify-center">
              <Zap className="w-3 h-3 text-surface-base" />
            </div>
            <span className="text-xs font-semibold text-text-secondary">
              Circuito AI
            </span>
          </div>
          <p className="text-[11px] text-text-muted">
            Built for makers, by makers. © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
