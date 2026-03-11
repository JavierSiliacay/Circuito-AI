import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // 1. Verify User Approval Status (Security Layer)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', user.id)
        .single();

    if (profile?.verification_status !== 'verified') {
        return NextResponse.json({ error: 'Access denied. Account not approved.' }, { status: 403 });
    }

    // 2. Save the user's message
    const { data: userMsg, error: userMsgError } = await supabase
        .from('admin_user_messages')
        .insert({
            user_id: user.id,
            sender_id: user.id,
            content: content,
            is_ai_response: false
        })
        .select()
        .single();

    if (userMsgError) {
        return NextResponse.json({ error: userMsgError.message }, { status: 500 });
    }

    // 2. Check if admin is online
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: onlineAdmins, error: presenceError } = await supabase
        .from('admin_presence')
        .select('admin_id')
        .gt('last_seen', oneMinuteAgo);

    const isAdminOnline = onlineAdmins && onlineAdmins.length > 0;

    if (!isAdminOnline) {
        // 3. Admin is offline - Trigger AI Fallback

        // Notify user about AI takeover
        const aiNotice = "The admin is currently not online. An AI assistant will help you in the meantime.";
        await supabase.from('admin_user_messages').insert({
            user_id: user.id,
            sender_id: 'ai',
            content: aiNotice,
            is_ai_response: true
        });

        // Get AI Response (calling internal route or directly)
        try {
            // We can fetch from our own AI route
            // For simplicity and efficiency, let's call the OpenRouter directly here or use the same logic
            // But to keep it clean, let's just use the existing AI route logic or similar.

            const aiResponse = await getAIResponse(content, user.email);

            await supabase.from('admin_user_messages').insert({
                user_id: user.id,
                sender_id: 'ai',
                content: aiResponse,
                is_ai_response: true
            });

            return NextResponse.json({
                success: true,
                message: userMsg,
                ai_notified: true,
                ai_response: aiResponse
            });
        } catch (aiErr) {
            console.error('AI Fallback failed:', aiErr);
        }
    }

    return NextResponse.json({ success: true, message: userMsg, ai_notified: false });
}

async function getAIResponse(userMessage: string, userEmail: string | undefined): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return "I'm sorry, I'm having trouble connecting right now.";

    const systemPrompt = `You are a helpful AI assistant for Circuito AI. 
    The admin is currently offline. You are helping the user: ${userEmail || 'Guest'}.
    Answer basic questions, provide guidance on using the platform, or acknowledge their message.
    Keep it professional and concise.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Title': 'Circuito AI - Admin Fallback',
        },
        body: JSON.stringify({
            model: 'arcee-ai/trinity-large-preview:free',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 500,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        return "The admin is offline and I also encountered an error. Please try again later.";
    }

    const json = await response.json();
    return json.choices?.[0]?.message?.content || "I'm not sure how to respond to that.";
}
