import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useNotification } from '../../context/NotificationContext';
import Link from 'next/link';

export default function PaymentSuccess() {
    const router = useRouter();
    const { session_id, method } = router.query;
    const { clearCart } = useCart();
    const { showNotification } = useNotification();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

    useEffect(() => {
        if (session_id) {
            processOrder();
        } else if (method === 'cod') {
            setStatus('success');
            clearCart();
        }
    }, [session_id, method]);

    const processOrder = async () => {
        try {
            // In a real app, we'd use webhooks. 
            // For this sandbox, we'll verify the session and create the order.

            // First, get the session metadata (userId, items) from backend
            // For now, we'll just leverage the existing checkout logic if items are in the session.
            // But since we want to clear the cart and finalize the order, let's assume 
            // the backend handles order creation via webhook or a verification endpoint.

            // Simplified: We'll call a'verify-and-checkout' endpoint or just move the checkout logic here.
            // Let's assume the session metadata has what we need.

            await api.post('/orders/checkout', {
                stripe_session_id: session_id,
                // The backend controller will need to be updated to handle stripe_session_id
            });

            setStatus('success');
            clearCart();
            showNotification('Payment successful and order placed!', 'success');
        } catch (err) {
            console.error('Order processing failed:', err);
            setStatus('error');
            showNotification('Order processing failed after payment. Please contact support.', 'error');
        }
    };

    return (
        <Layout title="Payment Successful">
            <div className="max-w-2xl mx-auto py-20 text-center">
                {status === 'processing' && (
                    <div className="space-y-6">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mx-auto"></div>
                        <h1 className="text-3xl font-black text-text uppercase tracking-tighter">Processing Order...</h1>
                        <p className="text-text-secondary font-medium uppercase tracking-widest text-[10px]">Please do not refresh the page.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mx-auto border-4 border-success animate-bounce">
                            <svg className="w-12 h-12 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-text uppercase tracking-tighter mb-4">You're All Set!</h1>
                            <p className="text-lg text-text-secondary font-medium">
                                {method === 'cod'
                                    ? 'Your Cash on Delivery order has been successfully placed.'
                                    : 'Your payment was successful and your order has been placed.'
                                }
                            </p>
                        </div>
                        <div className="flex justify-center gap-4">
                            <Link href="/orders">
                                <a className="px-8 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition-all">View Orders</a>
                            </Link>
                            <Link href="/">
                                <a className="px-8 py-3 border border-border text-text font-bold rounded-xl hover:bg-surface transition-all">Back Home</a>
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black text-text uppercase tracking-tighter">Something went wrong</h1>
                        <p className="text-text-secondary">We couldn't finalize your order. Please check your email or contact support.</p>
                        <Link href="/cart">
                            <a className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-xl">Return to Cart</a>
                        </Link>
                    </div>
                )}
            </div>
        </Layout>
    );
}
