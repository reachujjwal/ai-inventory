import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useNotification } from '../../context/NotificationContext';
import { useLoading } from '../../context/LoadingContext';
import { hasPermission, PERMISSIONS } from '../../lib/rbac';

export default function AddUser() {
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'user' });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();
    const { setIsLoading, isLoading } = useLoading();

    const [roles, setRoles] = useState<string[]>([]);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !hasPermission(user?.permissions, PERMISSIONS.MODULE_USERS, 'can_add')) {
            router.push('/');
        } else if (isAuthenticated) {
            fetchRoles();
        }
    }, [isAuthenticated, loading, user]);

    const fetchRoles = async () => {
        try {
            const res = await api.get('/roles');
            setRoles(res.data);
        } catch (error) {
            showNotification('Failed to fetch roles', 'error');
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
            formData.append('username', form.username);
            formData.append('email', form.email);
            formData.append('password', form.password);
            formData.append('role', form.role);
            if (imageFile) {
                formData.append('image', imageFile);
            }

            await api.post('/users', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showNotification('User created successfully', 'success');
            router.push('/users');
        } catch (err) {
            showNotification('Error creating user', 'error');
            setIsLoading(false);
        }
    };

    if (loading || !isAuthenticated || !hasPermission(user?.permissions, PERMISSIONS.MODULE_USERS, 'can_add')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <Layout title="Add New User">
            <div className="max-w-2xl mx-auto">
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Username</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Role</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                value={form.role}
                                onChange={e => setForm({ ...form, role: e.target.value })}
                            >
                                {roles.map(r => (
                                    <option key={r} value={r}>
                                        {r.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Profile Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-text focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                            />
                            {imagePreview && (
                                <div className="mt-3">
                                    <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-full border-2 border-border" />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                            <Link href="/users">
                                <a className={`px-6 py-2 rounded-lg border border-border text-text hover:bg-background transition-colors font-medium ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    Cancel
                                </a>
                            </Link>
                            <button
                                disabled={isLoading}
                                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-primary/30 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                Create User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
