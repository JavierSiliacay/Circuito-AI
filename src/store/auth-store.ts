import { create } from 'zustand';
import { supabase, getProfile } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    category: 'student' | 'enthusiast' | 'mechanic' | null;
    verification_status: 'pending' | 'verified' | 'rejected' | null;
    has_ai_access: boolean;
    has_diag_access: boolean;
    document_url: string | null;
}

interface AuthState {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    isAdmin: boolean;
    checkAuth: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    profile: null,
    isLoading: true,
    isAdmin: false,

    checkAuth: async () => {
        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            const { data: profile } = await getProfile(session.user.id);
            const adminEmails = [
                'siliacay.javier@gmail.com',
                'javiersiliacaysiliacay1234@gmail.com',
                'javiersiliacay12@gmail.com'
            ];

            set({
                user: session.user,
                profile: profile as Profile,
                isAdmin: adminEmails.includes(session.user.email || ''),
                isLoading: false
            });
        } else {
            set({ user: null, profile: null, isAdmin: false, isLoading: false });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, isAdmin: false });
    }
}));
