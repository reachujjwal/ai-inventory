import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast from '../components/Toast';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showNotification = useCallback((message: string, type: NotificationType = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    }, [removeNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4 sm:px-0" style={{ minHeight: '1px' }}>
                {notifications.map((n) => (
                    <Toast
                        key={n.id}
                        message={n.message}
                        type={n.type}
                        onClose={() => removeNotification(n.id)}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
