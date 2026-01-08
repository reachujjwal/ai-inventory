import { useState } from 'react';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
    return (
        <div className="flex items-center space-x-2 bg-surface border border-border rounded-lg p-1">
            <input
                type="date"
                value={startDate}
                onChange={(e) => onChange(e.target.value, endDate)}
                className="bg-transparent text-xs text-text border-none focus:ring-0 p-1"
            />
            <span className="text-text-secondary text-xs">-</span>
            <input
                type="date"
                value={endDate}
                onChange={(e) => onChange(startDate, e.target.value)}
                className="bg-transparent text-xs text-text border-none focus:ring-0 p-1"
            />
        </div>
    );
}
