import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createClient();

        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('[Auth Callback] Exchange Error:', error);
            return NextResponse.redirect(`${origin}/auth/auth-code-error`);
        }

        if (session?.user) {
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
                    const { error: adoptError } = await supabase
                        .from('profiles')
                        .update({ id: user.id })
                        .eq('id', orphanProfile.id);

                    if (adoptError) console.error('[Auth Callback] Adoption failed:', adoptError);
                } else {
                    // Create a brand new profile
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            email: user.email,
                            full_name: user.user_metadata.full_name || user.email?.split('@')[0],
                            avatar_url: user.user_metadata.avatar_url,
                            verification_status: null,
                            has_ai_access: false,
                            has_diag_access: false
                        });

                    if (insertError) console.error('[Auth Callback] Creation failed:', insertError);
                }
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
