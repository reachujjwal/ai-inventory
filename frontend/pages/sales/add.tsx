import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { hasPermission, PERMISSIONS } from '../../lib/rbac';

import { useNotification } from '../../context/NotificationContext';
import { useLoading } from '../../context/LoadingContext';

export default function AddSale() {
    const [products, setProducts] = useState<any[]>([]);
    const [form, setForm] = useState({ product_id: '', quantity: 1, total_amount: '' });
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();
    const { setIsLoading, isLoading } = useLoading();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !hasPermission(user?.permissions, PERMISSIONS.MODULE_SALES, 'can_add')) {
            router.push('/');
        } else if (isAuthenticated) {
            fetchProducts();
        }
    }, [isAuthenticated, loading, user]);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data);
        } catch (err) {
            console.error('Failed to fetch products');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/sales', form);
            showNotification('Sale recorded successfully', 'success');
            router.push('/sales');
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Error recording sale', 'error');
            setIsLoading(false);
        }
    };

    if (loading || !isAuthenticated || !hasPermission(user?.permissions, PERMISSIONS.MODULE_SALES, 'can_add')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <Layout title="Record New Sale">
            <div className="max-w-2xl mx-auto">
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Product</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.product_id}
                                onChange={e => setForm({ ...form, product_id: e.target.value })}
                                required
                            >
                                <option value="">Select Product...</option>
                                {products.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.quantity}
                                onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Total Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.total_amount}
                                onChange={e => setForm({ ...form, total_amount: e.target.value })}
                                required
                            />
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                            <Link href="/sales">
                                <a className={`px-6 py-2 rounded-lg border border-border text-text hover:bg-background transition-colors font-medium ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    Cancel
                                </a>
                            </Link>
                            <button
                                disabled={isLoading}
                                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-primary/30 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                Record Sale
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
