import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';
import api from '../lib/api';

export interface CartItem {
    product_id: number;
    name: string;
    price: number;
    quantity: number;
    image_url: string | null;
    stock_level: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: any) => Promise<void>;
    removeFromCart: (productId: number) => Promise<void>;
    updateQuantity: (productId: number, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    cartTotal: number;
    itemCount: number;
    loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const { isAuthenticated } = useAuth();

    const fetchCart = async () => {
        if (!isAuthenticated) {
            setItems([]);
            return;
        }

        try {
            // No loading spinner for background refetching to avoid flickering 
            // but we can set loading=true on initial.
            // keeping it simple for now, maybe add specific loading state if needed.
            const res = await api.get('/cart');
            setItems(res.data);
        } catch (error) {
            console.error('Failed to fetch cart', error);
            // Don't show error notification for every fetch, might be annoying on auth check
        }
    };

    useEffect(() => {
        fetchCart();
    }, [isAuthenticated]);

    const addToCart = async (product: any) => {
        if (!isAuthenticated) {
            showNotification('Please login to add items to cart', 'error');
            return;
        }

        try {
            await api.post('/cart/add', {
                product_id: product.id || product.product_id,
                quantity: 1
            });
            showNotification('Product added to cart', 'success');
            await fetchCart();
        } catch (error: any) {
            console.error('Add to cart failed', error);
            showNotification(error.response?.data?.message || 'Failed to add item', 'error');
        }
    };

    const removeFromCart = async (productId: number) => {
        try {
            await api.delete(`/cart/${productId}`);
            showNotification('Item removed from cart', 'info');
            await fetchCart();
        } catch (error: any) {
            console.error('Remove cart item failed', error);
            showNotification(error.response?.data?.message || 'Failed to remove item', 'error');
        }
    };

    const updateQuantity = async (productId: number, quantity: number) => {
        try {
            await api.put(`/cart/${productId}`, { quantity });
            // showNotification('Cart updated', 'success'); // Optional, maybe too noisy
            await fetchCart();
        } catch (error: any) {
            console.error('Update cart failed', error);
            showNotification(error.response?.data?.message || 'Failed to update quantity', 'error');
            // Revert optimistic update or refetch to fix UI sync
            await fetchCart();
        }
    };

    const clearCart = async () => {
        try {
            await api.delete('/cart');
            setItems([]);
            // Local storage specific logic removed
        } catch (error: any) {
            console.error('Clear cart failed', error);
            // Even if server fails, we might want to clear local UI?
            // But valid state is server state.
        }
    };

    const cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount, loading }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
