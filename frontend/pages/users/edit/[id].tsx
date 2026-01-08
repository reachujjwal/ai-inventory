import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import api from '../../../lib/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { useNotification } from '../../../context/NotificationContext';
import { useLoading } from '../../../context/LoadingContext';
import { hasPermission, PERMISSIONS } from '../../../lib/rbac';

export default function EditUser() {
    const router = useRouter();
    const { id } = router.query;
    const { isAuthenticated, loading, user: currentUser } = useAuth();
    const { showNotification } = useNotification();

    const [form, setForm] = useState({
        username: '',
        email: '',
        role: 'user',
        password: '',
        confirmPassword: ''
    });
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const { setIsLoading, isLoading } = useLoading();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_update')) {
            router.push('/');
        } else if (id && isAuthenticated && hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_update')) {
            fetchRoles();
            fetchUser();
        }
    }, [id, isAuthenticated, loading, currentUser]);

    const fetchRoles = async () => {
        try {
            const res = await api.get('/roles');
            setRoles(res.data);
        } catch (error) {
            showNotification('Failed to fetch roles', 'error');
        }
    };

    const fetchUser = async () => {
        try {
            const res = await api.get('/users');
            const user = res.data.find((u: any) => u.id === parseInt(id as string));
            if (user) {
                setForm({
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    password: '',
                    confirmPassword: ''
                });
                setCurrentImage(user.image_url);
            } else {
                showNotification('User not found', 'error');
                router.push('/users');
            }
        } catch (err) {
            console.error(err);
            showNotification('Failed to load user', 'error');
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
            if (form.password && form.password !== form.confirmPassword) {
                showNotification('Passwords do not match', 'error');
                setIsLoading(false);
                return;
            }


            const formData = new FormData();
            formData.append('username', form.username);
            formData.append('email', form.email);
            formData.append('role', form.role);
            if (form.password) {
                formData.append('password', form.password);
            }

            if (imageFile) {

                formData.append('image', imageFile);
            }

            await api.put(`/users/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showNotification('User updated successfully', 'success');
            router.push('/users');
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Error updating user', 'error');
            setIsLoading(false);
        }
    };

    if (loading || !isAuthenticated || !hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_update')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <Layout title="Edit User Profile">
            <div className="max-w-2xl mx-auto py-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-text tracking-tight uppercase">Edit User</h1>
                        <p className="text-text-secondary font-medium uppercase tracking-widest text-[10px] mt-1">Management Console</p>
                    </div>
                    <Link href="/users">
                        <a className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-text transition-colors flex items-center bg-surface border border-border rounded-lg shadow-sm">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            Back to List
                        </a>
                    </Link>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl shadow-black/20">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                {imagePreview ? (
                                    <img src={imagePreview} className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-xl" alt="Preview" />
                                ) : currentImage ? (
                                    <img src={`http://localhost:5000${currentImage}`} className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-xl" alt="Current" />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center shadow-xl">
                                        <span className="text-4xl font-black text-primary">{form.username?.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                            </div>
                            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">Click image to update profile photo</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-3">Username</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 rounded-xl bg-background border border-border text-text placeholder-text-secondary/30 focus:ring-4 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all font-semibold"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-3">Role</label>
                                <select
                                    className="w-full px-5 py-3 rounded-xl bg-background border border-border text-text focus:ring-4 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all font-semibold appearance-none cursor-pointer"
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
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-3">Email Address</label>
                            <input
                                type="email"
                                className="w-full px-5 py-3 rounded-xl bg-background border border-border text-text placeholder-text-secondary/30 focus:ring-4 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all font-semibold opacity-60 cursor-not-allowed"
                                value={form.email}
                                readOnly
                                disabled
                                title="Email cannot be changed"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-3">New Password (Optional)</label>
                                <input
                                    type="password"
                                    className="w-full px-5 py-3 rounded-xl bg-background border border-border text-text placeholder-text-secondary/30 focus:ring-4 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all font-semibold"
                                    value={form.password}
                                    placeholder="Leave blank to keep current"
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-3">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="w-full px-5 py-3 rounded-xl bg-background border border-border text-text placeholder-text-secondary/30 focus:ring-4 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all font-semibold"
                                    value={form.confirmPassword}
                                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>



                        <div className="pt-6 border-t border-border flex justify-end">
                            <button
                                disabled={isLoading}
                                className={`px-10 py-4 bg-primary hover:bg-primary-hover text-white font-black rounded-xl transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 transform hover:-translate-y-1 active:translate-y-0 text-xs uppercase tracking-[0.2em] flex items-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Update Profile
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
