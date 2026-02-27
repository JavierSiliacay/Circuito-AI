import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/flash-history — Get flash history
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        const { data, error } = await supabase
            .from('flash_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ history: data });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST /api/flash-history — Log a flash operation
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            project_id,
            board_name,
            board_fqbn,
            firmware_name,
            firmware_size,
            status,
            duration_ms,
            error_message,
        } = body;

        if (!board_name || !firmware_name || firmware_size === undefined || !status) {
            return NextResponse.json(
                { error: 'board_name, firmware_name, firmware_size, and status are required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('flash_history')
            .insert({
                project_id: project_id || null,
                board_name,
                board_fqbn: board_fqbn || null,
                firmware_name,
                firmware_size,
                status,
                duration_ms: duration_ms || null,
                error_message: error_message || null,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ record: data }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
