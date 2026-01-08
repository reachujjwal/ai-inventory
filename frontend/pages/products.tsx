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
import { canAccess, hasPermission, PERMISSIONS, ROLES } from '../lib/rbac';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useViewMode } from '../hooks/useViewMode';

export default function Products() {
    const [products, setProducts] = useState<any[]>([]);
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
    const { addToCart } = useCart();
    const { addToWishlist } = useWishlist();
    const { viewMode, setViewMode } = useViewMode('products');

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (isAuthenticated) {
            fetchProducts();
        }
    }, [isAuthenticated, loading, user]);

    const fetchProducts = async () => {
        const res = await api.get('/products');
        setProducts(res.data);
    };

    const confirmDelete = async () => {
        if (!modalConfig.id) return;
        setIsLoading(true);
        try {
            await api.delete(`/products/${modalConfig.id}`);
            showNotification('Product deleted successfully', 'success');
            setModalConfig({ isOpen: false, id: null });
            fetchProducts();
        } catch (err) {
            showNotification('Error deleting product', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const actionCellRenderer = ({ data }: any) => {
        const canEdit = hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_update');
        const canDelete = hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_delete');

        return (
            <div className="flex items-center gap-3">
                <button
                    onClick={() => addToCart(data)}
                    disabled={data.stock_level <= 0}
                    className={`p-1.5 rounded transition-colors ${data.stock_level > 0 ? 'text-primary hover:bg-primary/10' : 'text-text-secondary cursor-not-allowed opacity-50'}`}
                    title={data.stock_level > 0 ? "Add to Cart" : "Out of Stock"}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </button>
                <button
                    onClick={() => addToWishlist(data.id)}
                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    title="Add to Wishlist"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                </button>
                {canEdit && (
                    <Link href={`/products/edit/${data.id}`}>
                        <a className="text-primary hover:text-primary-hover font-bold text-xs uppercase tracking-widest">Edit</a>
                    </Link>
                )}
                {canDelete && (
                    <button
                        onClick={() => setModalConfig({ isOpen: true, id: data.id })}
                        className="text-error hover:text-red-600 font-bold text-xs uppercase tracking-widest"
                    >
                        Delete
                    </button>
                )}
            </div>
        );
    };

    const imageCellRenderer = ({ value }: any) => {
        if (!value) {
            return (
                <div className="w-10 h-10 bg-background border border-border rounded flex items-center justify-center">
                    <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                </div>
            );
        }
        return (
            <img
                src={`http://localhost:5000${value}`}
                alt="Product"
                className="w-10 h-10 object-cover rounded border border-border"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ddd" width="40" height="40"/%3E%3C/svg%3E';
                }}
            />
        );
    };

    const columnDefs = [
        { field: 'image_url', headerName: 'Image', width: 70, cellRenderer: imageCellRenderer },
        { field: 'sku', headerName: 'SKU', width: 100, sortable: true, cellClass: 'font-mono text-[10px]' },
        { field: 'name', headerName: 'Product Name', flex: 2, sortable: true, cellClass: 'font-semibold text-text' },
        { field: 'category_name', headerName: 'Category', flex: 1, cellClass: 'text-text-secondary' },
        { field: 'price', headerName: 'Price', width: 100, cellRenderer: ({ value }: any) => <span className="font-mono font-bold">${value}</span> },
        { field: 'stock_level', headerName: 'Stock', width: 80, cellClass: 'font-black text-center' },
        {
            field: 'created_by_name',
            headerName: 'Seller',
            flex: 1,
            cellRenderer: ({ value }: any) => value ? (
                <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span className="text-[10px] font-bold text-text uppercase tracking-wide">{value}</span>
                </div>
            ) : <span className="text-[10px] text-text-secondary">System</span>
        },
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
            width: 180,
            hide: false
        }
    ];

    if (loading || !isAuthenticated) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    const renderProductCard = (product: any) => {
        const canEdit = hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_update');
        const canDelete = hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_delete');

        return (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 w-full flex flex-col h-[360px] group">
                <div className="relative h-[180px] w-full bg-white flex items-center justify-center overflow-hidden group-hover:bg-gray-50 transition-colors">
                    <img
                        src={`http://localhost:5000${product.image_url}`}
                        alt={product.name}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ddd" width="40" height="40"/%3E%3C/svg%3E';
                        }}
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                        <button
                            onClick={() => addToWishlist(product.id)}
                            className="p-1.5 bg-surface/90 backdrop-blur-sm rounded-full text-text-secondary hover:text-primary shadow-sm hover:shadow transition-all transform hover:scale-110 border border-border/50"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                        </button>
                    </div>
                    {product.stock_level <= 0 && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="px-3 py-1 bg-error text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">Out of Stock</span>
                        </div>
                    )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-primary/5 px-2 py-0.5 rounded text-primary">
                            {product.category_name || 'Uncategorized'}
                        </div>
                        <div className="font-mono text-[10px] text-text-secondary">{product.sku}</div>
                    </div>

                    <h3 className="font-bold text-lg text-text mb-1 line-clamp-2 leading-tight">{product.name}</h3>

                    <div className="flex items-end justify-between mt-auto pt-4 border-t border-border/50">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Price</span>
                            <span className="text-xl font-black text-primary">${product.price}</span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => addToCart(product)}
                                disabled={product.stock_level <= 0}
                                className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95"
                                title="Add to Cart"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            </button>

                            {canEdit && (
                                <Link href={`/products/edit/${product.id}`}>
                                    <a className="p-2 bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary rounded-lg transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </a>
                                </Link>
                            )}

                            {canDelete && (
                                <button
                                    onClick={() => setModalConfig({ isOpen: true, id: product.id })}
                                    className="p-2 bg-surface border border-border text-text-secondary hover:text-error hover:border-error rounded-lg transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    // Filter products for display in grid (DataTable does its own filtering usually, but we need to filter for Grid)
    const filteredProducts = products.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <Layout title="Product Inventory">
            <PageHeader
                title="Products"
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search products..."
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_export') ? async (format) => {
                    const lowerSearch = searchText.toLowerCase();
                    const filtered = products
                        .filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lowerSearch)))
                        .map(row => ({
                            SKU: row.sku,
                            'Product Name': row.name,
                            Category: row.category_name || 'Uncategorized',
                            Price: `$${row.price}`,
                            Stock: row.stock_level,
                            'Added By': row.created_by_name || 'System',
                            'Added Date': new Date(row.created_at).toLocaleString(),
                            'Updated By': row.updated_by_name || 'N/A',
                            'Updated Date': row.updated_at ? new Date(row.updated_at).toLocaleString() : 'N/A'
                        }));
                    if (format === 'csv') exportToCSV(filtered, 'products_export');
                    else await exportToPDF(filtered, 'products_export', 'Product Catalogue Registry');
                } : undefined}
                action={(hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_add') ||
                    hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_import')) ? (
                    <div className="flex gap-3">
                        {hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_import') && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-surface hover:bg-background text-text border border-border hover:border-primary/50 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center text-sm uppercase tracking-wide"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                Import CSV
                            </button>
                        )}
                        {hasPermission(user?.permissions, PERMISSIONS.MODULE_PRODUCTS, 'can_add') && (
                            <Link href="/products/add">
                                <a className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0 text-sm uppercase tracking-wide">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                    Add Product
                                </a>
                            </Link>
                        )}
                    </div>
                ) : undefined}
            />

            {viewMode === 'list' ? (
                <div className="h-[600px]">
                    <DataTable
                        rowData={products}
                        columnDefs={columnDefs}
                        searchText={searchText}
                        paginationPageSize={12}
                    />
                </div>
            ) : (
                <div className="pb-10">
                    <DataGrid
                        data={filteredProducts}
                        renderItem={renderProductCard}
                    />
                </div>
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title="Delete Product"
                message="Are you sure you want to delete this product? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setModalConfig({ isOpen: false, id: null })}
                confirmLabel="Delete"
            />

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="products"
                onImportComplete={fetchProducts}
            />
        </Layout>
    );
}
