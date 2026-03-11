'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import OnboardingModal from '@/components/OnboardingModal';
import AuthOverlay from '@/components/AuthOverlay';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    const { checkAuth, isUpgradeModalOpen, setUpgradeModal } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={200}>
                <AuthOverlay />
                <OnboardingModal
                    isUpgrade={isUpgradeModalOpen}
                    onClose={() => setUpgradeModal(false)}
                />
                {children}
            </TooltipProvider>
        </QueryClientProvider>
    );
}
