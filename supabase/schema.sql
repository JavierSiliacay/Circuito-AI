-- ============================================================
-- Circuito AI — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    board TEXT NOT NULL DEFAULT 'ESP32 Dev Module',
    board_fqbn TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[] DEFAULT '{}'
);

-- 2. Project files table (stores all code files for each project)
CREATE TABLE IF NOT EXISTS project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT,
    language TEXT,
    type TEXT NOT NULL DEFAULT 'file' CHECK (type IN ('file', 'folder')),
    parent_id UUID REFERENCES project_files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Board configurations (user's installed boards)
CREATE TABLE IF NOT EXISTS board_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id TEXT NOT NULL,
    board_name TEXT NOT NULL,
    board_fqbn TEXT NOT NULL,
    vendor TEXT NOT NULL,
    architecture TEXT NOT NULL,
    installed BOOLEAN NOT NULL DEFAULT true,
    user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(board_id, user_id)
);

-- 4. Flash history (log of all flash operations)
CREATE TABLE IF NOT EXISTS flash_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    board_name TEXT NOT NULL,
    board_fqbn TEXT,
    firmware_name TEXT NOT NULL,
    firmware_size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'aborted')),
    duration_ms INTEGER,
    error_message TEXT,
    user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. AI conversations (persistent AI chat history)
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    model_used TEXT,
    user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes for faster queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_parent_id ON project_files(parent_id);
CREATE INDEX IF NOT EXISTS idx_board_configs_user_id ON board_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_flash_history_user_id ON flash_history(user_id);
CREATE INDEX IF NOT EXISTS idx_flash_history_created_at ON flash_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project_id ON ai_conversations(project_id);

-- ============================================================
-- Row Level Security (RLS) — Enable public access for now
-- You can restrict this later when you add authentication
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (public access)
-- Replace these with proper auth policies when you add user authentication
DROP POLICY IF EXISTS "Allow all access to projects" ON projects;
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to project_files" ON project_files;
CREATE POLICY "Allow all access to project_files" ON project_files FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to board_configs" ON board_configs;
CREATE POLICY "Allow all access to board_configs" ON board_configs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to flash_history" ON flash_history;
CREATE POLICY "Allow all access to flash_history" ON flash_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to ai_conversations" ON ai_conversations;
CREATE POLICY "Allow all access to ai_conversations" ON ai_conversations FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_project_files_updated_at ON project_files;
CREATE TRIGGER update_project_files_updated_at
    BEFORE UPDATE ON project_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Admin-User Chat messages
CREATE TABLE IF NOT EXISTS admin_user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- The user this conversation belongs to
    sender_id TEXT NOT NULL, -- sender id
    content TEXT NOT NULL,
    is_ai_response BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_messages_user_id ON admin_user_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_messages_created_at ON admin_user_messages(created_at ASC);

ALTER TABLE admin_user_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to admin_user_messages" ON admin_user_messages;
CREATE POLICY "Allow all access to admin_user_messages" ON admin_user_messages FOR ALL USING (true) WITH CHECK (true);

-- 7. Admin Presence
CREATE TABLE IF NOT EXISTS admin_presence (
    admin_id TEXT PRIMARY KEY,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to admin_presence" ON admin_presence;
CREATE POLICY "Allow all access to admin_presence" ON admin_presence FOR ALL USING (true) WITH CHECK (true);
