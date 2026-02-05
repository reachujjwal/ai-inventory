import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';

interface RewardLog {
    id: number;
    points: number;
    type: 'login' | 'purchase' | 'redeem';
    reference_id: string | null;
    created_at: string;
}

export default function Rewards() {
    const [history, setHistory] = useState<RewardLog[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { isAuthenticated, loading, user, refreshUser } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && user?.role !== 'user') {
            router.push('/');
        } else if (isAuthenticated && user?.role === 'user') {
            // Refresh user data first to get latest points
            refreshUser().then(() => {
                fetchRewardData();
            });
        }
    }, [isAuthenticated, loading, user?.role, page]); // Dependency added: page

    const fetchRewardData = async () => {
        try {
            const historyRes = await api.get(`/rewards/history?page=${page}&limit=10`);
            // Handle pagination wrapper
            if (historyRes.data.data) {
                setHistory(historyRes.data.data);
                setTotalPages(historyRes.data.pagination.pages);
            } else {
                setHistory(historyRes.data); // Fallback
            }
        } catch (err) {
            console.error(err);
        }
    };

    const balance = user?.reward_points || 0;

    // Calculate statistics
    const totalEarned = history.filter(h => h.points > 0).reduce((sum, h) => sum + h.points, 0);
    const totalRedeemed = Math.abs(history.filter(h => h.points < 0).reduce((sum, h) => sum + h.points, 0));
    const loginRewards = history.filter(h => h.type === 'login').reduce((sum, h) => sum + h.points, 0);
    const purchaseRewards = history.filter(h => h.type === 'purchase').reduce((sum, h) => sum + h.points, 0);

    const getTypeLabel = (type: string) => {
        const labels: any = {
            login: { label: 'Daily Login', color: 'bg-info/10 text-info border-info/20', icon: '🎁' },
            purchase: { label: 'Purchase Earned', color: 'bg-success/10 text-success border-success/20', icon: '🛍️' },
            redeem: { label: 'Redeemed', color: 'bg-warning/10 text-warning border-warning/20', icon: '💰' }
        };
        return labels[type] || { label: type, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: '📝' };
    };

    if (loading || !isAuthenticated || !user || user.role !== 'user') return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <Layout title="My Rewards">
            <PageHeader
                title="My Rewards"
                searchPlaceholder=""
            />

            {/* Main Balance Card */}
            <div className="mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary mb-2">Available Balance</h3>
                        <div className="text-6xl font-black text-primary mb-2">{balance.toLocaleString()}</div>
                        <p className="text-sm text-text-secondary">points available to redeem</p>
                    </div>
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-primary/20 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-text-secondary uppercase font-bold mb-1">Redemption Value</p>
                        <p className="text-2xl font-black text-primary">${balance.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-text-secondary uppercase font-bold mb-1">Conversion Rate</p>
                        <p className="text-sm text-text-secondary">1 point = $1 discount</p>
                    </div>
                </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-surface border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-text-secondary uppercase">Total Earned</span>
                        <span className="text-2xl">📈</span>
                    </div>
                    <div className="text-3xl font-black text-success">+{totalEarned.toLocaleString()}</div>
                    <div className="text-xs text-text-secondary mt-1">All time earnings</div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5 hover:border-warning/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-text-secondary uppercase">Total Redeemed</span>
                        <span className="text-2xl">💸</span>
                    </div>
                    <div className="text-3xl font-black text-warning">-{totalRedeemed.toLocaleString()}</div>
                    <div className="text-xs text-text-secondary mt-1">All time redemptions</div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5 hover:border-info/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-text-secondary uppercase">Login Rewards</span>
                        <span className="text-2xl">🎁</span>
                    </div>
                    <div className="text-3xl font-black text-info">{loginRewards.toLocaleString()}</div>
                    <div className="text-xs text-text-secondary mt-1">From daily logins</div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5 hover:border-success/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-text-secondary uppercase">Purchase Rewards</span>
                        <span className="text-2xl">🛍️</span>
                    </div>
                    <div className="text-3xl font-black text-success">{purchaseRewards.toLocaleString()}</div>
                    <div className="text-xs text-text-secondary mt-1">From purchases</div>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-lg">
                <div className="px-6 py-4 bg-background/50 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary">Complete Transaction History</h3>
                    <span className="text-xs text-text-secondary bg-background px-3 py-1 rounded-full border border-border">
                        {history.length} {history.length === 1 ? 'transaction' : 'transactions'}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-background/30">
                            <tr className="border-b border-border">
                                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-text-secondary">Date & Time</th>
                                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-text-secondary">Transaction Type</th>
                                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-text-secondary">Reference</th>
                                <th className="px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-text-secondary">Points</th>
                                <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-text-secondary">Balance Impact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                            <p className="text-text-secondary font-medium mb-1">No reward history yet</p>
                                            <p className="text-xs text-text-secondary">Start earning points by logging in daily and making purchases!</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                history.map((log) => {
                                    const typeInfo = getTypeLabel(log.type);
                                    const isEarning = log.points > 0;
                                    return (
                                        <tr key={log.id} className="hover:bg-primary/5 transition-colors">
                                            <td className="px-6 py-4 text-sm text-text">
                                                <div className="font-medium">{new Date(log.created_at).toLocaleDateString()}</div>
                                                <div className="text-xs text-text-secondary">{new Date(log.created_at).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${typeInfo.color}`}>
                                                    <span className="mr-1.5">{typeInfo.icon}</span>
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-text-secondary">
                                                {log.reference_id || <span className="text-text-secondary/50">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-lg font-black text-sm ${isEarning ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                                    {isEarning ? '+' : ''}{log.points}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-base font-black ${isEarning ? 'text-success' : 'text-warning'}`}>
                                                    {isEarning ? '↑' : '↓'} {isEarning ? 'Earned' : 'Spent'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-background/50 border-t border-border flex items-center justify-between">
                        <div className="text-xs text-text-secondary">
                            Page <span className="font-bold text-text">{page}</span> of <span className="font-bold text-text">{totalPages}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-xs font-bold bg-surface border border-border rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1 text-xs font-bold bg-surface border border-border rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
