import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client using @supabase/ssr for better session handling
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Helper to get active session
export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// Helper to get user profile
export const getProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
};

// Admin Service Client (Safe for server-side usage only)
// Note: In server components/actions, use createClient from @/utils/supabase/server instead
export const createServiceClient = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
    }
    // We use standard createClient from supabase-js for admin tasks to avoid cookie complexity
    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, serviceRoleKey);
};
