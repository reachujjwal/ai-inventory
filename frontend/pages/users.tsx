import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import DataGrid from '../components/DataGrid';
import ConfirmModal from '../components/ConfirmModal';
import ImportModal from '../components/ImportModal';
import { useLoading } from '../context/LoadingContext';
import { exportToCSV, exportToPDF } from '../lib/export';
import { canAccess, hasPermission, PERMISSIONS } from '../lib/rbac';
import { useViewMode } from '../hooks/useViewMode';

export default function Users() {
    const [users, setUsers] = useState<any[]>([]);
    const [approveModal, setApproveModal] = useState<{ isOpen: boolean, id: number | null, username: string }>({ isOpen: false, id: null, username: '' });
    const [rejectModal, setRejectModal] = useState<{ isOpen: boolean, id: number | null, username: string }>({ isOpen: false, id: null, username: '' });
    const [pendingTenants, setPendingTenants] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const { isAuthenticated, loading, user: currentUser } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();

    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, id: number | null }>({
        isOpen: false,
        id: null
    });
    const [showImportModal, setShowImportModal] = useState(false);
    const { setIsLoading } = useLoading();
    const { viewMode, setViewMode } = useViewMode('users');

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !canAccess(currentUser?.role, PERMISSIONS.MODULE_USERS, currentUser?.permissions)) {
            router.push('/');
        } else if (isAuthenticated) {
            fetchUsers();
            if (currentUser?.role === 'admin') {
                fetchPendingTenants();
            }
        }
    }, [isAuthenticated, loading, currentUser]);

    const fetchUsers = async () => {
        const res = await api.get('/users');
        setUsers(res.data);
    };

    const fetchPendingTenants = async () => {
        try {
            const res = await api.get('/users/pending-tenants');
            setPendingTenants(res.data);
        } catch (err: any) {
            console.error('Error fetching pending tenants:', err);
        }
    };

    const handleApproveTenant = (id: number, username: string) => {
        setApproveModal({ isOpen: true, id, username });
    };

    const confirmApproveTenant = async () => {
        if (!approveModal.id) return;
        setIsLoading(true);
        try {
            await api.post(`/users/${approveModal.id}/approve`);
            showNotification('Tenant approved successfully', 'success');
            setApproveModal({ isOpen: false, id: null, username: '' });
            fetchPendingTenants();
            fetchUsers();
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Failed to approve tenant', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectTenant = (id: number, username: string) => {
        setRejectModal({ isOpen: true, id, username });
    };

    const confirmRejectTenant = async () => {
        if (!rejectModal.id) return;
        setIsLoading(true);
        try {
            await api.post(`/users/${rejectModal.id}/reject`);
            showNotification('Tenant rejected and removed', 'success');
            setRejectModal({ isOpen: false, id: null, username: '' });
            fetchPendingTenants();
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Failed to reject tenant', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateRole = async (user: any, newRole: string) => {
        try {
            await api.put(`/users/${user.id}`, {
                username: user.username,
                email: user.email,
                role: newRole
            });
            showNotification(`Role updated to ${newRole} for ${user.username}`, 'success');
            fetchUsers();
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Failed to update role', 'error');
        }
    };

    const confirmDelete = async () => {
        if (!modalConfig.id) return;
        setIsLoading(true);
        try {
            await api.delete(`/users/${modalConfig.id}`);
            showNotification('User deleted successfully', 'success');
            setModalConfig({ isOpen: false, id: null });
            fetchUsers();
        } catch (err) {
            showNotification('Error deleting user', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const statusCellRenderer = ({ value }: any) => {
        const isAdmin = value === 'admin';
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${isAdmin ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20'} uppercase tracking-widest`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isAdmin ? 'bg-primary' : 'bg-success'}`}></span>
                {value}
            </span>
        );
    };

    const imageCellRenderer = ({ value, data }: any) => {
        if (!value) {
            return (
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{data.username?.charAt(0).toUpperCase()}</span>
                </div>
            );
        }
        return (
            <img
                src={`http://localhost:5000${value}`}
                alt={data.username}
                className="w-10 h-10 object-cover rounded-full border-2 border-border"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `<div class="w-10 h-10 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center"><span class="text-primary font-bold text-sm">${data.username?.charAt(0).toUpperCase()}</span></div>`;
                }}
            />
        );
    };

    const actionCellRenderer = ({ data }: any) => {
        if (data.id === currentUser?.id) return <span className="text-[10px] font-bold text-text-secondary uppercase">Current Session</span>;

        const canEdit = hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_update');
        const canDelete = hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_delete');

        if (!canEdit && !canDelete) return null;

        return (
            <div className="flex items-center gap-2">
                {canEdit && (
                    <Link href={`/users/edit/${data.id}`}>
                        <a className="px-2 py-1 bg-surface text-text text-[10px] font-bold uppercase rounded border border-border hover:border-primary/50 transition-all shadow-sm">
                            Edit
                        </a>
                    </Link>
                )}
                {canDelete && (
                    <button
                        onClick={() => setModalConfig({ isOpen: true, id: data.id })}
                        className="px-2 py-1 bg-error/10 text-error text-[10px] font-bold uppercase rounded border border-error/20 hover:bg-error hover:text-white transition-all shadow-sm"
                    >
                        Remove
                    </button>
                )}
            </div>
        );
    };

    const columnDefs = [
        { field: 'image_url', headerName: 'Avatar', width: 70, cellRenderer: imageCellRenderer },
        { field: 'username', headerName: 'Username', flex: 1.5, sortable: true, cellClass: 'font-semibold text-text' },
        { field: 'email', headerName: 'Email Address', flex: 2 },
        { field: 'role', headerName: 'Access Level', flex: 1.2, cellRenderer: statusCellRenderer },
        {
            field: 'is_approved',
            headerName: 'Status',
            flex: 0.8,
            cellRenderer: ({ value, data }: any) => {
                if (data.role !== 'tenant') return null;
                const isApproved = value === 1;
                return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${isApproved
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-warning/10 text-warning border-warning/20'
                        } uppercase tracking-widest`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isApproved ? 'bg-success' : 'bg-warning'}`}></span>
                        {isApproved ? 'Approved' : 'Pending'}
                    </span>
                );
            }
        },
        { field: 'created_by_name', headerName: 'Added By', flex: 1, cellClass: 'text-[10px] uppercase font-bold text-text-secondary' },
        {
            field: 'created_at', headerName: 'Added Date', flex: 1.2, cellRenderer: ({ value }: any) => (
                <div className="flex flex-col py-1">
                    <span className="text-[10px] font-bold">{new Date(value).toLocaleDateString()}</span>
                    <span className="text-[9px] text-text-secondary uppercase">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )
        },
        { field: 'updated_by_name', headerName: 'Updated By', flex: 1, cellClass: 'text-[10px] uppercase font-bold text-text-secondary' },
        {
            field: 'updated_at', headerName: 'Updated Date', flex: 1.2, cellRenderer: ({ value }: any) => value ? (
                <div className="flex flex-col py-1">
                    <span className="text-[10px] font-bold">{new Date(value).toLocaleDateString()}</span>
                    <span className="text-[9px] text-text-secondary uppercase">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            ) : <span className="text-[10px] text-text-secondary">N/A</span>
        },
        {
            headerName: 'Operations',
            field: 'actions',
            cellRenderer: actionCellRenderer,
            width: 120,
            hide: !hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_update') &&
                !hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_delete')
        }
    ];

    if (loading || !isAuthenticated || !canAccess(currentUser?.role, PERMISSIONS.MODULE_USERS, currentUser?.permissions)) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    const renderUserCard = (userData: any) => {
        const canEdit = hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_update');
        const canDelete = hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_delete');
        const isCurrentUser = userData.id === currentUser?.id;

        return (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 h-[220px] w-full group relative overflow-hidden">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {userData.image_url ? (
                            <img
                                src={`http://localhost:5000${userData.image_url}`}
                                alt={userData.username}
                                className="w-12 h-12 rounded-full object-cover border-2 border-border"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`;
                                }}
                            />
                        ) : (
                            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-lg font-bold text-primary">
                                {userData.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-text text-lg leading-tight">{userData.username}</h3>
                            <p className="text-xs text-text-secondary">{userData.email}</p>
                        </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${userData.role === 'admin' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-secondary/5 text-secondary border-secondary/20'}`}>
                        {userData.role}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-y border-border py-3 my-1">
                    <div>
                        <span className="text-text-secondary block mb-0.5 uppercase tracking-wide text-[10px] font-bold">Added By</span>
                        <span className="font-medium text-text">{userData.created_by_name || 'System'}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-text-secondary block mb-0.5 uppercase tracking-wide text-[10px] font-bold">Joined</span>
                        <span className="font-medium text-text">{new Date(userData.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-auto pt-3 border-t border-border/50">
                    <div>
                        {userData.role === 'tenant' && (
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${userData.is_approved ? 'bg-success/5 text-success border border-success/20' : 'bg-warning/5 text-warning border border-warning/20'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${userData.is_approved ? 'bg-success' : 'bg-warning'}`}></span>
                                {userData.is_approved ? 'Approved' : 'Pending'}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {isCurrentUser ? (
                            <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary uppercase">You</span>
                        ) : (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(canEdit || canDelete) && (
                                    <>
                                        {canEdit && (
                                            <Link href={`/users/edit/${userData.id}`}>
                                                <a className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/5 rounded transition-colors" title="Edit User">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                </a>
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => setModalConfig({ isOpen: true, id: userData.id })}
                                                className="p-1.5 text-text-secondary hover:text-error hover:bg-error/5 rounded transition-colors"
                                                title="Remove User"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };



    // Filter for Grid View
    const filteredUsers = users.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <Layout title="Access Control">
            <PageHeader
                title="Users"
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search system users..."
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_export') ? async (format) => {
                    const lowerSearch = searchText.toLowerCase();
                    const filtered = users
                        .filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lowerSearch)))
                        .map(row => ({
                            Username: row.username,
                            Email: row.email,
                            Role: row.role.toUpperCase(),
                            'Added By': row.created_by_name || 'System',
                            'Added Date': new Date(row.created_at).toLocaleString(),
                            'Updated By': row.updated_by_name || 'N/A',
                            'Updated Date': row.updated_at ? new Date(row.updated_at).toLocaleString() : 'N/A'
                        }));
                    if (format === 'csv') exportToCSV(filtered, 'users_list');
                    else await exportToPDF(filtered, 'users_list', 'User Access Registry');
                } : undefined}
                action={(hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_add') ||
                    hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_import')) ? (
                    <div className="flex gap-3">
                        {hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_import') && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-surface hover:bg-background text-text border border-border hover:border-primary/50 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center text-sm uppercase tracking-wide"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                Import CSV
                            </button>
                        )}
                        {hasPermission(currentUser?.permissions, PERMISSIONS.MODULE_USERS, 'can_add') && (
                            <Link href="/users/add">
                                <a className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0 text-sm uppercase tracking-wide">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                                    Create User
                                </a>
                            </Link>
                        )}
                    </div>
                ) : undefined}
            />

            {/* Pending Tenant Approvals Section (Admin Only) */}
            {currentUser?.role === 'admin' && pendingTenants.length > 0 && (
                <div className="mb-6 bg-surface border border-border rounded-xl p-6 shadow-lg">
                    <div className="flex items-center mb-4">
                        <svg className="w-6 h-6 text-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h3 className="text-lg font-bold text-text">Pending Tenant Approvals</h3>
                        <span className="ml-3 px-2.5 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-full text-xs font-bold">
                            {pendingTenants.length}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingTenants.map((tenant) => (
                            <div key={tenant.id} className="bg-background border border-border rounded-lg p-4 hover:border-primary/50 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-text mb-1">{tenant.username}</h4>
                                        <p className="text-sm text-text-secondary">{tenant.email}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded text-[10px] font-bold uppercase">
                                        Tenant
                                    </span>
                                </div>
                                <div className="text-xs text-text-secondary mb-4">
                                    <div className="flex items-center">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        Registered: {new Date(tenant.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApproveTenant(tenant.id, tenant.username)}
                                        className="flex-1 px-3 py-2 bg-success/10 text-success border border-success/20 hover:bg-success hover:text-white rounded-lg text-xs font-bold uppercase transition-all"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleRejectTenant(tenant.id, tenant.username)}
                                        className="flex-1 px-3 py-2 bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white rounded-lg text-xs font-bold uppercase transition-all"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'list' ? (
                <div className="h-[600px]">
                    <DataTable
                        rowData={users}
                        columnDefs={columnDefs}
                        searchText={searchText}
                        paginationPageSize={12}
                    />
                </div>
            ) : (
                <div className="pb-10">
                    <DataGrid
                        data={filteredUsers}
                        renderItem={renderUserCard}
                    />
                </div>
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title="Remove User"
                message="Are you sure you want to remove this user from the system? They will lose all access immediately."
                onConfirm={confirmDelete}
                onCancel={() => setModalConfig({ isOpen: false, id: null })}
                confirmLabel="Remove User"
            />

            <ConfirmModal
                isOpen={approveModal.isOpen}
                title="Approve Tenant Account"
                message={`Are you sure you want to approve the tenant account for "${approveModal.username}"?\n\nThis will grant them access to manage their products, inventory, and orders.`}
                onConfirm={confirmApproveTenant}
                onCancel={() => setApproveModal({ isOpen: false, id: null, username: '' })}
                confirmLabel="Approve Tenant"
            />

            <ConfirmModal
                isOpen={rejectModal.isOpen}
                title="Reject Tenant Account"
                message={`Are you sure you want to reject the tenant account for "${rejectModal.username}"?\n\nThis will permanently delete their account and they will need to register again.`}
                onConfirm={confirmRejectTenant}
                onCancel={() => setRejectModal({ isOpen: false, id: null, username: '' })}
                confirmLabel="Reject & Delete"
            />

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="users"
                onImportComplete={fetchUsers}
            />
        </Layout>
    );
}
