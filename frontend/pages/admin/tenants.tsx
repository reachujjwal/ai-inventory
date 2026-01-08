import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function TenantApproval() {
    const { user, isAuthenticated } = useAuth();
    const { showNotification } = useNotification();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            fetchPendingTenants();
        }
    }, [isAuthenticated, user]);

    const fetchPendingTenants = async () => {
        try {
            const res = await api.get('/admin/tenants/pending');
            setTenants(res.data);
        } catch (error) {
            console.error(error);
            showNotification('Failed to fetch pending tenants', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await api.put(`/admin/tenants/${id}/approve`);
            showNotification('Tenant approved successfully', 'success');
            fetchPendingTenants();
        } catch (error) {
            showNotification('Failed to approve tenant', 'error');
        }
    };

    const handleReject = async (id: number) => {
        if (!confirm('Are you sure you want to reject and remove this tenant application?')) return;
        try {
            await api.delete(`/admin/tenants/${id}`);
            showNotification('Tenant rejected successfully', 'success');
            fetchPendingTenants();
        } catch (error) {
            showNotification('Failed to reject tenant', 'error');
        }
    };

    if (!isAuthenticated || user?.role !== 'admin') {
        return <Layout title="Access Denied"><div className="p-8 text-center text-error">Access Denied</div></Layout>;
    }

    return (
        <Layout title="Tenant Approval">
            <div className="max-w-6xl mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-text mb-2">Tenant Approvals</h1>
                        <p className="text-text-secondary">Review and approve new tenant registration requests.</p>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-8 text-center text-text-secondary">Loading...</div>
                    ) : tenants.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-text mb-2">No Pending Requests</h3>
                            <p className="text-text-secondary">There are no new tenant applications to review at this time.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border bg-background/50 text-xs uppercase text-text-secondary font-semibold tracking-wider">
                                        <th className="px-6 py-4">Tenant Info</th>
                                        <th className="px-6 py-4">Registered Date</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {tenants.map((tenant) => (
                                        <tr key={tenant.id} className="hover:bg-background/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-3">
                                                        {tenant.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-text">{tenant.username}</div>
                                                        <div className="text-sm text-text-secondary">{tenant.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-text-secondary text-sm">
                                                {new Date(tenant.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleReject(tenant.id)}
                                                    className="px-3 py-1.5 text-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(tenant.id)}
                                                    className="px-3 py-1.5 text-sm font-medium bg-success/10 text-success hover:bg-success/20 rounded-lg transition-colors border border-success/20"
                                                >
                                                    Approve
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
