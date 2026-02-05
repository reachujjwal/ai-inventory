import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../lib/api';
import Link from 'next/link';

interface RewardWidgetProps {
    className?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
}

export default function RewardPointsWidget({ className = '', period = 'all_time', startDate = '', endDate = '' }: RewardWidgetProps) {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role === 'user') {
            fetchRewardData();
        }
    }, [user, period, startDate, endDate]);

    const fetchRewardData = async () => {
        try {
            const params: any = { period };
            if (period === 'custom' && startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            }

            const [balanceRes, historyRes] = await Promise.all([
                api.get('/rewards/balance', { params }),
                api.get('/rewards/history', { params })
            ]);
            setBalance(balanceRes.data.balance);
            if (Array.isArray(historyRes.data)) {
                setRecentLogs(historyRes.data.slice(0, 3));
            } else if (historyRes.data.data && Array.isArray(historyRes.data.data)) {
                setRecentLogs(historyRes.data.data.slice(0, 3));
            }
        } catch (err) {
            console.error('Failed to fetch reward data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!user || user.role !== 'user') return null;

    if (loading) {
        return (
            <div className={`bg-gradient-to-br from-warning/10 to-primary/10 border border-warning/30 rounded-2xl p-6 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-4 bg-warning/20 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-warning/20 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    const getTypeIcon = (type: string) => {
        const icons: any = {
            login: '🎁',
            purchase: '🛍️',
            redeem: '💰'
        };
        return icons[type] || '📝';
    };

    return (
        <div className={`bg-gradient-to-br from-warning/10 via-primary/10 to-secondary/10 border border-warning/30 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all ${className}`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary mb-1">My Reward Points</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-warning">{balance.toLocaleString()}</span>
                        <span className="text-sm text-text-secondary font-bold">points</span>
                    </div>
                    <p className="text-[10px] text-text-secondary mt-1">= ${balance} discount value</p>
                </div>
                <svg className="w-12 h-12 text-warning/30" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
            </div>

            {recentLogs.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Recent Activity</h4>
                    <div className="space-y-1">
                        {recentLogs.map((log, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-background/50 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">{getTypeIcon(log.type)}</span>
                                    <span className="text-text-secondary capitalize">{log.type}</span>
                                </div>
                                <span className={`font-bold font-mono ${log.points > 0 ? 'text-success' : 'text-warning'}`}>
                                    {log.points > 0 ? '+' : ''}{log.points}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-background/50 rounded-lg px-3 py-2 text-center">
                    <div className="text-xs text-text-secondary font-bold">Login Bonus</div>
                    <div className="text-lg font-black text-info">10 pts</div>
                </div>
                <div className="bg-background/50 rounded-lg px-3 py-2 text-center">
                    <div className="text-xs text-text-secondary font-bold">Per $1 Spent</div>
                    <div className="text-lg font-black text-success">1 pt</div>
                </div>
            </div>

            <Link href="/rewards">
                <a className="block w-full text-center px-4 py-2.5 bg-warning/20 hover:bg-warning/30 border border-warning text-warning font-bold rounded-xl transition-all text-sm uppercase tracking-wide">
                    View Full History →
                </a>
            </Link>
        </div>
    );
}
