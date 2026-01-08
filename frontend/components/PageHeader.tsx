import { ReactNode, useState } from 'react';
import { useLoading } from '../context/LoadingContext';

interface PageHeaderProps {
    title: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    action?: ReactNode;
    onExport?: (format: 'csv' | 'pdf') => void;
    viewMode?: 'list' | 'grid';
    onViewModeChange?: (mode: 'list' | 'grid') => void;
}

export default function PageHeader({
    title,
    searchValue,
    onSearchChange,
    searchPlaceholder = "Search...",
    action,
    onExport,
    viewMode,
    onViewModeChange
}: PageHeaderProps) {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const { setIsLoading, isLoading } = useLoading();

    const handleExport = async (format: 'csv' | 'pdf') => {
        if (!onExport) return;
        setIsLoading(true);
        setShowExportMenu(false);
        // Small timeout to allow UI to render spinner before heavy PDF work blocks main thread
        setTimeout(async () => {
            await (onExport(format) as any);
            setIsLoading(false);
        }, 100);
    };

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h2 className="text-3xl font-extrabold text-text tracking-tight">{title}</h2>
                <div className="h-1 w-12 bg-primary rounded-full mt-2"></div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto relative">
                {onSearchChange !== undefined && (
                    <div className="relative w-full sm:w-64 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-text-secondary group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all sm:text-sm"
                        />
                    </div>
                )}

                {onViewModeChange && (
                    <div className="flex bg-surface rounded-xl border border-border p-1 shadow-sm">
                        <button
                            onClick={() => onViewModeChange('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text hover:bg-background'}`}
                            title="List View"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <button
                            onClick={() => onViewModeChange('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text hover:bg-background'}`}
                            title="Grid View"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        </button>
                    </div>
                )}

                {onExport && (
                    <div className="relative w-full sm:w-auto">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={isLoading}
                            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-border bg-surface text-text font-bold rounded-xl hover:border-primary/50 disabled:opacity-70 disabled:cursor-not-allowed transition-all text-sm uppercase tracking-wider shadow-sm group"
                        >
                            <svg className="w-4 h-4 mr-2 text-text-secondary group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            <span className="ml-2">Export</span>
                            <svg className={`ml-2 w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-40 bg-surface border border-border rounded-xl shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-text hover:bg-primary/5 hover:text-primary transition-colors border-b border-border/50 flex items-center"
                                >
                                    <span className="w-2 h-2 rounded-full bg-success mr-3"></span>
                                    CSV Format
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-text hover:bg-primary/5 hover:text-primary transition-colors flex items-center"
                                >
                                    <span className="w-2 h-2 rounded-full bg-error mr-3"></span>
                                    PDF Document
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {action && (
                    <div className="w-full sm:w-auto">
                        {action}
                    </div>
                )}
            </div>
        </div>
    );
}
