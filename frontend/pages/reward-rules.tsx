import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

interface RewardRule {
    id: number;
    min_purchase_amount: number;
    max_purchase_amount: number | null;
    reward_type: 'multiplier' | 'fixed' | 'percentage' | 'step';
    points_multiplier: number;
    fixed_points: number | null;
    description: string;
}

interface RewardSettings {
    daily_login_bonus: string;
    enable_rewards: string;
}

export default function RewardRules() {
    const [rules, setRules] = useState<RewardRule[]>([]);
    const [settings, setSettings] = useState<RewardSettings | null>(null);
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/reward-points');
    }, []);

    const fetchRules = async () => {
        try {
            const res = await api.get('/rewards/rules');
            setRules(res.data);
        } catch (err) {
            console.error('Failed to fetch reward rules:', err);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/rewards/settings');
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch reward settings:', err);
        }
    };

    if (loading || !isAuthenticated) return null;

    return (
        <Layout title="Reward Point Rules">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-text mb-2">Reward Point Rules</h1>
                <p className="text-text-secondary mb-8">Earn more points based on your purchase amount!</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rules.map((rule, index) => (
                        <div
                            key={rule.id}
                            className={`bg-gradient-to-br ${index === 0 ? 'from-gray-500/10 to-gray-600/10 border-gray-500/30' :
                                index === 1 ? 'from-amber-700/10 to-amber-800/10 border-amber-700/30' :
                                    index === 2 ? 'from-gray-400/10 to-gray-500/10 border-gray-400/30' :
                                        'from-yellow-500/10 to-yellow-600/10 border-yellow-500/30'
                                } border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-text mb-1">
                                        {rule.description?.split(':')[0] || `Tier ${index + 1}`}
                                    </h3>
                                    <p className="text-sm text-text-secondary">
                                        Starting from ${rule.min_purchase_amount.toFixed(2)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-warning">
                                        {rule.reward_type === 'fixed'
                                            ? `${rule.fixed_points}`
                                            : `${rule.points_multiplier}x`}
                                    </div>
                                    <div className="text-[10px] text-text-secondary uppercase font-bold">
                                        {rule.reward_type === 'fixed' ? 'Fixed Points' : 'Multiplier'}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-background/50 rounded-lg p-4">
                                <p className="text-xs text-text-secondary mb-2">Benefit:</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-text">Purchase ${rule.min_purchase_amount.toFixed(0)}</span>
                                    <span className="text-sm font-bold text-success">
                                        = {rule.reward_type === 'fixed'
                                            ? `${rule.fixed_points}`
                                            : `${Math.floor(Number(rule.min_purchase_amount) * Number(rule.points_multiplier))}`
                                        } points
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 bg-info/10 border border-info/30 rounded-xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-info mb-3">How It Works</h3>
                    <ul className="space-y-2 text-sm text-text-secondary">
                        <li className="flex items-start gap-2">
                            <span className="text-info mt-0.5">✓</span>
                            <span>Points are calculated based on your <strong className="text-text">final purchase amount</strong> after all discounts</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-info mt-0.5">✓</span>
                            <span>Higher purchase amounts earn <strong className="text-text">bonus multipliers</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-info mt-0.5">✓</span>
                            <span>Redeem points anytime: <strong className="text-text">1 point = $1 discount</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-info mt-0.5">✓</span>
                            <span>Plus earn <strong className="text-text">{settings?.daily_login_bonus || '10'} bonus points</strong> for daily login!</span>
                        </li>
                    </ul>
                </div>
            </div>
        </Layout>
    );
}
