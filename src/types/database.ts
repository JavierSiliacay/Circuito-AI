// Database types for Supabase
// These match the tables we'll create in the Supabase dashboard

export interface Database {
    public: {
        Tables: {
            projects: {
                Row: ProjectRow;
                Insert: ProjectInsert;
                Update: ProjectUpdate;
            };
            project_files: {
                Row: ProjectFileRow;
                Insert: ProjectFileInsert;
                Update: ProjectFileUpdate;
            };
            board_configs: {
                Row: BoardConfigRow;
                Insert: BoardConfigInsert;
                Update: BoardConfigUpdate;
            };
            flash_history: {
                Row: FlashHistoryRow;
                Insert: FlashHistoryInsert;
                Update: FlashHistoryUpdate;
            };
            ai_conversations: {
                Row: AIConversationRow;
                Insert: AIConversationInsert;
                Update: AIConversationUpdate;
            };
        };
    };
}

// ===================== PROJECTS =====================
export interface ProjectRow {
    id: string;
    name: string;
    board: string;
    board_fqbn: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
    user_id: string | null;
    is_public: boolean;
    tags: string[] | null;
}

export interface ProjectInsert {
    id?: string;
    name: string;
    board: string;
    board_fqbn?: string | null;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
    user_id?: string | null;
    is_public?: boolean;
    tags?: string[] | null;
}

export interface ProjectUpdate {
    id?: string;
    name?: string;
    board?: string;
    board_fqbn?: string | null;
    description?: string | null;
    updated_at?: string;
    is_public?: boolean;
    tags?: string[] | null;
}

// ===================== PROJECT FILES =====================
export interface ProjectFileRow {
    id: string;
    project_id: string;
    name: string;
    path: string;
    content: string | null;
    language: string | null;
    type: 'file' | 'folder';
    parent_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectFileInsert {
    id?: string;
    project_id: string;
    name: string;
    path: string;
    content?: string | null;
    language?: string | null;
    type: 'file' | 'folder';
    parent_id?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface ProjectFileUpdate {
    id?: string;
    name?: string;
    path?: string;
    content?: string | null;
    language?: string | null;
    updated_at?: string;
}

// ===================== BOARD CONFIGS =====================
export interface BoardConfigRow {
    id: string;
    board_id: string;
    board_name: string;
    board_fqbn: string;
    vendor: string;
    architecture: string;
    installed: boolean;
    user_id: string | null;
    created_at: string;
}

export interface BoardConfigInsert {
    id?: string;
    board_id: string;
    board_name: string;
    board_fqbn: string;
    vendor: string;
    architecture: string;
    installed?: boolean;
    user_id?: string | null;
    created_at?: string;
}

export interface BoardConfigUpdate {
    installed?: boolean;
}

// ===================== FLASH HISTORY =====================
export interface FlashHistoryRow {
    id: string;
    project_id: string | null;
    board_name: string;
    board_fqbn: string | null;
    firmware_name: string;
    firmware_size: number;
    status: 'success' | 'failed' | 'aborted';
    duration_ms: number | null;
    error_message: string | null;
    user_id: string | null;
    created_at: string;
}

export interface FlashHistoryInsert {
    id?: string;
    project_id?: string | null;
    board_name: string;
    board_fqbn?: string | null;
    firmware_name: string;
    firmware_size: number;
    status: 'success' | 'failed' | 'aborted';
    duration_ms?: number | null;
    error_message?: string | null;
    user_id?: string | null;
    created_at?: string;
}

export interface FlashHistoryUpdate {
    status?: 'success' | 'failed' | 'aborted';
    duration_ms?: number | null;
    error_message?: string | null;
}

// ===================== AI CONVERSATIONS =====================
export interface AIConversationRow {
    id: string;
    project_id: string | null;
    messages: AIMessageData[];
    model_used: string | null;
    user_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface AIConversationInsert {
    id?: string;
    project_id?: string | null;
    messages: AIMessageData[];
    model_used?: string | null;
    user_id?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface AIConversationUpdate {
    messages?: AIMessageData[];
    model_used?: string | null;
    updated_at?: string;
}

export interface AIMessageData {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    suggestions?: string[];
}
