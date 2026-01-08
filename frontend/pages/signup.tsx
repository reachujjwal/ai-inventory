import { useState } from 'react';
import api from '../lib/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLoading } from '../context/LoadingContext';

export default function Signup() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const router = useRouter();
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const { setIsLoading, isLoading } = useLoading();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);
        try {
            const response = await api.post('/auth/register', { username, email, password, role });
            const message = response.data.message || 'Registration successful';
            setSuccessMessage(message);
            setIsLoading(false);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl p-8 transform transition-all hover:scale-[1.01]">
                <h2 className="text-2xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    Create Account
                </h2>

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm font-medium flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="mb-6 p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm font-medium flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">Account Type</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('user')}
                                className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${role === 'user'
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-background border-border text-text-secondary hover:border-primary/50'
                                    }`}
                            >
                                <div className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                    User
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('tenant')}
                                className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${role === 'tenant'
                                        ? 'bg-secondary/10 border-secondary text-secondary'
                                        : 'bg-background border-border text-text-secondary hover:border-secondary/50'
                                    }`}
                            >
                                <div className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                    Tenant
                                </div>
                            </button>
                        </div>
                        {role === 'tenant' && (
                            <p className="mt-2 text-xs text-text-secondary italic">
                                Tenant accounts require admin approval before you can log in.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Username</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="johndoe"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
                        <input
                            type="email"
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest hover:shadow-lg shadow-primary/20 transition-all transform active:scale-95 duration-200 text-xs flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        Sign Up
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-text-secondary">
                    Already have an account?{' '}
                    <Link href="/login">
                        <a className="font-semibold text-primary hover:text-primary-hover transition-colors">Sign in</a>
                    </Link>
                </div>
            </div>
        </div>
    );
}
