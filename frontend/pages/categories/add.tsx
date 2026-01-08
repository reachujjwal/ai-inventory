import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useNotification } from '../../context/NotificationContext';
import { useLoading } from '../../context/LoadingContext';
import { hasPermission, PERMISSIONS } from '../../lib/rbac';

export default function AddCategory() {
    const [form, setForm] = useState({ name: '', description: '' });
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();
    const { setIsLoading, isLoading } = useLoading();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_add')) {
            router.push('/');
        }
    }, [isAuthenticated, loading, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/categories', form);
            showNotification('Category created successfully', 'success');
            router.push('/categories');
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Error creating category', 'error');
            setIsLoading(false);
        }
    };

    if (loading || !isAuthenticated || !hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_add')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <Layout title="Add New Category">
            <div className="max-w-2xl mx-auto">
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Category Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                            <textarea
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                rows={4}
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                            <Link href="/categories">
                                <a className={`px-6 py-2 rounded-lg border border-border text-text hover:bg-background transition-colors font-medium ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    Cancel
                                </a>
                            </Link>
                            <button
                                disabled={isLoading}
                                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-primary/30 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                Create Category
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
