import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import { useNotification } from '../../context/NotificationContext';
import PageHeader from '../../components/PageHeader';
import ConfirmModal from '../../components/ConfirmModal';
import { canAccess, hasPermission, PERMISSIONS } from '../../lib/rbac';

interface RewardRule {
    id: number;
    min_purchase_amount: number;
    max_purchase_amount: number | null;
    reward_type: 'multiplier' | 'fixed' | 'percentage' | 'step';
    points_multiplier: number;
    fixed_points: number | null;
    description: string;
    is_active: number;
}

interface RewardSettings {
    daily_login_bonus: string;
    min_redemption_points: string;
    points_expiry_days: string;
    enable_rewards: string;
}

export default function RewardConfiguration() {
    const [activeTab, setActiveTab] = useState<'rules' | 'settings' | 'history'>('rules');
    const [rules, setRules] = useState<RewardRule[]>([]);
    const [allHistory, setAllHistory] = useState<any[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [historyFilter, setHistoryFilter] = useState('all');
    const [historySearch, setHistorySearch] = useState('');

    const [settings, setSettings] = useState<RewardSettings>({
        daily_login_bonus: '10',
        min_redemption_points: '1',
        points_expiry_days: '0',
        enable_rewards: '1'
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingRule, setEditingRule] = useState<RewardRule | null>(null);
    const [formData, setFormData] = useState({
        min_purchase_amount: '',
        max_purchase_amount: '',
        reward_type: 'multiplier' as 'multiplier' | 'fixed' | 'percentage' | 'step',
        points_multiplier: '1.0',
        fixed_points: '',
        description: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: number | null, description: string }>({ isOpen: false, id: null, description: '' });
    const { user, isAuthenticated, loading, refreshUser } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !canAccess(user?.role, PERMISSIONS.MODULE_REWARDS, user?.permissions)) {
            router.push('/');
        } else if (isAuthenticated) {
            // Refresh user data to get latest reward points
            refreshUser();
            fetchRules();
            fetchSettings();
        }
    }, [isAuthenticated, loading, user?.role]);

    // Fetch history when related state changes
    useEffect(() => {
        if (isAuthenticated && activeTab === 'history') {
            const timer = setTimeout(() => {
                fetchHistory();
            }, 300); // 300ms debounce for search
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, activeTab, historyPage, historyFilter, historySearch]);

    const fetchRules = async () => {
        try {
            const res = await api.get('/rewards/rules');
            setRules(res.data);
        } catch (err) {
            showNotification('Failed to fetch reward rules', 'error');
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/rewards/settings');
            setSettings(res.data);
        } catch (err) {
            showNotification('Failed to fetch settings', 'error');
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/rewards/history/all', {
                params: {
                    page: historyPage,
                    limit: 10,
                    type: historyFilter,
                    search: historySearch
                }
            });
            // Handle both old array format (fallback) and new paginated format
            if (res.data.data) {
                setAllHistory(res.data.data);
                setHistoryTotalPages(res.data.pagination.pages);
            } else {
                setAllHistory(res.data); // Legacy fallback
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const data = {
                ...formData,
                min_purchase_amount: parseFloat(formData.min_purchase_amount),
                max_purchase_amount: formData.max_purchase_amount ? parseFloat(formData.max_purchase_amount) : null,
                points_multiplier: formData.reward_type === 'multiplier' ? parseFloat(formData.points_multiplier) : 1.0,
                fixed_points: formData.reward_type === 'fixed' ? parseInt(formData.fixed_points) : null
            };

            if (editingRule) {
                await api.put(`/rewards/rules/${editingRule.id}`, { ...data, is_active: editingRule.is_active });
                showNotification('Rule updated successfully', 'success');
            } else {
                await api.post('/rewards/rules', data);
                showNotification('Rule created successfully', 'success');
            }

            setFormData({
                min_purchase_amount: '',
                max_purchase_amount: '',
                reward_type: 'multiplier',
                points_multiplier: '1.0',
                fixed_points: '',
                description: ''
            });
            setIsEditing(false);
            setEditingRule(null);
            fetchRules();
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Failed to save rule', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (rule: RewardRule) => {
        setEditingRule(rule);
        setFormData({
            min_purchase_amount: rule.min_purchase_amount.toString(),
            max_purchase_amount: rule.max_purchase_amount?.toString() || '',
            reward_type: rule.reward_type,
            points_multiplier: rule.points_multiplier.toString(),
            fixed_points: rule.fixed_points?.toString() || '',
            description: rule.description
        });
        setIsEditing(true);
    };

    const handleDelete = async (id: number, description: string) => {
        setDeleteModal({ isOpen: true, id, description });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        try {
            await api.delete(`/rewards/rules/${deleteModal.id}`);
            showNotification('Rule deleted successfully', 'success');
            setDeleteModal({ isOpen: false, id: null, description: '' });
            fetchRules();
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Failed to delete rule', 'error');
        }
    };

    const toggleActive = async (rule: RewardRule) => {
        try {
            await api.put(`/rewards/rules/${rule.id}`, {
                ...rule,
                is_active: rule.is_active ? 0 : 1
            });
            showNotification('Rule status updated', 'success');
            fetchRules();
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Failed to update status', 'error');
        }
    };

    const handleSettingsUpdate = async () => {
        setIsSaving(true);
        try {
            await api.put('/rewards/settings', settings);
            showNotification('Settings updated successfully', 'success');
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Failed to update settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !isAuthenticated) return null;

    return (
        <Layout title="Reward Points Configuration">
            <PageHeader title="Reward Points Configuration" searchPlaceholder="" />

            {/* Current Balance Card for Users */}
            {user?.role === 'user' && user?.reward_points !== undefined && (
                <div className="mb-6 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Your Reward Balance</p>
                            <p className="text-4xl font-black text-primary">{user.reward_points}</p>
                            <p className="text-xs text-text-secondary mt-1">points available</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`px-6 py-3 font-bold rounded-lg transition-all ${activeTab === 'rules'
                        ? 'bg-primary text-white shadow-lg'
                        : 'bg-surface border border-border text-text-secondary hover:text-text'
                        }`}
                >
                    Purchase Tier Rules
                </button>
                {user?.role !== 'user' && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-3 font-bold rounded-lg transition-all ${activeTab === 'settings'
                            ? 'bg-primary text-white shadow-lg'
                            : 'bg-surface border border-border text-text-secondary hover:text-text'
                            }`}
                    >
                        General Settings
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 font-bold rounded-lg transition-all ${activeTab === 'history'
                        ? 'bg-primary text-white shadow-lg'
                        : 'bg-surface border border-border text-text-secondary hover:text-text'
                        }`}
                >
                    Reward History
                </button>
            </div>

            {activeTab === 'rules' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Section */}
                    {hasPermission(user?.permissions, PERMISSIONS.MODULE_REWARDS, 'can_add') && (
                        <div className="lg:col-span-1">
                            <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg sticky top-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary mb-6">
                                    {isEditing ? 'Edit Tier Rule' : 'Add New Tier'}
                                </h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-2">Min Purchase ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.min_purchase_amount}
                                            onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-2">Max Purchase ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.max_purchase_amount}
                                            onChange={(e) => setFormData({ ...formData, max_purchase_amount: e.target.value })}
                                            placeholder="Leave empty for unlimited"
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-2">Reward Type</label>
                                        <select
                                            value={formData.reward_type}
                                            onChange={(e) => setFormData({ ...formData, reward_type: e.target.value as 'multiplier' | 'fixed' })}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                            required
                                        >
                                            <option value="multiplier">Points Multiplier (e.g., 2 points per $1)</option>
                                            <option value="percentage">Percentage Cashback (e.g., 5% back as points)</option>
                                            <option value="fixed">Fixed Points (Flat amount for range)</option>
                                            <option value="step">Points per $100 Spent (e.g., 50 pts per $100)</option>
                                        </select>
                                    </div>
                                    {formData.reward_type === 'multiplier' || formData.reward_type === 'percentage' ? (
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary mb-2">
                                                {formData.reward_type === 'percentage' ? 'Percentage (%)' : 'Points Multiplier'}
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.points_multiplier}
                                                onChange={(e) => setFormData({ ...formData, points_multiplier: e.target.value })}
                                                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary mb-2">Fixed Points reward</label>
                                            <input
                                                type="number"
                                                value={formData.fixed_points}
                                                onChange={(e) => setFormData({ ...formData, fixed_points: e.target.value })}
                                                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                                required
                                            />
                                            {formData.reward_type === 'step' && (
                                                <p className="text-[10px] text-text-secondary mt-1 italic">
                                                    User gets these points for every $100 spent in this range.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-2">Description</label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="e.g., Gold: 3 points per $1"
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : (
                                                isEditing ? 'Update' : 'Create'
                                            )}
                                        </button>
                                        {isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setEditingRule(null);
                                                    setFormData({
                                                        min_purchase_amount: '',
                                                        max_purchase_amount: '',
                                                        reward_type: 'multiplier',
                                                        points_multiplier: '1.0',
                                                        fixed_points: '',
                                                        description: ''
                                                    });
                                                }}
                                                className="px-4 py-2 bg-background border border-border text-text font-bold rounded-lg hover:bg-surface transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Rules List */}
                    <div className={hasPermission(user?.permissions, PERMISSIONS.MODULE_REWARDS, 'can_add') ? "lg:col-span-2" : "lg:col-span-3"}>
                        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-lg">
                            <div className="px-6 py-4 bg-background/50 border-b border-border">
                                <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary">Purchase Tier Rules</h3>
                            </div>
                            <div className="divide-y divide-border">
                                {rules.map((rule) => {
                                    const canUpdate = hasPermission(user?.permissions, PERMISSIONS.MODULE_REWARDS, 'can_update');
                                    const canDelete = hasPermission(user?.permissions, PERMISSIONS.MODULE_REWARDS, 'can_delete');
                                    return (
                                        <div key={rule.id} className={`p-6 ${!rule.is_active ? 'opacity-50' : ''}`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-bold text-text mb-1">{rule.description}</h4>
                                                    <p className="text-sm text-text-secondary mb-3">
                                                        Min. Purchase: ${Number(rule.min_purchase_amount).toFixed(2)} {rule.max_purchase_amount ? `(Up to $${Number(rule.max_purchase_amount).toFixed(2)})` : '+'}
                                                    </p>
                                                    <div className="inline-flex items-center px-3 py-1 bg-warning/20 border border-warning rounded-full">
                                                        <span className="text-xs font-bold text-warning">
                                                            {rule.reward_type === 'fixed'
                                                                ? `${rule.fixed_points} Fixed Points`
                                                                : `${Number(rule.points_multiplier)}x Multiplier`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleActive(rule)}
                                                        disabled={!canUpdate}
                                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${rule.is_active
                                                            ? 'bg-success/20 text-success border border-success/30'
                                                            : 'bg-gray-500/20 text-gray-500 border border-gray-500/30'
                                                            } ${!canUpdate ? 'cursor-not-allowed opacity-50' : ''}`}
                                                    >
                                                        {rule.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                    {canUpdate && (
                                                        <button
                                                            onClick={() => handleEdit(rule)}
                                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(rule.id, rule.description)}
                                                            className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && user?.role !== 'user' && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-surface border border-border rounded-2xl p-8 shadow-lg">
                        <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary mb-6">General Reward Settings</h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-text mb-2">Daily Login Bonus (Points)</label>
                                <input
                                    type="number"
                                    value={settings.daily_login_bonus}
                                    onChange={(e) => setSettings({ ...settings, daily_login_bonus: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                />
                                <p className="text-xs text-text-secondary mt-1">Points awarded to users on their first login each day</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text mb-2">Minimum Redemption Points</label>
                                <input
                                    type="number"
                                    value={settings.min_redemption_points}
                                    onChange={(e) => setSettings({ ...settings, min_redemption_points: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                />
                                <p className="text-xs text-text-secondary mt-1">Minimum points required to redeem at checkout</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text mb-2">Points Expiry (Days)</label>
                                <input
                                    type="number"
                                    value={settings.points_expiry_days}
                                    onChange={(e) => setSettings({ ...settings, points_expiry_days: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                />
                                <p className="text-xs text-text-secondary mt-1">Days until points expire (0 = never expire)</p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                                <div>
                                    <div className="text-sm font-bold text-text">Enable Reward System</div>
                                    <div className="text-xs text-text-secondary mt-1">Turn the entire reward points system on/off</div>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, enable_rewards: settings.enable_rewards === '1' ? '0' : '1' })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enable_rewards === '1' ? 'bg-success' : 'bg-gray-500'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enable_rewards === '1' ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {hasPermission(user?.permissions, PERMISSIONS.MODULE_REWARDS, 'can_update') && (
                                <button
                                    onClick={handleSettingsUpdate}
                                    disabled={isSaving}
                                    className="w-full px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Settings'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-lg">
                    <div className="px-6 py-4 bg-background/50 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary">Transactions</h3>

                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            {/* Filter Type */}
                            <select
                                value={historyFilter}
                                onChange={(e) => {
                                    setHistoryFilter(e.target.value);
                                    setHistoryPage(1); // Reset to page 1 on filter change
                                }}
                                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                            >
                                <option value="all">All Types</option>
                                <option value="purchase">Purchase</option>
                                <option value="login">Login Bonus</option>
                                <option value="redeem">Redeemed</option>
                            </select>

                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search user or ref..."
                                    value={historySearch}
                                    onChange={(e) => {
                                        setHistorySearch(e.target.value);
                                        setHistoryPage(1);
                                    }}
                                    className="pl-8 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text w-full md:w-64"
                                />
                                <svg className="w-4 h-4 text-text-secondary absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-background/30">
                                <tr className="border-b border-border">
                                    <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-text-secondary">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-text-secondary">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-text-secondary">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-text-secondary">Reference</th>
                                    <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-text-secondary">Points</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {allHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">
                                            No reward transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    allHistory.map((log) => (
                                        <tr key={log.id} className="hover:bg-primary/5 transition-colors">
                                            <td className="px-6 py-4 text-sm text-text-secondary">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-text">{log.user_name}</div>
                                                <div className="text-[10px] text-text-secondary">{log.user_email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${log.type === 'purchase' || log.type === 'login' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
                                                    }`}>
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-text-secondary">
                                                {log.reference_id || '-'}
                                            </td>
                                            <td className={`px-6 py-4 text-right text-sm font-black ${log.points > 0 ? 'text-success' : 'text-warning'}`}>
                                                {log.points > 0 ? '+' : ''}{log.points}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="px-6 py-4 bg-background/50 border-t border-border flex items-center justify-between">
                        <div className="text-xs text-text-secondary">
                            Page <span className="font-bold text-text">{historyPage}</span> of <span className="font-bold text-text">{historyTotalPages || 1}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                disabled={historyPage === 1}
                                className="px-3 py-1 text-xs font-bold bg-surface border border-border rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                                disabled={historyPage >= historyTotalPages}
                                className="px-3 py-1 text-xs font-bold bg-surface border border-border rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Delete Reward Rule"
                message={`Are you sure you want to delete this reward rule?\n\n"${deleteModal.description}"\n\nThis action cannot be undone.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ isOpen: false, id: null, description: '' })}
                confirmLabel="Delete Rule"
            />
        </Layout>
    );
}
