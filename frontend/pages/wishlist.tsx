import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import api from '../lib/api';
import Link from 'next/link';

interface WishlistItem {
    product_id: number;
    name: string;
    price: number;
    image_url: string;
    description: string;
    stock_level: number;
}

import { useWishlist } from '../context/WishlistContext';

export default function Wishlist() {
    const { isAuthenticated } = useAuth();
    const { addToCart } = useCart();
    const { showNotification } = useNotification();
    const { wishlist, removeFromWishlist } = useWishlist();
    const [isLoading, setIsLoading] = useState(false);

    const handleRemove = async (productId: number) => {
        await removeFromWishlist(productId);
    };

    const handleAddToCart = (item: WishlistItem) => {
        addToCart({
            id: item.product_id,
            name: item.name,
            price: item.price,
            image_url: item.image_url,
            stock_level: item.stock_level,
            quantity: 1
        });
        handleRemove(item.product_id); // Automatically remove from wishlist
        showNotification(`${item.name} added to cart!`, 'success');
    };

    if (isLoading) {
        return (
            <Layout title="Your Wishlist">
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    if (!isAuthenticated) {
        return (
            <Layout title="Your Wishlist">
                <div className="max-w-4xl mx-auto text-center py-20">
                    <h2 className="text-2xl font-bold text-text mb-4">Please log in to see your wishlist</h2>
                    <Link href="/login">
                        <a className="px-8 py-3 bg-primary text-white font-bold rounded-lg transition-colors">Log In</a>
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Your Wishlist">
            <div className="max-w-6xl mx-auto py-8">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-text uppercase tracking-tighter">My Wishlist</h1>
                        <p className="text-text-secondary font-medium">Items you've saved for later</p>
                    </div>
                </div>

                {wishlist.length === 0 ? (
                    <div className="text-center py-20 bg-surface border border-border rounded-2xl">
                        <svg className="w-20 h-20 mx-auto text-text-secondary/20 mb-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <h2 className="text-xl font-bold text-text mb-2">Your wishlist is empty</h2>
                        <p className="text-text-secondary mb-8">Save products you love to see them here.</p>
                        <Link href="/products">
                            <a className="px-6 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all">Go Shopping</a>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wishlist.map(item => (
                            <div key={item.product_id} className="group bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
                                <div className="relative aspect-square bg-background overflow-hidden">
                                    {item.image_url ? (
                                        <img src={`http://localhost:5000${item.image_url}`} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-text-secondary/20">
                                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleRemove(item.product_id)}
                                        className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur rounded-full text-error opacity-0 group-hover:opacity-100 transition-all hover:bg-error hover:text-white"
                                        title="Remove from wishlist"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-text group-hover:text-primary transition-colors">{item.name}</h3>
                                        <span className="text-lg font-black text-primary">${item.price}</span>
                                    </div>
                                    <p className="text-text-secondary text-sm mb-6 line-clamp-2">{item.description}</p>
                                    <button
                                        onClick={() => handleAddToCart(item)}
                                        disabled={item.stock_level <= 0}
                                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:bg-text-secondary flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                                        </svg>
                                        {item.stock_level > 0 ? 'Add to Cart' : 'Out of Stock'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
