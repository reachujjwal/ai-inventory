import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useNotification } from '../../context/NotificationContext';
import { useLoading } from '../../context/LoadingContext';
import { hasPermission, PERMISSIONS } from '../../lib/rbac';

export default function AddProduct() {
    const [form, setForm] = useState({ name: '', description: '', price: '', sku: '', category_id: '' });
    const [categories, setCategories] = useState<any[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();
    const { setIsLoading, isLoading } = useLoading();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_add')) {
            router.push('/');
        } else if (isAuthenticated && hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_add')) {
            fetchCategories();
        }
    }, [isAuthenticated, loading, user]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/categories');
            setCategories(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showNotification('Please select an image file', 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Image size should be less than 5MB', 'error');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('description', form.description);
            formData.append('price', form.price);
            formData.append('sku', form.sku);
            formData.append('category_id', form.category_id);
            if (imageFile) {
                formData.append('image', imageFile);
            }

            await api.post('/products', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showNotification('Product created successfully', 'success');
            router.push('/products');
        } catch (err) {
            showNotification('Error creating product', 'error');
            setIsLoading(false);
        }
    };

    if (loading || !isAuthenticated || !hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_add')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <Layout title="Add New Product">
            <div className="max-w-2xl mx-auto">
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                    value={form.category_id}
                                    onChange={e => setForm({ ...form, category_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Category...</option>
                                    {categories.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">SKU</label>
                                <input
                                    className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                    value={form.sku}
                                    onChange={e => setForm({ ...form, sku: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Product Name</label>
                            <input
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Price</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.price}
                                onChange={e => setForm({ ...form, price: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Product Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                            />
                            {imagePreview && (
                                <div className="mt-3">
                                    <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-border" />
                                </div>
                            )}
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
                            <Link href="/products">
                                <a className={`px-6 py-2 rounded-lg border border-border text-text hover:bg-background transition-colors font-medium ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    Cancel
                                </a>
                            </Link>
                            <button
                                disabled={isLoading}
                                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-primary/30 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                Add Product
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
