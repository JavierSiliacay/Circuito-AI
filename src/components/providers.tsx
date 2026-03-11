'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import dynamic from 'next/dynamic';

const AuthOverlay = dynamic(() => import('@/components/AuthOverlay'), { ssr: false });
const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), { ssr: false });

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={200}>
                <AuthOverlay />
                <OnboardingModal />
                {children}
            </TooltipProvider>
        </QueryClientProvider>
    );
}
