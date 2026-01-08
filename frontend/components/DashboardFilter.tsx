import React from 'react';

interface DashboardFilterProps {
    period: string;
    onPeriodChange: (period: string) => void;
    startDate: string;
    endDate: string;
    onDateRangeChange: (start: string, end: string) => void;
}

export default function DashboardFilter({
    period,
    onPeriodChange,
    startDate,
    endDate,
    onDateRangeChange,
}: DashboardFilterProps) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 w-full">
            <div className="flex space-x-2 bg-surface p-1 rounded-lg border border-border shadow-sm">
                <button
                    onClick={() => onPeriodChange('all_time')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${period === 'all_time'
                            ? 'bg-primary text-white shadow-md'
                            : 'text-text-secondary hover:text-text hover:bg-background'
                        }`}
                >
                    All Time
                </button>
                <button
                    onClick={() => onPeriodChange('today')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${period === 'today'
                            ? 'bg-primary text-white shadow-md'
                            : 'text-text-secondary hover:text-text hover:bg-background'
                        }`}
                >
                    Today
                </button>
                <button
                    onClick={() => onPeriodChange('custom')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${period === 'custom'
                            ? 'bg-primary text-white shadow-md'
                            : 'text-text-secondary hover:text-text hover:bg-background'
                        }`}
                >
                    Custom
                </button>
            </div>

            {period === 'custom' && (
                <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => onDateRangeChange(e.target.value, endDate)}
                        className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-text-secondary">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => onDateRangeChange(startDate, e.target.value)}
                        className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            )}
        </div>
    );
}
