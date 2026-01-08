import { useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';

export default function Profile() {
    const { user } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (formData.newPassword !== formData.confirmNewPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (formData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setFormData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        } catch (err: any) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to update password'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="My Profile">
            <div className="max-w-2xl mx-auto">
                <div className="bg-surface border border-border rounded-xl p-8 shadow-sm">
                    <div className="flex items-center space-x-4 mb-8">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-text">{user?.username}</h1>
                            <p className="text-text-secondary">{user?.email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded textxs font-medium bg-primary/10 text-primary capitalize">
                                {user?.role}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-border pt-8">
                        <h2 className="text-lg font-bold text-text mb-6">Change Password</h2>

                        {message.text && (
                            <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary transition-colors"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    name="confirmNewPassword"
                                    value={formData.confirmNewPassword}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-primary transition-colors"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-all ${loading
                                    ? 'bg-primary/50 cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20'
                                    }`}
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
