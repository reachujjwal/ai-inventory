import React, { useState, useMemo } from 'react';

interface Column {
    headerName: string;
    field: string;
    flex?: number;
    width?: number;
    cellRenderer?: (params: { value: any; data: any }) => React.ReactNode;
    sortable?: boolean;
    cellStyle?: React.CSSProperties;
    cellClass?: string;
}

interface DataTableProps {
    rowData: any[];
    columnDefs: Column[];
    pagination?: boolean;
    paginationPageSize?: number;
    searchText?: string;
    renderRowDetails?: (row: any) => React.ReactNode;
}

export default function DataTable({
    rowData,
    columnDefs,
    pagination = true,
    paginationPageSize = 10,
    searchText = '',
    renderRowDetails
}: DataTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    // 1. Filtering
    const filteredData = useMemo(() => {
        if (!searchText) return rowData;
        const lowerSearch = searchText.toLowerCase();
        return rowData.filter(row => {
            return Object.values(row).some(val =>
                String(val).toLowerCase().includes(lowerSearch)
            );
        });
    }, [rowData, searchText]);

    // 2. Sorting
    const sortedData = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    // 3. Pagination
    const totalPages = Math.ceil(sortedData.length / paginationPageSize);
    const paginatedData = useMemo(() => {
        if (!pagination) return sortedData;
        const start = (currentPage - 1) * paginationPageSize;
        return sortedData.slice(start, start + paginationPageSize);
    }, [sortedData, currentPage, pagination, paginationPageSize]);

    const handleSort = (key: string, sortable?: boolean) => {
        if (!sortable) return;
        let direction: 'asc' | 'desc' | null = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
        setSortConfig({ key, direction });
    };

    const toggleRow = (index: number) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(index)) {
            newExpandedRows.delete(index);
        } else {
            newExpandedRows.add(index);
        }
        setExpandedRows(newExpandedRows);
    };

    return (
        <div className="flex flex-col h-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-background/50 border-b border-border">
                            {renderRowDetails && <th className="px-6 py-4 w-10"></th>}
                            {columnDefs.map((col, idx) => (
                                <th
                                    key={idx}
                                    style={{ width: col.width, flex: col.flex }}
                                    className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest text-text-secondary ${col.sortable ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                                    onClick={() => handleSort(col.field, col.sortable)}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.headerName}
                                        {col.sortable && sortConfig.key === col.field && (
                                            <span className="text-primary">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {paginatedData.map((row, rowIdx) => {
                            const isExpanded = expandedRows.has(rowIdx);
                            return (
                                <React.Fragment key={rowIdx}>
                                    <tr className={`hover:bg-primary/5 transition-colors group ${isExpanded ? 'bg-primary/5' : ''}`}>
                                        {renderRowDetails && (
                                            <td className="px-6 py-4 w-10">
                                                <button
                                                    onClick={() => toggleRow(rowIdx)}
                                                    className="p-1 hover:bg-primary/10 rounded-lg transition-colors text-text-secondary hover:text-primary"
                                                >
                                                    <svg
                                                        className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </td>
                                        )}
                                        {columnDefs.map((col, colIdx) => (
                                            <td
                                                key={colIdx}
                                                className={`px-6 py-4 text-sm text-text ${col.cellClass || ''}`}
                                                style={col.cellStyle}
                                            >
                                                {col.cellRenderer
                                                    ? col.cellRenderer({ value: row[col.field], data: row })
                                                    : row[col.field]}
                                            </td>
                                        ))}
                                    </tr>
                                    {isExpanded && renderRowDetails && (
                                        <tr className="bg-background/40">
                                            <td colSpan={columnDefs.length + 1} className="px-10 py-6">
                                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {renderRowDetails(row)}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {paginatedData.length === 0 && (
                            <tr>
                                <td colSpan={columnDefs.length + (renderRowDetails ? 1 : 0)} className="px-6 py-20 text-center text-text-secondary italic">
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && totalPages > 1 && (
                <div className="mt-auto px-6 py-4 border-t border-border bg-background/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em] order-2 sm:order-1">
                        Showing <span className="text-text">{(currentPage - 1) * paginationPageSize + 1}</span> to <span className="text-text">{Math.min(currentPage * paginationPageSize, sortedData.length)}</span> of <span className="text-text">{sortedData.length}</span> results
                    </span>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-2 rounded-xl border border-border bg-surface hover:border-primary/50 text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            title="Previous Page"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                        </button>

                        <div className="flex items-center gap-1">
                            {(() => {
                                const pages = [];
                                const delta = 1;
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
                                            className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all shadow-sm ${currentPage === page ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-10' : 'bg-surface text-text-secondary border border-border hover:border-primary/50 hover:text-primary'}`}
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
                            className="p-2 rounded-xl border border-border bg-surface hover:border-primary/50 text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
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
