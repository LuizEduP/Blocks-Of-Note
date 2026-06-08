-- ============================================
-- Blocks of Note — Database Migration
-- Execute this SQL in Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== NOTES ====================

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes"
    ON notes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

-- ==================== TASKS ====================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','extra')),
    date DATE,
    time TIME,
    location TEXT DEFAULT '',
    description TEXT DEFAULT '',
    done BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tasks"
    ON tasks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);

-- ==================== WORKSPACES ====================

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT 'Sem título',
    doc_content TEXT DEFAULT '',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Anyone can read workspaces (to join by code)
CREATE POLICY "Anyone can read workspaces"
    ON workspaces FOR SELECT
    USING (true);

-- Authenticated users can create workspaces
CREATE POLICY "Authenticated users can create workspaces"
    ON workspaces FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only creator can update/delete
CREATE POLICY "Creator can update workspace"
    ON workspaces FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete workspace"
    ON workspaces FOR DELETE
    USING (auth.uid() = created_by);

-- ==================== WORKSPACE MESSAGES ====================

CREATE TABLE IF NOT EXISTS workspace_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
    user_name TEXT DEFAULT 'Anônimo',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read messages"
    ON workspace_messages FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert messages"
    ON workspace_messages FOR INSERT
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ws_messages_workspace ON workspace_messages(workspace_id, created_at ASC);

-- ==================== FUNCTION: auto update updated_at ====================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
