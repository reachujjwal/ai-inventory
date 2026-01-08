import React, { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const typeConfig = {
        success: {
            bg: 'bg-surface border-success/30',
            icon: 'bg-success text-white',
            text: 'text-text',
            iconPath: 'M5 13l4 4L19 7',
            label: 'Success'
        },
        error: {
            bg: 'bg-surface border-error/30',
            icon: 'bg-error text-white',
            text: 'text-text',
            iconPath: 'M6 18L18 6M6 6l12 12',
            label: 'Error'
        },
        warning: {
            bg: 'bg-surface border-warning/30',
            icon: 'bg-warning text-white',
            text: 'text-text',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            label: 'Warning'
        },
        info: {
            bg: 'bg-surface border-primary/30',
            icon: 'bg-primary text-white',
            text: 'text-text',
            iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            label: 'Info'
        }
    };

    const config = typeConfig[type];

    return (
        <div className={`pointer-events-auto transform transition-all duration-500 ease-in-out border shadow-2xl rounded-2xl p-4 flex items-center gap-4 ${config.bg} ${isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'}`}>
            <div className={`p-2 rounded-xl flex-shrink-0 ${config.icon}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={config.iconPath}></path>
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-0.5">{config.label}</p>
                <p className={`text-sm font-bold ${config.text} truncate`}>{message}</p>
            </div>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
                className="text-text-secondary hover:text-text p-1 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    );
}
