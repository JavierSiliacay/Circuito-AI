import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/db/setup — Run the database migration
export async function POST() {
    try {
        const supabase = createServiceClient();

        // Test connection by checking if the projects table exists
        const { data, error } = await supabase.from('projects').select('count').limit(0);

        if (error && error.code === '42P01') {
            // Table doesn't exist — return migration SQL for the user to run
            return NextResponse.json({
                status: 'needs_migration',
                message: 'Database tables do not exist yet. Please run the migration SQL in the Supabase SQL Editor.',
                sqlFile: '/supabase/schema.sql',
                instructions: [
                    '1. Go to https://tolaiehywapanbzyenig.supabase.co',
                    '2. Navigate to SQL Editor',
                    '3. Paste the contents of supabase/schema.sql',
                    '4. Click "Run"',
                    '5. Refresh this page',
                ],
            });
        }

        if (error) {
            return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            status: 'ready',
            message: 'Database is connected and tables exist.',
        });
    } catch (err) {
        return NextResponse.json(
            { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// GET /api/db/setup — Check database status
export async function GET() {
    try {
        const supabase = createServiceClient();
        const tables = ['projects', 'project_files', 'board_configs', 'flash_history', 'ai_conversations'];
        const results: Record<string, boolean> = {};

        for (const table of tables) {
            const { error } = await supabase.from(table).select('id').limit(0);
            results[table] = !error;
        }

        const allReady = Object.values(results).every(Boolean);

        return NextResponse.json({
            status: allReady ? 'ready' : 'needs_migration',
            tables: results,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        });
    } catch (err) {
        return NextResponse.json(
            { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
