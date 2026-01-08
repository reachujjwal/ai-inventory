import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';
import { useNotification } from '../context/NotificationContext';
import DataTable from '../components/DataTable';
import { useLoading } from '../context/LoadingContext';
import { canAccess, hasPermission, PERMISSIONS } from '../lib/rbac';
import { exportToCSV, exportToPDF } from '../lib/export';

export default function Inventory() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();

    const [showRestockModal, setShowRestockModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [restockAmount, setRestockAmount] = useState(0);
    const [unitPrice, setUnitPrice] = useState(0);
    const { setIsLoading, isLoading } = useLoading();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !canAccess(user?.role, PERMISSIONS.MODULE_INVENTORY, user?.permissions)) {
            router.push('/');
        } else if (isAuthenticated) {
            fetchInventory();
        }
    }, [isAuthenticated, loading, user]);

    const fetchInventory = async () => {
        const res = await api.get('/inventory');
        setInventory(res.data);
    };

    const handleRestock = async () => {
        setIsLoading(true);
        try {
            await api.put('/inventory/adjust', {
                product_id: selectedProduct.product_id,
                adjustment: restockAmount,
                unit_price: unitPrice
            });
            showNotification(`Stock adjusted and purchase recorded for ${selectedProduct.product_name}`, 'success');
            setShowRestockModal(false);
            setRestockAmount(0);
            setUnitPrice(0);
            fetchInventory();
        } catch (err) {
            showNotification('Error restocking inventory', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const statusCellRenderer = ({ data }: any) => {
        const stock = data.stock_level;
        const threshold = data.reorder_threshold || 10;

        let status = { label: 'In Stock', color: 'bg-success/10 text-success border-success/20', dot: 'bg-success' };
        if (stock <= 0) status = { label: 'Out of Stock', color: 'bg-error/10 text-error border-error/20', dot: 'bg-error' };
        else if (stock < threshold) status = { label: 'Low Stock', color: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' };

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color} uppercase tracking-tight`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`}></span>
                {status.label}
            </span>
        );
    };

    const actionCellRenderer = ({ data }: any) => {
        if (!hasPermission(user?.permissions, PERMISSIONS.MODULE_INVENTORY, 'can_update')) return null;

        return (
            <div className="flex items-center gap-2">
                <button
                    className="flex items-center px-2 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded border border-primary/20 transition-all text-[10px] font-bold uppercase tracking-tighter"
                    onClick={() => { setSelectedProduct(data); setShowRestockModal(true); }}
                >
                    Restock
                </button>
            </div>
        );
    };

    const columnDefs = [
        { field: 'sku', headerName: 'SKU', width: 100, sortable: true },
        { field: 'product_name', headerName: 'Product Name', flex: 2, sortable: true, cellClass: 'font-semibold' },
        { field: 'stock_level', headerName: 'In Stock', width: 90, cellClass: 'text-center font-black text-base' },
        { field: 'status', headerName: 'Availability', flex: 1, cellRenderer: statusCellRenderer },
        { field: 'created_by_name', headerName: 'Added By', flex: 1, cellClass: 'text-[10px] uppercase font-bold text-text-secondary' },
        {
            field: 'created_at', headerName: 'Added Date', flex: 1.2, cellRenderer: ({ value }: any) => value ? (
                <div className="flex flex-col py-1">
                    <span className="text-[10px] font-bold">{new Date(value).toLocaleDateString()}</span>
                    <span className="text-[9px] text-text-secondary uppercase">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            ) : <span className="text-[10px] text-text-secondary italic">System Init</span>
        },
        { field: 'updated_by_name', headerName: 'Updated By', flex: 1, cellClass: 'text-[10px] uppercase font-bold text-text-secondary' },
        {
            field: 'updated_at', headerName: 'Updated Date', flex: 1.2, cellRenderer: ({ value }: any) => value ? (
                <div className="flex flex-col py-1">
                    <span className="text-[10px] font-bold">{new Date(value).toLocaleDateString()}</span>
                    <span className="text-[9px] text-text-secondary uppercase">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            ) : <span className="text-[10px] text-text-secondary italic">No Updates</span>
        },
        {
            headerName: 'Actions',
            field: 'actions',
            cellRenderer: actionCellRenderer,
            width: 120,
            hide: !hasPermission(user?.permissions, PERMISSIONS.MODULE_INVENTORY, 'can_update')
        }
    ];

    if (loading || !isAuthenticated || !canAccess(user?.role, PERMISSIONS.MODULE_INVENTORY, user?.permissions)) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    const totalProducts = inventory.length;
    const totalStock = inventory.reduce((sum, item) => sum + (item.stock_level || 0), 0);
    const lowStockItems = inventory.filter(item => (item.stock_level || 0) < (item.reorder_threshold || 10)).length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.stock_level * (item.price || 0)), 0);

    return (
        <Layout title="Inventory Control">
            <PageHeader
                title="Inventory"
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search stock..."
                onExport={hasPermission(user?.permissions, PERMISSIONS.MODULE_INVENTORY, 'can_export') ? async (format) => {
                    const lowerSearch = searchText.toLowerCase();
                    const filtered = inventory
                        .filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lowerSearch)))
                        .map(row => {
                            const stock = row.stock_level;
                            const threshold = row.reorder_threshold || 10;
                            let status = 'In Stock';
                            if (stock <= 0) status = 'Out of Stock';
                            else if (stock < threshold) status = 'Low Stock';

                            return {
                                SKU: row.sku,
                                'Product Name': row.product_name,
                                'In Stock': row.stock_level,
                                'Availability': status,
                                'Added By': row.created_by_name || 'System Init',
                                'Added Date': row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A',
                                'Updated By': row.updated_by_name || 'No Updates',
                                'Updated Date': row.updated_at ? new Date(row.updated_at).toLocaleString() : 'N/A'
                            };
                        });
                    if (format === 'csv') exportToCSV(filtered, 'inventory_report');
                    else await exportToPDF(filtered, 'inventory_report', 'Inventory Status Audit');
                } : undefined}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Products', value: totalProducts, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10', color: 'text-primary' },
                    { label: 'Units in Stock', value: totalStock, icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', color: 'text-success' },
                    { label: 'Critical Alert', value: lowStockItems, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'text-warning' },
                    { label: 'Inventory Value', value: `$${totalValue.toLocaleString()}`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-success' },
                ].map((stat, i) => (
                    <div key={i} className="bg-surface border border-border/50 p-6 rounded-2xl shadow-lg flex items-center gap-4 group hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1">
                        <div className={`p-4 rounded-xl bg-background border border-border group-hover:bg-primary/5 transition-colors ${stat.color}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon}></path></svg>
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-text-secondary">{stat.label}</p>
                            <p className="text-2xl font-black text-text font-mono">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="h-[500px]">
                <DataTable
                    rowData={inventory}
                    columnDefs={columnDefs}
                    searchText={searchText}
                    paginationPageSize={10}
                />
            </div>

            {showRestockModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-border bg-background/50 flex justify-between items-center">
                            <h3 className="text-lg font-black tracking-tight text-text uppercase">Restock Product</h3>
                            <button onClick={() => setShowRestockModal(false)} className="text-text-secondary hover:text-text transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-widest text-text-secondary mb-2">Restock Amount for {selectedProduct?.product_name}</label>
                                <input
                                    type="number"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text font-mono text-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    value={restockAmount}
                                    onChange={(e) => setRestockAmount(parseInt(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-widest text-text-secondary mb-2">Unit Cost (Purchase Price)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text font-mono text-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(parseFloat(e.target.value))}
                                />
                                <p className="mt-2 text-[10px] text-text-secondary uppercase font-bold tracking-widest">Total Order Value: <span className="text-text">${(restockAmount * unitPrice).toFixed(2)}</span></p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-background/50 border-t border-border flex justify-end gap-3">
                            <button onClick={() => setShowRestockModal(false)} disabled={isLoading} className="px-5 py-2.5 text-text-secondary font-bold hover:text-text disabled:opacity-50 transition-colors text-sm uppercase">Cancel</button>
                            <button
                                onClick={handleRestock}
                                disabled={isLoading}
                                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-black rounded-xl shadow-lg shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed transition-all text-sm uppercase tracking-wide flex items-center"
                            >
                                Update Inventory
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
