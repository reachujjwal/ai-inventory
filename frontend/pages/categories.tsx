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
import { canAccess, hasPermission, PERMISSIONS } from '../lib/rbac';
import { exportToCSV, exportToPDF } from '../lib/export';
import { useViewMode } from '../hooks/useViewMode';

export default function Categories() {
    const [categories, setCategories] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();

    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, id: number | null }>({
        isOpen: false,
        id: null
    });
    const [showImportModal, setShowImportModal] = useState(false);
    const { setIsLoading } = useLoading();
    const { viewMode, setViewMode } = useViewMode('categories');

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (isAuthenticated) {
            fetchCategories();
        }
    }, [isAuthenticated, loading, user]);

    const fetchCategories = async () => {
        const res = await api.get('/categories');
        setCategories(res.data);
    };

    const confirmDelete = async () => {
        if (!modalConfig.id) return;
        setIsLoading(true);
        try {
            await api.delete(`/categories/${modalConfig.id}`);
            showNotification('Category deleted successfully', 'success');
            setModalConfig({ isOpen: false, id: null });
            fetchCategories();
        } catch (err) {
            showNotification('Error deleting category', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const actionCellRenderer = ({ data }: any) => {
        if (!hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_delete')) return null;

        return (
            <button
                className="flex items-center text-error hover:bg-error/10 px-2 py-1 rounded transition-colors group"
                onClick={() => setModalConfig({ isOpen: true, id: data.id })}
            >
                <svg className="w-4 h-4 mr-1 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span className="text-xs font-semibold uppercase tracking-tighter">Delete</span>
            </button>
        );
    };

    const columnDefs = [
        { field: 'name', headerName: 'Category Name', flex: 2, sortable: true, cellClass: 'font-semibold' },
        { field: 'description', headerName: 'Description', flex: 3 },
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
            headerName: 'Actions',
            field: 'actions',
            cellRenderer: actionCellRenderer,
            width: 120,
            hide: !hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_delete')
        }
    ];

    if (loading || !isAuthenticated) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    const renderCategoryCard = (category: any) => {
        const canDelete = hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_delete');

        return (
            <div className="bg-surface border border-border rounded-xl shadow-sm hover:shadow-lg transition-all flex flex-col h-[280px] w-full group relative overflow-hidden">
                <div className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                        </div>
                        {canDelete && (
                            <button
                                className="text-text-secondary hover:text-error bg-transparent hover:bg-error/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                onClick={() => setModalConfig({ isOpen: true, id: category.id })}
                                title="Delete Category"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        )}
                    </div>

                    <h3 className="font-bold text-xl text-text mb-2 tracking-tight line-clamp-1" title={category.name}>{category.name}</h3>
                    <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-1 line-clamp-3">{category.description || 'No description provided.'}</p>

                    <div className="border-t border-border pt-4 mt-auto">
                        <div className="flex text-xs text-text-secondary items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            <span>Added {new Date(category.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    // Filter for Grid View
    const filteredCategories = categories.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <Layout title="Category Management">
            <PageHeader
                title="Categories"
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search categories..."
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_export') ? async (format) => {
                    const lowerSearch = searchText.toLowerCase();
                    const filtered = categories
                        .filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lowerSearch)))
                        .map(row => ({
                            'Category Name': row.name,
                            'Description': row.description || '',
                            'Added By': row.created_by_name || 'System',
                            'Added Date': new Date(row.created_at).toLocaleString(),
                            'Updated By': row.updated_by_name || 'N/A',
                            'Updated Date': row.updated_at ? new Date(row.updated_at).toLocaleString() : 'N/A'
                        }));
                    if (format === 'csv') exportToCSV(filtered, 'categories_registry');
                    else await exportToPDF(filtered, 'categories_registry', 'System Category Registry');
                } : undefined}
                action={(hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_add') ||
                    hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_import')) ? (
                    <div className="flex gap-3">
                        {hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_import') && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-surface hover:bg-background text-text border border-border hover:border-primary/50 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center text-sm uppercase tracking-wide"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                Import CSV
                            </button>
                        )}
                        {hasPermission(user?.permissions, PERMISSIONS.MODULE_CATEGORIES, 'can_add') && (
                            <Link href="/categories/add">
                                <a className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                    New Category
                                </a>
                            </Link>
                        )}
                    </div>
                ) : undefined}
            />

            {viewMode === 'list' ? (
                <div className="h-[600px]">
                    <DataTable
                        rowData={categories}
                        columnDefs={columnDefs}
                        searchText={searchText}
                        paginationPageSize={12}
                    />
                </div>
            ) : (
                <div className="pb-10">
                    <DataGrid
                        data={filteredCategories}
                        renderItem={renderCategoryCard}
                    />
                </div>
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title="Delete Category"
                message="Are you sure you want to delete this category? This might affect products linked to it."
                onConfirm={confirmDelete}
                onCancel={() => setModalConfig({ isOpen: false, id: null })}
                confirmLabel="Delete"
            />

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="categories"
                onImportComplete={fetchCategories}
            />
        </Layout>
    );
}
