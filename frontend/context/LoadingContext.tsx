import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface LoadingContextType {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const handleStart = () => setIsLoading(true);
        const handleComplete = () => setIsLoading(false);

        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleComplete);
        router.events.on('routeChangeError', handleComplete);

        return () => {
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleComplete);
            router.events.off('routeChangeError', handleComplete);
        };
    }, [router]);

    return (
        <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
            {children}
            {isLoading && <GlobalLoader />}
        </LoadingContext.Provider>
    );
};

const GlobalLoader = () => {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex flex-col items-center">
                <div className="relative">
                    {/* Premium Spinner */}
                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin shadow-2xl shadow-primary/20"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-surface border border-border shadow-inner animate-pulse flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="mt-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Processing</p>
                </div>
            </div>
        </div>
    );
};

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
