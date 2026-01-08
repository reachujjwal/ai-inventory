import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLoading } from '../context/LoadingContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const router = useRouter();
    const [error, setError] = useState('');
    const { setIsLoading, isLoading } = useLoading();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            login(res.data.token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl p-8 transform transition-all hover:scale-[1.01]">
                <h2 className="text-2xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary uppercase tracking-widest">
                    AI Inventory
                </h2>

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm font-medium flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-2">Email Address</label>
                        <input
                            type="email"
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-text placeholder-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-semibold"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-text placeholder-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-semibold"
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
                        Sign In
                    </button>
                </form>

                {/* <div className="mt-8 p-4 rounded-xl bg-background/50 border border-border/50 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-2">Reference Credentials</p>
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-mono text-text"><span className="opacity-40">Email:</span> admin@gmail.com</p>
                        <p className="text-xs font-mono text-text"><span className="opacity-40">Pass:</span> admin123</p>
                    </div>
                </div> */}

                <div className="mt-6 text-center text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                    Don't have an account?{' '}
                    <Link href="/signup">
                        <a className="text-primary hover:text-primary-hover transition-colors ml-1 underline underline-offset-4">Create account</a>
                    </Link>
                </div>
            </div>
        </div>
    );
}
