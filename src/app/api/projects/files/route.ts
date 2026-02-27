import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/projects/files?project_id=xxx — Get all files for a project
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('project_id');

        if (!projectId) {
            return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('project_files')
            .select('*')
            .eq('project_id', projectId)
            .order('name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ files: data });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST /api/projects/files — Create a file
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { project_id, name, path, content, language, type, parent_id } = body;

        if (!project_id || !name || !path) {
            return NextResponse.json(
                { error: 'project_id, name, and path are required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('project_files')
            .insert({
                project_id,
                name,
                path,
                content: content || null,
                language: language || null,
                type: type || 'file',
                parent_id: parent_id || null,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ file: data }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// PATCH /api/projects/files — Update file content
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, content, name } = body;

        if (!id) {
            return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (content !== undefined) updateData.content = content;
        if (name !== undefined) updateData.name = name;

        const { data, error } = await supabase
            .from('project_files')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ file: data });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// DELETE /api/projects/files — Delete a file
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('project_files')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
