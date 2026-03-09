import { create } from 'zustand';
import { supabase, getProfile } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    category: 'student' | 'enthusiast' | 'mechanic' | null;
    verification_status: 'pending' | 'verified' | 'rejected' | 'banned' | 'deleted' | null;
    has_ai_access: boolean;
    has_diag_access: boolean;
    document_url: string | null;
    warning_message: string | null;
}

interface AuthState {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    isAdmin: boolean;
    checkAuth: () => Promise<void>;
    signOut: () => Promise<void>;
    clearWarning: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    profile: null,
    isLoading: true,
    isAdmin: false,

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.user) {
                set({ user: null, profile: null, isAdmin: false, isLoading: false });
                return;
            }

            const { data: profile, error } = await getProfile(session.user.id);

            // Log only actual errors, ignore "no rows found" (PGRST116) as it's expected for new users
            if (error && error.code !== 'PGRST116') {
                console.warn('[AuthStore] Profile fetch notice:', error.message || error);
            }

            const adminEmails = [
                'siliacay.javier@gmail.com',
                'javiersiliacaysiliacay1234@gmail.com',
                'javiersiliacay12@gmail.com'
            ];

            set({
                user: session.user,
                profile: (profile as Profile) || null,
                isAdmin: adminEmails.map(e => e.toLowerCase()).includes(session.user.email?.toLowerCase() || ''),
                isLoading: false
            });
        } catch (err) {
            console.error('[AuthStore] Auth check failed:', err);
            set({ user: null, profile: null, isAdmin: false, isLoading: false });
        }
    },

    signOut: async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Sign out failed:', err);
        }
        set({ user: null, profile: null, isAdmin: false });
        // Force reload and redirect to home to clear any local state/cache
        window.location.href = '/';
    },

    clearWarning: async () => {
        const { user, profile } = get();
        if (!user || !profile) return;

        // If user was rejected, clear that status too to let them re-verify
        const updates: any = { warning_message: null };
        if (profile.verification_status === 'rejected') {
            updates.verification_status = null;
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (!error) {
            set(state => ({
                profile: state.profile ? {
                    ...state.profile,
                    warning_message: null,
                    verification_status: state.profile.verification_status === 'rejected' ? null : state.profile.verification_status
                } : null
            }));
        }
    }
}));
