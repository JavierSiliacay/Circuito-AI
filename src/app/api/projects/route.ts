import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/projects — List all projects
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                project_files (
                    id,
                    name,
                    path,
                    content,
                    language,
                    type,
                    parent_id
                )
            `)
            .order('updated_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ projects: data });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST /api/projects — Create a new project
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, board, board_fqbn, description, files } = body;

        if (!name || !board) {
            return NextResponse.json(
                { error: 'Name and board are required' },
                { status: 400 }
            );
        }

        // Create the project
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
                name,
                board,
                board_fqbn: board_fqbn || null,
                description: description || null,
            })
            .select()
            .single();

        if (projectError) {
            return NextResponse.json({ error: projectError.message }, { status: 500 });
        }

        // Create default files if provided
        if (files && Array.isArray(files) && files.length > 0) {
            const fileRecords = files.map((file: {
                name: string;
                path: string;
                content?: string;
                language?: string;
                type: 'file' | 'folder';
            }) => ({
                project_id: project.id,
                name: file.name,
                path: file.path,
                content: file.content || null,
                language: file.language || null,
                type: file.type,
            }));

            const { error: filesError } = await supabase
                .from('project_files')
                .insert(fileRecords);

            if (filesError) {
                console.error('Failed to create files:', filesError);
            }
        }

        // Fetch the project with files
        const { data: fullProject, error: fetchError } = await supabase
            .from('projects')
            .select(`
                *,
                project_files (
                    id,
                    name,
                    path,
                    content,
                    language,
                    type,
                    parent_id
                )
            `)
            .eq('id', project.id)
            .single();

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        return NextResponse.json({ project: fullProject }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// DELETE /api/projects — Delete a project
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('projects')
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

// PATCH /api/projects — Update a project
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, board, board_fqbn, description, is_public, tags } = body;

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (board !== undefined) updateData.board = board;
        if (board_fqbn !== undefined) updateData.board_fqbn = board_fqbn;
        if (description !== undefined) updateData.description = description;
        if (is_public !== undefined) updateData.is_public = is_public;
        if (tags !== undefined) updateData.tags = tags;

        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ project: data });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
