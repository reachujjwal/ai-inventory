import { useState } from 'react';
import Layout from '../components/Layout';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import api from '../lib/api';
import { useNotification } from '../context/NotificationContext';
import Link from 'next/link';

export default function Cart() {
    const { items, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
    const { isAuthenticated, user } = useAuth();
    const { showNotification } = useNotification();
    const { addToWishlist } = useWishlist();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [rewardPointsToUse, setRewardPointsToUse] = useState(0);
    const [availablePoints, setAvailablePoints] = useState(user?.reward_points || 0);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsApplyingCoupon(true);
        try {
            const res = await api.post('/coupons/validate', { code: couponCode, cartTotal });
            setAppliedCoupon(res.data);
            showNotification('Coupon applied successfully!', 'success');
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Invalid coupon', 'error');
            setAppliedCoupon(null);
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const handleCheckout = async () => {
        setIsCheckingOut(true);
        try {
            const checkoutData = {
                items,
                payment_method: paymentMethod,
                coupon_code: appliedCoupon?.code,
                reward_points_to_use: rewardPointsToUse
            };

            if (paymentMethod === 'card') {
                const res = await api.post('/payments/create-checkout-session', checkoutData);
                if (res.data.url) {
                    window.location.href = res.data.url;
                } else {
                    showNotification('Failed to initiate payment', 'error');
                }
            } else {
                // COD Flow
                await api.post('/orders/checkout', { ...checkoutData, payment_method: 'cod' });
                showNotification('Order placed successfully (Cash on Delivery)!', 'success');
                clearCart();
                // Redirect to success or orders page
                window.location.href = '/payment/success?method=cod';
            }
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Checkout failed', 'error');
        } finally {
            setIsCheckingOut(false);
        }
    };

    if (items.length === 0) {
        return (
            <Layout title="Shopping Cart">
                <div className="max-w-4xl mx-auto text-center py-20">
                    <svg className="w-24 h-24 mx-auto text-text-secondary mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <h2 className="text-2xl font-bold text-text mb-4">Your cart is empty</h2>
                    <p className="text-text-secondary mb-8">Looks like you haven't added anything to your cart yet.</p>
                    <Link href="/products">
                        <a className="px-8 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors">
                            Start Shopping
                        </a>
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Shopping Cart">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-text mb-8">Shopping Cart</h1>

                <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 space-y-6">
                        {items.map(item => (
                            <div key={item.product_id} className="flex items-center gap-4 py-4 border-b border-border last:border-0">
                                <div className="w-24 h-24 bg-background rounded-lg border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {item.image_url ? (
                                        <img src={`http://localhost:5000${item.image_url}`} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-text">{item.name}</h3>
                                    <p className="text-text-secondary text-sm">Stock Available: {item.stock_level}</p>
                                    <div className="mt-2 flex items-center gap-4">
                                        <div className="flex items-center border border-border rounded-lg">
                                            <button
                                                onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                className="px-3 py-1 hover:bg-background text-text transition-colors"
                                            >-</button>
                                            <span className="px-3 py-1 font-mono">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                className="px-3 py-1 hover:bg-background text-text transition-colors"
                                            >+</button>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="text-error hover:text-red-700 text-xs font-semibold uppercase tracking-wider"
                                        >
                                            Remove
                                        </button>
                                        <span className="text-border mx-1">|</span>
                                        <button
                                            onClick={async () => {
                                                await addToWishlist(item.product_id);
                                                removeFromCart(item.product_id);
                                            }}
                                            className="text-primary hover:text-primary-hover text-xs font-semibold uppercase tracking-wider"
                                        >
                                            Move to Wishlist
                                        </button>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-lg font-bold text-text">${(item.price * item.quantity).toFixed(2)}</div>
                                    <div className="text-sm text-text-secondary">${item.price} / each</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-background border-t border-border p-6">
                        <div className="flex justify-between items-end mb-6">
                            <div className="flex-1 max-w-sm">
                                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">Order Summary</h4>
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-text">
                                        <span>Subtotal</span>
                                        <span className="font-mono">${cartTotal.toFixed(2)}</span>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-primary font-bold">
                                            <span>Discount ({appliedCoupon.code})</span>
                                            <span className="font-mono">-${appliedCoupon.discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {user?.role === 'user' && rewardPointsToUse > 0 && (
                                        <div className="flex justify-between text-warning font-bold">
                                            <span>Reward Points ({rewardPointsToUse} pts)</span>
                                            <span className="font-mono">-${rewardPointsToUse.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-black text-text border-t border-border pt-2">
                                        <span>Total</span>
                                        <span className="text-primary tracking-tighter">${(cartTotal - (appliedCoupon?.discount || 0) - rewardPointsToUse).toFixed(2)}</span>
                                    </div>
                                </div>

                                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3">Coupon Code</h4>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter code"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text font-mono uppercase"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={isApplyingCoupon || !couponCode}
                                        className="px-6 py-2 bg-background border border-border text-text font-bold rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
                                    >
                                        {isApplyingCoupon ? '...' : 'Apply'}
                                    </button>
                                </div>
                                {appliedCoupon && (
                                    <p className="mt-2 text-xs text-green-600 font-bold">✓ Coupon "{appliedCoupon.code}" applied!</p>
                                )}

                                {user?.role === 'user' && (
                                    <>
                                        <h4 className="text-sm font-bold text-text-secondary uppercase tracking-widest mt-8 mb-3">Use Reward Points</h4>
                                        <div className="bg-gradient-to-r from-warning/10 to-primary/10 border border-warning/30 rounded-lg p-4 mb-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-text-secondary">Available Points</span>
                                                <span className="text-lg font-black text-warning">{availablePoints}</span>
                                            </div>
                                            <p className="text-[10px] text-text-secondary">1 point = $1 discount</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                placeholder="Points to use"
                                                value={rewardPointsToUse || ''}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const maxPoints = Math.min(availablePoints, Math.floor(cartTotal - (appliedCoupon?.discount || 0)));
                                                    setRewardPointsToUse(Math.max(0, Math.min(val, maxPoints)));
                                                }}
                                                max={Math.min(availablePoints, Math.floor(cartTotal - (appliedCoupon?.discount || 0)))}
                                                className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-warning/50 text-text font-mono"
                                            />
                                            <button
                                                onClick={() => {
                                                    const maxPoints = Math.min(availablePoints, Math.floor(cartTotal - (appliedCoupon?.discount || 0)));
                                                    setRewardPointsToUse(maxPoints);
                                                }}
                                                className="px-6 py-2 bg-warning/20 border border-warning text-warning font-bold rounded-lg hover:bg-warning/30 transition-colors"
                                            >
                                                Max
                                            </button>
                                        </div>
                                        {rewardPointsToUse > 0 && (
                                            <p className="mt-2 text-xs text-warning font-bold">✓ Using {rewardPointsToUse} points (${rewardPointsToUse} discount)</p>
                                        )}
                                    </>
                                )}

                                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-widest mt-8 mb-3">Payment Method</h4>
                                <div className="flex gap-4">
                                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface'}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={paymentMethod === 'card'}
                                            onChange={() => setPaymentMethod('card')}
                                            className="hidden"
                                        />
                                        <svg className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-primary' : 'text-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <span className={`text-sm font-bold ${paymentMethod === 'card' ? 'text-primary' : 'text-text'}`}>Card</span>
                                    </label>
                                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface'}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            checked={paymentMethod === 'cod'}
                                            onChange={() => setPaymentMethod('cod')}
                                            className="hidden"
                                        />
                                        <svg className={`w-5 h-5 ${paymentMethod === 'cod' ? 'text-primary' : 'text-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm10-4V9l-1.5-1.5-1.5 1.5V11m-3 0V9l-1.5-1.5L9 9v2m11 4v6h-4v-6h4z"></path>
                                        </svg>
                                        <span className={`text-sm font-bold ${paymentMethod === 'cod' ? 'text-primary' : 'text-text'}`}>COD</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Link href="/products">
                                <a className="px-6 py-3 border border-border text-text font-bold rounded-lg hover:bg-surface transition-colors">
                                    Continue Shopping
                                </a>
                            </Link>
                            <button
                                onClick={handleCheckout}
                                disabled={isCheckingOut}
                                className="px-8 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {isCheckingOut ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    paymentMethod === 'cod' ? 'Place COD Order' : 'Pay with Card'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
