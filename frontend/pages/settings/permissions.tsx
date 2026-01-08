import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useLoading } from '../../context/LoadingContext';
import { canAccess, PERMISSIONS, ROLES } from '../../lib/rbac';
import { useRouter } from 'next/router';

// ROLES_LIST removed as it's now dynamic

const PERM_COLUMNS = [
    { id: 'can_view', label: 'View' },
    { id: 'can_add', label: 'Add' },
    { id: 'can_update', label: 'Update' },
    { id: 'can_delete', label: 'Delete' },
    { id: 'can_import', label: 'Import' },
    { id: 'can_export', label: 'Export' }
];

export default function PermissionsPage() {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const { setIsLoading } = useLoading();
    const router = useRouter();
    const [permissions, setPermissions] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState(ROLES.BRANCH_MANAGER);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user && !canAccess(user.role, PERMISSIONS.MODULE_PERMISSIONS, user.permissions)) {
            router.push('/');
        }
    }, [user, router]);

    useEffect(() => {
        fetchRoles();
        fetchPermissions();
        fetchModules();
    }, []);

    const fetchModules = async () => {
        try {
            const res = await api.get('/menus');
            setModules(res.data);
        } catch (error) {
            showNotification('Failed to fetch modules', 'error');
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await api.get('/roles');
            setRoles(res.data.map((r: string) => ({
                id: r,
                label: r.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            })));
        } catch (error) {
            showNotification('Failed to fetch roles', 'error');
        }
    };

    const fetchPermissions = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/permissions');
            setPermissions(res.data);
        } catch (error) {
            showNotification('Failed to fetch permissions', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (role: string, module: string, field: string) => {
        setPermissions(prev => {
            const existing = prev.find(p => p.role === role && p.module === module);
            if (existing) {
                return prev.map(p =>
                    (p.role === role && p.module === module)
                        ? { ...p, [field]: !p[field] }
                        : p
                );
            } else {
                // Initialize new permission object if not found
                return [...prev, { role, module, [field]: true }];
            }
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.post('/permissions/bulk-update', { permissions });
            showNotification('Permissions updated successfully!', 'success');
            // Logic to potentially force re-login or refresh user context could be added here
        } catch (error) {
            showNotification('Failed to save permissions', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!user || user.role !== ROLES.ADMIN) return null;

    return (
        <Layout title="Permissions Management">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-text mb-2">RBAC Control Center</h1>
                        <p className="text-text-secondary text-sm">Configure granular module access and capabilities for system roles.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                    >
                        {isSaving ? (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Save Changes'}
                    </button>
                </div>

                <div className="flex flex-wrap space-x-2 mb-6 p-1 bg-surface border border-border rounded-xl w-fit">
                    {roles.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setSelectedRole(r.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedRole === r.id ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text hover:bg-background'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-background/50 border-b border-border">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary">Module</th>
                                {PERM_COLUMNS.map(col => (
                                    <th key={col.id} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary text-center">{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {modules.map(module => {
                                const perm = permissions.find(p => p.role === selectedRole && p.module === module.module_id) || {
                                    can_view: false, can_add: false, can_update: false, can_delete: false, can_import: false, can_export: false
                                };

                                return (
                                    <tr key={module.id} className="hover:bg-background/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-text group-hover:text-primary transition-colors">{module.label}</p>
                                            <p className="text-[10px] text-text-secondary uppercase tracking-tighter">Module ID: {module.module_id}</p>
                                        </td>
                                        {PERM_COLUMNS.map(col => (
                                            <td key={col.id} className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggle(selectedRole, module.module_id, col.id)}
                                                    disabled={selectedRole === ROLES.ADMIN}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${perm[col.id]
                                                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                                        : 'bg-background text-text-secondary/30 hover:bg-background/80 hover:text-text-secondary'
                                                        } ${selectedRole === ROLES.ADMIN ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {perm[col.id] ? (
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                    )}
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {selectedRole === ROLES.ADMIN && (
                    <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center">
                        <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p className="text-xs text-primary-hover font-medium">Administrator permissions are fixed and cannot be modified to ensure system stability.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
