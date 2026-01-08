import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { canAccess, hasPermission, PERMISSIONS, ROLES } from '../lib/rbac';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';
import ImportModal from '../components/ImportModal';
import ConfirmModal from '../components/ConfirmModal';
import { exportToCSV } from '../lib/export';
import DataGrid from '../components/DataGrid';
import { useViewMode } from '../hooks/useViewMode';

export default function Coupons() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [editingCoupon, setEditingCoupon] = useState<any>(null);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase_amount: '',
        expires_at: '',
        usage_limit: '',
        status: 'active'
    });
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: number | null, code: string }>({ isOpen: false, id: null, code: '' });

    const { showNotification } = useNotification();
    const { user } = useAuth();
    const router = useRouter();
    const { viewMode, setViewMode } = useViewMode('coupons');

    useEffect(() => {
        if (user && !canAccess(user.role, PERMISSIONS.MODULE_COUPONS, user.permissions)) {
            router.push('/');
        } else if (user) {
            fetchCoupons();
        }
    }, [user]);

    const fetchCoupons = async () => {
        try {
            const res = await api.get('/coupons');
            setCoupons(res.data);
        } catch (err) {
            showNotification('Failed to fetch coupons', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCoupon) {
                await api.put(`/coupons/${editingCoupon.id}`, formData);
                showNotification('Coupon updated successfully', 'success');
            } else {
                await api.post('/coupons', formData);
                showNotification('Coupon created successfully', 'success');
            }
            setIsModalOpen(false);
            setEditingCoupon(null);
            setFormData({
                code: '',
                description: '',
                discount_type: 'percentage',
                discount_value: '',
                min_purchase_amount: '',
                expires_at: '',
                usage_limit: '',
                status: 'active'
            });
            fetchCoupons();
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Action failed', 'error');
        }
    };

    const handleDelete = async (id: number, code: string) => {
        setDeleteModal({ isOpen: true, id, code });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        try {
            await api.delete(`/coupons/${deleteModal.id}`);
            showNotification('Coupon deleted', 'success');
            setDeleteModal({ isOpen: false, id: null, code: '' });
            fetchCoupons();
        } catch (err) {
            showNotification('Failed to delete coupon', 'error');
        }
    };

    const openEditModal = (coupon: any) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            description: coupon.description || '',
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_purchase_amount: coupon.min_purchase_amount || '',
            expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().split('T')[0] : '',
            usage_limit: coupon.usage_limit || '',
            status: coupon.status
        });
        setIsModalOpen(true);
    };

    if (isLoading) return <Layout title="Manage Coupons"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div></Layout>;

    const renderCouponCard = (coupon: any) => {
        const canUpdate = hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_update');
        const canDelete = hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_delete');

        return (
            <div className="bg-surface border border-border rounded-xl shadow-sm hover:shadow-lg transition-all flex flex-col h-[280px] w-full group relative overflow-hidden">
                {/* Decorative top border or accent */}
                <div className={`absolute top-0 left-0 w-full h-1 ${coupon.status === 'active' ? 'bg-success' : 'bg-text-secondary'}`} />

                <div className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-background border border-border/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <span className="font-mono font-bold text-primary tracking-wider border-r border-border pr-2 mr-0">{coupon.code}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(coupon.code);
                                    showNotification('Code copied!', 'success');
                                }}
                                className="text-text-secondary hover:text-primary transition-colors"
                                title="Copy Code"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                            </button>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${coupon.status === 'active'
                                ? 'bg-success/5 text-success border-success/20'
                                : 'bg-text-secondary/5 text-text-secondary border-text-secondary/20'
                            }`}>
                            {coupon.status}
                        </span>
                    </div>

                    <div className="text-center my-auto py-2">
                        <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-1">Save</span>
                        <div className="text-4xl font-black text-text tracking-tight flex items-center justify-center gap-1">
                            {coupon.discount_type === 'percentage' ? (
                                <>
                                    <span>{coupon.discount_value}</span>
                                    <span className="text-2xl text-primary">%</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-2xl text-primary">$</span>
                                    <span>{coupon.discount_value}</span>
                                </>
                            )}
                        </div>
                        {coupon.min_purchase_amount > 0 && (
                            <span className="text-xs text-text-secondary mt-1 block">
                                on orders over ${coupon.min_purchase_amount}
                            </span>
                        )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-dashed border-border flex flex-col gap-3">
                        <div className="flex justify-between items-center text-[10px] text-text-secondary font-medium">
                            <span title="Uses">{coupon.times_used} / {coupon.usage_limit || '∞'} used</span>
                            {coupon.expires_at && <span>Exp: {new Date(coupon.expires_at).toLocaleDateString()}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canUpdate && (
                                <button
                                    onClick={() => openEditModal(coupon)}
                                    className="py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-all"
                                >
                                    Edit
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    onClick={() => handleDelete(coupon.id, coupon.code)}
                                    className="py-1.5 bg-error/10 text-error hover:bg-error hover:text-white rounded-lg text-xs font-bold transition-all"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(searchText.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <Layout title="Manage Coupons">
            <PageHeader
                title="Coupons"
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search coupons..."
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_export') ? (format) => {
                    const filtered = filteredCoupons
                        .map(c => ({
                            Code: c.code,
                            Description: c.description || '',
                            Type: c.discount_type,
                            Value: c.discount_value,
                            'Min Purchase': `$${c.min_purchase_amount}`,
                            'Usage': `${c.times_used}${c.usage_limit ? ` / ${c.usage_limit}` : ''}`,
                            Status: c.status,
                            'Expires At': c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'
                        }));
                    exportToCSV(filtered, 'coupons_export');
                } : undefined}
                action={(hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_add') ||
                    hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_import')) ? (
                    <div className="flex gap-3">
                        {hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_import') && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-surface hover:bg-background text-text border border-border hover:border-primary/50 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center text-sm uppercase tracking-wide"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                Import CSV
                            </button>
                        )}
                        {hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_add') && (
                            <button
                                onClick={() => {
                                    setEditingCoupon(null);
                                    setFormData({
                                        code: '',
                                        description: '',
                                        discount_type: 'percentage',
                                        discount_value: '',
                                        min_purchase_amount: '',
                                        expires_at: '',
                                        usage_limit: '',
                                        status: 'active'
                                    });
                                    setIsModalOpen(true);
                                }}
                                className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0 text-sm uppercase tracking-wide"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                Add Coupon
                            </button>
                        )}
                    </div>
                ) : undefined}
            />

            {viewMode === 'list' ? (
                <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                    <table className="w-full text-left">
                        <thead className="bg-background border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider">Code</th>
                                <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider">Discount</th>
                                <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider">Min Purchase</th>
                                <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider">Usage</th>
                                <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider">Status</th>
                                {(hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_update') || hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_delete')) && (
                                    <th className="px-6 py-4 text-sm font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-text-secondary">No coupons found.</td>
                                </tr>
                            ) : filteredCoupons.map((coupon) => (
                                <tr key={coupon.id} className="hover:bg-background/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded inline-block">{coupon.code}</div>
                                        <p className="text-xs text-text-secondary mt-1">{coupon.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-text">
                                            {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-text">${coupon.min_purchase_amount}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <span className="font-bold text-text">{coupon.times_used}</span>
                                            {coupon.usage_limit ? <span className="text-text-secondary"> / {coupon.usage_limit}</span> : <span className="text-text-secondary"> used</span>}
                                        </div>
                                        {coupon.expires_at && (
                                            <p className="text-[10px] text-text-secondary mt-1">Exp: {new Date(coupon.expires_at).toLocaleDateString()}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${coupon.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {coupon.status}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right space-x-2 ${(!hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_update') && !hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_delete')) ? 'hidden' : ''}`}>
                                        {hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_update') && (
                                            <button onClick={() => openEditModal(coupon)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20" title="Edit Coupon">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                            </button>
                                        )}
                                        {hasPermission(user?.permissions, PERMISSIONS.MODULE_COUPONS, 'can_delete') && (
                                            <button onClick={() => handleDelete(coupon.id, coupon.code)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors border border-transparent hover:border-error/20" title="Delete Coupon">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="pb-10">
                    <DataGrid
                        data={filteredCoupons}
                        renderItem={renderCouponCard}
                    />
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-background/50">
                            <h3 className="text-xl font-bold text-text">{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Coupon Code</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text font-mono"
                                        placeholder="E.g. SUMMER10"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Description</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                        placeholder="10% off on summer collection"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Type</label>
                                    <select
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                        value={formData.discount_type}
                                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Value</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Min Purchase</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                        value={formData.min_purchase_amount}
                                        onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Expiry Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                        value={formData.expires_at}
                                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Usage Limit</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                        placeholder="Unlimited if empty"
                                        value={formData.usage_limit}
                                        onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-1">Status</label>
                                    <select
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 border border-border text-text font-bold rounded-lg hover:bg-background transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-lg hover:shadow-primary/50 transition-all"
                                >
                                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="coupons"
                onImportComplete={fetchCoupons}
            />

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Delete Coupon"
                message={`Are you sure you want to delete the coupon "${deleteModal.code}"?\n\nThis action cannot be undone.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ isOpen: false, id: null, code: '' })}
                confirmLabel="Delete Coupon"
            />
        </Layout>
    );
}
