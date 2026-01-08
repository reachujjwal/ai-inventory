import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import api from '../lib/api';

interface WishlistItem {
    product_id: number;
    name: string;
    price: number;
    image_url: string;
    description: string;
    stock_level: number;
}

interface WishlistContextType {
    wishlist: WishlistItem[];
    wishlistCount: number;
    addToWishlist: (productId: number) => Promise<void>;
    removeFromWishlist: (productId: number) => Promise<void>;
    refreshWishlist: () => Promise<void>;
    isInWishlist: (productId: number) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const { isAuthenticated } = useAuth();
    const { showNotification } = useNotification();

    const fetchWishlist = async () => {
        if (!isAuthenticated) return;
        try {
            const res = await api.get('/wishlist');
            setWishlist(res.data);
        } catch (err) {
            console.error('Fetch wishlist error:', err);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchWishlist();
        } else {
            setWishlist([]);
        }
    }, [isAuthenticated]);

    const addToWishlist = async (productId: number) => {
        if (!isAuthenticated) {
            showNotification('Please log in to add items to your wishlist', 'info');
            return;
        }
        try {
            await api.post('/wishlist', { product_id: productId });
            await fetchWishlist();
            showNotification('Added to wishlist', 'success');
        } catch (err) {
            showNotification('Failed to add to wishlist', 'error');
        }
    };

    const removeFromWishlist = async (productId: number) => {
        try {
            await api.delete(`/wishlist/${productId}`);
            setWishlist(prev => prev.filter(item => item.product_id !== productId));
            showNotification('Removed from wishlist', 'success');
        } catch (err) {
            showNotification('Failed to remove from wishlist', 'error');
        }
    };

    const isInWishlist = (productId: number) => {
        return wishlist.some(item => item.product_id === productId);
    };

    return (
        <WishlistContext.Provider value={{
            wishlist,
            wishlistCount: wishlist.length,
            addToWishlist,
            removeFromWishlist,
            refreshWishlist: fetchWishlist,
            isInWishlist
        }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
