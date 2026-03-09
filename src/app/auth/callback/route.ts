import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && session?.user) {
            const user = session.user;

            // 1. Ensure profile exists - logic to handle "deleted auth but profile remains"
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();

            if (!existingProfile) {
                // Try to see if an orphan profile exists with this email (manual delete case)
                const { data: orphanProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', user.email)
                    .single();

                if (orphanProfile) {
                    // Update the orphan profile with the new Auth ID
                    await supabase
                        .from('profiles')
                        .update({ id: user.id })
                        .eq('id', orphanProfile.id);
                } else {
                    // Create a brand new profile
                    await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            email: user.email,
                            full_name: user.user_metadata.full_name || user.email?.split('@')[0],
                            avatar_url: user.user_metadata.avatar_url,
                            verification_status: null
                        });
                }
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
