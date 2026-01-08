import { useState, useEffect } from 'react';

type ViewMode = 'list' | 'grid';

export const useViewMode = (key: string, defaultMode: ViewMode = 'list') => {
    const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const savedMode = localStorage.getItem(`viewMode_${key}`);
        if (savedMode === 'list' || savedMode === 'grid') {
            setViewMode(savedMode);
        }
        setIsLoaded(true);
    }, [key]);

    const handleSetViewMode = (mode: ViewMode) => {
        setViewMode(mode);
        localStorage.setItem(`viewMode_${key}`, mode);
    };

    return { viewMode, setViewMode: handleSetViewMode, isLoaded };
};
