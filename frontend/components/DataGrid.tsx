import { ReactNode, useState, useMemo, useEffect } from 'react';

interface DataGridProps<T> {
    data: T[];
    renderItem: (item: T) => ReactNode;
    emptyMessage?: string;
    pagination?: boolean;
    paginationPageSize?: number;
}

export default function DataGrid<T>({
    data,
    renderItem,
    emptyMessage = "No items found.",
    pagination = true,
    paginationPageSize = 12
}: DataGridProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);

    // Calculate pagination
    const totalPages = Math.ceil(data.length / paginationPageSize);

    // Reset to page 1 if data changes significantly or filtered results are less than current page view
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [data.length, totalPages, currentPage]);

    const paginatedData = useMemo(() => {
        if (!pagination) return data;
        const start = (currentPage - 1) * paginationPageSize;
        return data.slice(start, start + paginationPageSize);
    }, [data, currentPage, pagination, paginationPageSize]);

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-2xl border border-border shadow-sm text-center">
                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-text mb-1">No Items</h3>
                <p className="text-text-secondary">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                {paginatedData.map((item, index) => (
                    <div key={index} className="flex h-full">
                        {renderItem(item)}
                    </div>
                ))}
            </div>

            {pagination && totalPages > 1 && (
                <div className="mt-4 px-6 py-4 border border-border bg-surface rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <span className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em] order-2 sm:order-1">
                        Showing <span className="text-text">{(currentPage - 1) * paginationPageSize + 1}</span> to <span className="text-text">{Math.min(currentPage * paginationPageSize, data.length)}</span> of <span className="text-text">{data.length}</span> results
                    </span>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-2 rounded-xl border border-border bg-background hover:border-primary/50 text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            title="Previous Page"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                        </button>

                        <div className="flex items-center gap-1">
                            {(() => {
                                const pages = [];
                                const delta = 1; // Number of pages to show around current page
                                const left = currentPage - delta;
                                const right = currentPage + delta + 1;
                                const range = [];
                                const rangeWithDots = [];
                                let l;

                                for (let i = 1; i <= totalPages; i++) {
                                    if (i === 1 || i === totalPages || (i >= left && i < right)) {
                                        range.push(i);
                                    }
                                }

                                for (let i of range) {
                                    if (l) {
                                        if (i - l === 2) {
                                            rangeWithDots.push(l + 1);
                                        } else if (i - l !== 1) {
                                            rangeWithDots.push('...');
                                        }
                                    }
                                    rangeWithDots.push(i);
                                    l = i;
                                }

                                return rangeWithDots.map((page, idx) => (
                                    page === '...' ? (
                                        <span key={`dots-${idx}`} className="px-2 text-text-secondary/30 font-black tracking-widest text-[10px]">...</span>
                                    ) : (
                                        <button
                                            key={`page-${page}`}
                                            onClick={() => setCurrentPage(page as number)}
                                            className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all shadow-sm ${currentPage === page ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-10' : 'bg-background text-text-secondary border border-border hover:border-primary/50 hover:text-primary'}`}
                                        >
                                            {page}
                                        </button>
                                    )
                                ));
                            })()}
                        </div>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-2 rounded-xl border border-border bg-background hover:border-primary/50 text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            title="Next Page"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
