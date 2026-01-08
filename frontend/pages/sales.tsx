import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import DataGrid from '../components/DataGrid';
import { useViewMode } from '../hooks/useViewMode';
import { canAccess, hasPermission, PERMISSIONS } from '../lib/rbac';
import { exportToCSV, exportToPDF } from '../lib/export';

export default function Sales() {
    const [sales, setSales] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const { viewMode, setViewMode } = useViewMode('sales');

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !canAccess(user?.role, PERMISSIONS.MODULE_SALES, user?.permissions)) {
            router.push('/');
        } else if (isAuthenticated) {
            fetchSales();
        }
    }, [isAuthenticated, loading, user]);

    const fetchSales = async () => {
        const res = await api.get('/sales');
        setSales(res.data);
    };

    const dateCellRenderer = ({ value }: any) => {
        const date = new Date(value);
        return (
            <div className="flex flex-col py-1">
                <span className="text-sm font-semibold">{date.toLocaleDateString()}</span>
                <span className="text-[10px] text-text-secondary uppercase">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        );
    };

    const amountCellRenderer = ({ value }: any) => {
        return <span className="font-mono text-text font-bold text-base leading-none tracking-tight">${value}</span>;
    };

    const columnDefs = [
        { field: 'sale_date', headerName: 'Date & Time', flex: 1.5, cellRenderer: dateCellRenderer, sortable: true },
        { field: 'product_name', headerName: 'Product', flex: 2, sortable: true, cellClass: 'font-semibold' },
        { field: 'quantity', headerName: 'Qty', width: 80, cellClass: 'text-center font-black' },
        { field: 'total_amount', headerName: 'Total Price', flex: 1, cellRenderer: amountCellRenderer, sortable: true },
        { field: 'created_by_name', headerName: 'Recorded By', flex: 1, cellClass: 'text-[10px] uppercase font-bold text-text-secondary' },
        { field: 'updated_by_name', headerName: 'Updated By', flex: 1, cellClass: 'text-[10px] uppercase font-bold text-text-secondary' },
        {
            field: 'updated_at', headerName: 'Updated Date', flex: 1.2, cellRenderer: ({ value }: any) => value ? (
                <div className="flex flex-col py-1">
                    <span className="text-[10px] font-bold">{new Date(value).toLocaleDateString()}</span>
                    <span className="text-[9px] text-text-secondary uppercase">{new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            ) : <span className="text-[10px] text-text-secondary italic">No Updates</span>
        }
    ];

    if (loading || !isAuthenticated || !canAccess(user?.role, PERMISSIONS.MODULE_SALES, user?.permissions)) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    const renderSaleCard = (sale: any) => {
        return (
            <div className="bg-surface border border-border rounded-xl shadow-sm hover:shadow-lg transition-all flex flex-col h-[260px] w-full group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <svg className="w-24 h-24 transform rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V9h-1.5v9.09c-3.55-1.61-6-5.15-6-9.09 0-5.52 4.48-10 10-10s10 4.48 10 10c0 3.94-2.45 7.48-6 9.09zM14 16h-4v-2h4v2zm0-4h-4V6h4v6z"></path></svg>
                </div>

                <div className="p-5 flex flex-col h-full relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <div className="bg-primary/5 text-primary border border-primary/10 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">
                            Sale
                        </div>
                        <span className="text-[10px] text-text-secondary font-medium bg-background px-2 py-1 rounded border border-border">
                            {new Date(sale.sale_date).toLocaleDateString()}
                        </span>
                    </div>

                    <div className="my-auto">
                        <h4 className="font-bold text-text text-lg leading-tight line-clamp-2 mb-2" title={sale.product_name}>{sale.product_name}</h4>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-primary tracking-tight">${sale.total_amount}</span>
                            <span className="text-xs text-text-secondary font-medium">total</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-dashed border-border">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-text-secondary block">Qty</span>
                            <span className="text-sm font-bold text-text">{sale.quantity} <span className="text-[10px] font-normal text-text-secondary">units</span></span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-text-secondary block">By</span>
                            <span className="text-sm font-bold text-text truncate block" title={sale.created_by_name}>{sale.created_by_name || 'System'}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    // Filter for Grid
    const filteredSales = sales.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <Layout title="Sales History">
            <PageHeader
                title="Sales"
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search sales by product..."
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={hasPermission(user?.permissions, PERMISSIONS.MODULE_SALES, 'can_export') ? async (format) => {
                    const lowerSearch = searchText.toLowerCase();
                    const filtered = sales
                        .filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lowerSearch)))
                        .map(row => ({
                            'Sale Date': new Date(row.sale_date).toLocaleString(),
                            Product: row.product_name,
                            Quantity: row.quantity,
                            'Total Amount': `$${row.total_amount}`,
                            'Recorded By': row.created_by_name || 'System',
                            'Updated By': row.updated_by_name || 'No Updates',
                            'Updated Date': row.updated_at ? new Date(row.updated_at).toLocaleString() : 'N/A'
                        }));
                    if (format === 'csv') exportToCSV(filtered, 'sales_report');
                    else await exportToPDF(filtered, 'sales_report', 'Sales Performance Audit');
                } : undefined}
            />

            {viewMode === 'list' ? (
                <div className="h-[600px]">
                    <DataTable
                        rowData={sales}
                        columnDefs={columnDefs}
                        searchText={searchText}
                        paginationPageSize={12}
                    />
                </div>
            ) : (
                <div className="pb-10">
                    <DataGrid
                        data={filteredSales}
                        renderItem={renderSaleCard}
                    />
                </div>
            )}
        </Layout>
    );
}
