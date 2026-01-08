import React from 'react';
import { useLoading } from '../context/LoadingContext';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'info' | 'warning';
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    type = 'danger'
}: ConfirmModalProps) {
    const { isLoading } = useLoading();
    if (!isOpen) return null;

    const typeConfig = {
        danger: {
            icon: 'bg-error/10 text-error',
            button: 'bg-error hover:bg-red-600 shadow-error/20',
            iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
        },
        warning: {
            icon: 'bg-warning/10 text-warning',
            button: 'bg-warning hover:bg-orange-600 shadow-warning/20',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
        },
        info: {
            icon: 'bg-primary/10 text-primary',
            button: 'bg-primary hover:bg-primary-hover shadow-primary/20',
            iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        }
    };

    const config = typeConfig[type];

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface border border-border w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center">
                    <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6 border border-border ${config.icon}`}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={config.iconPath}></path>
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-text uppercase tracking-tight mb-2">{title}</h3>
                    <p className="text-sm text-text-secondary font-medium leading-relaxed mb-8">{message}</p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center ${config.button}`}
                        >
                            {confirmLabel}
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-4 rounded-2xl text-text-secondary font-bold hover:text-text hover:bg-background transition-all text-xs uppercase tracking-widest"
                        >
                            {cancelLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
