import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import DataGrid from '../../components/DataGrid';
import ConfirmModal from '../../components/ConfirmModal';
import { useLoading } from '../../context/LoadingContext';
import { useViewMode } from '../../hooks/useViewMode';

import { canAccess, hasPermission, PERMISSIONS, ROLES } from '../../lib/rbac';
import { exportToCSV, exportToPDF } from '../../lib/export';

export default function Orders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();
    const { setIsLoading, isLoading } = useLoading();
    const { viewMode, setViewMode } = useViewMode('orders');
    const [cancelModal, setCancelModal] = useState<{ isOpen: boolean, group: any | null }>({
        isOpen: false,
        group: null
    });
    const [cancelForm, setCancelForm] = useState({
        reason: '',
        remarks: ''
    });

    const CANCEL_REASONS = [
        'Fitting issue',
        'Delivery date too far',
        'Found better price',
        'Change of mind',
        'Product out of stock',
        'Other'
    ];

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (!loading && isAuthenticated && !canAccess(user?.role, PERMISSIONS.MODULE_ORDERS, user?.permissions)) {
            router.push('/');
        } else if (isAuthenticated) {
            fetchOrders();
        }
    }, [isAuthenticated, loading, user]);


    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders');
            const rawOrders = res.data;

            // Grouping logic
            const groups: { [key: string]: any[] } = {};
            rawOrders.forEach((o: any) => {
                const code = o.order_code || `legacy-${o.id}`;
                if (!groups[code]) groups[code] = [];
                groups[code].push(o);
            });

            const groupedData = Object.keys(groups).map((code) => {
                const items = groups[code];
                const first = items[0];
                const total_discount = items.reduce((sum, i) => sum + parseFloat(i.discount_amount || 0), 0);
                const total_reward_discount = items.reduce((sum, i) => sum + parseFloat(i.reward_discount_amount || 0), 0);
                const total_reward_points = items.reduce((sum, i) => sum + parseInt(i.reward_points_used || 0), 0);
                const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.total_amount) + parseFloat(i.discount_amount || 0) + parseFloat(i.reward_discount_amount || 0)), 0);

                return {
                    ...first,
                    all_items: items,
                    items_count: items.length - 1,
                    subtotal: subtotal.toFixed(2),
                    total_discount: total_discount.toFixed(2),
                    total_reward_discount: total_reward_discount.toFixed(2),
                    total_reward_points: total_reward_points,
                    total_amount: items.reduce((sum, i) => sum + parseFloat(i.total_amount), 0).toFixed(2),
                    product_name: items.length > 1 ? `${first.product_name}` : first.product_name,
                    coupon_code: first.coupon_code,
                    status: items.sort((a, b) => b.id - a.id)[0].status
                };
            });

            setOrders(groupedData.sort((a, b) => b.id - a.id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateStatus = async (group: any, newStatus: string, cancelData?: { reason: string, remarks: string }) => {
        // Allow cancellation for users without strict 'can_update' permission
        if (newStatus !== 'cancelled' && !hasPermission(user?.permissions, PERMISSIONS.MODULE_ORDERS, 'can_update')) return;

        setIsLoading(true);
        try {
            // Update all items in the group
            await Promise.all(group.all_items.map((item: any) =>
                api.put(`/orders/${item.id}/status`, {
                    status: newStatus,
                    cancel_reason: cancelData?.reason,
                    cancel_remarks: cancelData?.remarks
                })
            ));

            showNotification(`Order ${group.order_code || group.id} status updated to ${newStatus}`, 'success');
            setCancelModal({ isOpen: false, group: null });
            setCancelForm({ reason: '', remarks: '' });
            fetchOrders();
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Failed to update status', 'error');
        } finally {
            setIsLoading(false);
        }
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

    const amountCellRenderer = ({ data }: any) => {
        return (
            <div className="flex flex-col">
                <span className="font-mono text-text font-bold text-base leading-none tracking-tight">${data.total_amount}</span>
                {data.coupon_code && (
                    <span className="text-[9px] font-black text-primary uppercase mt-1 flex items-center">
                        <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                        {data.coupon_code}
                    </span>
                )}
            </div>
        );
    };

    const statusCellRenderer = ({ value }: any) => {
        const status = value;
        const statusConfig: any = {
            pending: { color: 'bg-warning/10 text-warning border-warning/20', label: 'Pending Approval', dot: 'bg-warning' },
            approved: { color: 'bg-info/10 text-info border-info/20', label: 'Approved', dot: 'bg-info' },
            shipped: { color: 'bg-primary/10 text-primary border-primary/20', label: 'Shipped', dot: 'bg-primary' },
            delivered: { color: 'bg-success/10 text-success border-success/20', label: 'Delivered', dot: 'bg-success' },
            cancelled: { color: 'bg-error/10 text-error border-error/20', label: 'Cancelled', dot: 'bg-error' },
            confirmed: { color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', label: 'Confirmed', dot: 'bg-indigo-500' }
        };

        const config = statusConfig[status] || { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: status, dot: 'bg-gray-500' };

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${config.color} uppercase tracking-widest`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${config.dot}`}></span>
                {config.label}
            </span>
        );
    };

    const actionCellRenderer = ({ data }: any) => {
        const status = data.status;

        // Cancelled orders previously returned null here, preventing invoice download.
        // We now allow fall-through so the invoice button can be rendered.
        // Other buttons have specific status checks so they won't appear.

        return (
            <div className="flex items-center gap-2 h-full">
                {status === 'pending' && hasPermission(user?.permissions, PERMISSIONS.MODULE_ORDERS, 'can_update') && (
                    <button
                        onClick={() => handleUpdateStatus(data, 'approved')}
                        disabled={isLoading}
                        className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold uppercase rounded border border-success/20 hover:bg-success hover:text-white disabled:opacity-50 transition-all shadow-sm flex items-center"
                    >
                        Approve
                    </button>
                )}
                {(status === 'approved' || status === 'confirmed') && hasPermission(user?.permissions, PERMISSIONS.MODULE_ORDERS, 'can_update') && (
                    <button
                        onClick={() => handleUpdateStatus(data, 'shipped')}
                        disabled={isLoading}
                        className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded border border-primary/20 hover:bg-primary hover:text-white disabled:opacity-50 transition-all shadow-sm flex items-center"
                    >
                        Ship
                    </button>
                )}
                {status === 'shipped' && hasPermission(user?.permissions, PERMISSIONS.MODULE_ORDERS, 'can_update') && (
                    <button
                        onClick={() => handleUpdateStatus(data, 'delivered')}
                        disabled={isLoading}
                        className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold uppercase rounded border border-success/20 hover:bg-success hover:text-white disabled:opacity-50 transition-all shadow-sm flex items-center"
                    >
                        Deliver
                    </button>
                )}
                {/* Allow cancellation for pending/confirmed/approved orders */}
                {(status === 'pending' || status === 'confirmed' || status === 'approved') && (
                    <button
                        onClick={() => setCancelModal({ isOpen: true, group: data })}
                        disabled={isLoading}
                        className="px-2 py-1 bg-error/10 text-error text-[10px] font-bold uppercase rounded border border-error/20 hover:bg-error hover:text-white disabled:opacity-50 transition-all shadow-sm flex items-center"
                    >
                        Cancel
                    </button>
                )}

                {/* Invoice button always visible for relevant statuses, including delivered */}
                <button
                    onClick={() => {
                        import('../../lib/export').then(mod => mod.generateInvoicePDF(data.all_items));
                    }}
                    className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm flex items-center"
                    title="Generate Invoice"
                >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Invoice
                </button>
            </div>
        );
    };

    const columnDefs = [
        { field: 'order_code', headerName: 'Order Code', width: 150, cellClass: 'font-mono text-xs text-text-secondary font-bold tracking-wider', sortable: true },
        { field: 'created_at', headerName: 'Date', flex: 1, cellRenderer: dateCellRenderer, sortable: true },
        {
            field: 'product_name',
            headerName: 'Products',
            flex: 1.5,
            sortable: true,
            cellClass: 'font-semibold',
            cellRenderer: ({ data }: any) => (
                <div className="flex items-center gap-2">
                    <span className="truncate">{data.product_name}</span>
                    {data.items_count > 0 && (
                        <span className="px-2 py-0.5 bg-background border border-border rounded text-[10px] font-black text-primary whitespace-nowrap">
                            +{data.items_count} ITEMS
                        </span>
                    )}
                </div>
            )
        },
        { field: 'total_amount', headerName: 'Total Payable', width: 120, cellRenderer: amountCellRenderer },
        { field: 'status', headerName: 'Tracking Status', flex: 1.2, cellRenderer: statusCellRenderer },
        { field: 'placed_by', headerName: 'Placed By', flex: 1, cellClass: 'text-[10px] uppercase font-bold text-text-secondary' },
        {
            headerName: 'Management',
            field: 'actions',
            cellRenderer: actionCellRenderer,
            width: 250,
            hide: !hasPermission(user?.permissions, PERMISSIONS.MODULE_ORDERS, 'can_update')
        }
    ];

    if (loading || !isAuthenticated || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    const renderOrderCard = (order: any) => {
        const statusConfig = {
            approved: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', label: 'Approved' },
            pending: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', label: 'Pending' },
            rejected: { color: 'text-error', bg: 'bg-error/10', border: 'border-error/20', label: 'Rejected' },
            shipped: { color: 'text-info', bg: 'bg-info/10', border: 'border-info/20', label: 'Shipped' },
            delivered: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', label: 'Delivered' },
            cancelled: { color: 'text-text-secondary', bg: 'bg-surface-active', border: 'border-border', label: 'Cancelled' },
            confirmed: { color: 'text-info', bg: 'bg-info/10', border: 'border-info/20', label: 'Confirmed' }
        };

        const status = order.status ? order.status.toLowerCase() : 'pending';
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return (
            <div className="bg-surface border border-border rounded-xl shadow-sm hover:shadow-lg transition-all flex flex-col h-[320px] w-full group relative overflow-hidden">
                <div className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-text-secondary tracking-wider uppercase">Order</span>
                            <span className="font-bold text-text text-sm">#{order.order_code}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.color} ${config.border} flex items-center gap-1.5`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`}></span>
                            {config.label}
                        </span>
                    </div>

                    <div className="flex-1 mb-4">
                        <div className="flex items-start gap-4 mb-3">
                            {order.all_items[0]?.product_image ? (
                                <img src={`http://localhost:5000${order.all_items[0].product_image}`} className="w-16 h-16 rounded-xl border border-border object-cover shrink-0" />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-background border border-border flex items-center justify-center text-text-secondary shrink-0">
                                    <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                                </div>
                            )}
                            <div className="overflow-hidden">
                                <h4 className="font-bold text-text text-sm line-clamp-2 leading-tight mb-1" title={order.product_name}>{order.product_name}</h4>
                                {order.items_count > 0 && (
                                    <span className="text-[10px] font-bold text-text-secondary bg-background px-2 py-0.5 rounded border border-border">
                                        +{order.items_count} more items
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-border pt-4 mt-auto">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-text-secondary block mb-0.5">Total</span>
                                <span className="text-xl font-black text-text tracking-tight">${order.total_amount}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-text-secondary">{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            {status === 'pending' && hasPermission(user?.permissions, PERMISSIONS.MODULE_ORDERS, 'can_update') && (
                                <button onClick={() => handleUpdateStatus(order, 'approved')} disabled={isLoading} className="p-2 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-colors" title="Approve">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </button>
                            )}
                            {(status === 'approved' || status === 'confirmed') && hasPermission(user?.permissions, PERMISSIONS.MODULE_ORDERS, 'can_update') && (
                                <button onClick={() => handleUpdateStatus(order, 'shipped')} disabled={isLoading} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors" title="Ship">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                                </button>
                            )}
                            {(status === 'pending' || status === 'confirmed' || status === 'approved') && (
                                <button onClick={() => setCancelModal({ isOpen: true, group: order })} disabled={isLoading} className="p-2 bg-error/10 text-error rounded-lg hover:bg-error hover:text-white transition-colors" title="Cancel">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    import('../../lib/export').then(mod => mod.generateInvoicePDF(order.all_items));
                                }}
                                className="p-2 bg-background border border-border text-text-secondary rounded-lg hover:text-primary hover:border-primary transition-colors"
                                title="Download Invoice"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };




    // Filter for Grid
    const filteredOrders = orders.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <Layout title="Orders Management">
            <PageHeader
                title="Orders"
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search orders..."
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={hasPermission(user?.permissions, PERMISSIONS.MODULE_ORDERS, 'can_export') ? async (format) => {
                    const lowerSearch = searchText.toLowerCase();
                    const filtered = orders
                        .filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lowerSearch)))
                        .map(row => ({
                            'Order Date': new Date(row.created_at).toLocaleString(),
                            Product: row.product_name,
                            Quantity: row.quantity,
                            Total: `$${row.total_amount}`,
                            Status: row.status.toUpperCase(),
                            'Placed By': row.placed_by || 'System',
                            'Updated By': row.updated_by_name || 'N/A',
                            'Updated Date': row.updated_at ? new Date(row.updated_at).toLocaleString() : 'N/A'
                        }));
                    if (format === 'csv') exportToCSV(filtered, 'orders_report');
                    else await exportToPDF(filtered, 'orders_report', 'Order Management Audit');
                } : undefined}
                action={hasPermission(user?.permissions, PERMISSIONS.MODULE_ORDERS, 'can_add') ? (
                    <Link href="/orders/add">
                        <a className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0 text-sm uppercase tracking-wide">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                            Place Order
                        </a>
                    </Link>
                ) : undefined}
            />

            {viewMode === 'list' ? (
                <div className="h-[600px]">
                    <DataTable
                        rowData={orders}
                        columnDefs={columnDefs}
                        searchText={searchText}
                        paginationPageSize={12}
                        renderRowDetails={(data) => (
                            <div className="bg-surface/50 border border-border rounded-xl overflow-hidden shadow-inner">
                                <div className="px-6 py-3 bg-background/50 border-b border-border">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Order Items Breakdown</h4>
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/30">
                                            <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-text-secondary">Product</th>
                                            <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-text-secondary text-center">SKU</th>
                                            <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-text-secondary text-center">Qty</th>
                                            <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-text-secondary text-right">Unit Price</th>
                                            <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-text-secondary text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        {data.all_items.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-primary/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {item.product_image && (
                                                            <img src={`http://localhost:5000${item.product_image}`} className="w-8 h-8 rounded border border-border object-cover" />
                                                        )}
                                                        <span className="text-sm font-semibold">{item.product_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[10px] font-mono font-bold text-text-secondary text-center uppercase tracking-tighter">
                                                    {item.product_sku || `PRD-${item.product_id}`}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-black text-center">{item.quantity}</td>
                                                <td className="px-6 py-4 text-sm font-mono text-right text-text-secondary font-bold">
                                                    ${(parseFloat(item.total_amount) / item.quantity).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono font-black text-right text-primary">
                                                    ${parseFloat(item.total_amount).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-background/30 border-t border-border/50">
                                            <td colSpan={4} className="px-6 py-2 text-right text-[9px] font-bold uppercase tracking-widest text-text-secondary">Subtotal</td>
                                            <td className="px-6 py-2 text-sm font-mono text-right text-text-secondary font-bold">${data.subtotal}</td>
                                        </tr>
                                        {parseFloat(data.total_discount) > 0 && (
                                            <tr className="bg-background/30">
                                                <td colSpan={4} className="px-6 py-2 text-right text-[9px] font-bold uppercase tracking-widest text-primary">
                                                    Coupon Discount {data.coupon_code && <span className="ml-1 px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20">{data.coupon_code}</span>}
                                                </td>
                                                <td className="px-6 py-2 text-sm font-mono text-right text-primary font-bold">-${data.total_discount}</td>
                                            </tr>
                                        )}
                                        {parseFloat(data.total_reward_discount || 0) > 0 && (
                                            <tr className="bg-background/30">
                                                <td colSpan={4} className="px-6 py-2 text-right text-[9px] font-bold uppercase tracking-widest text-warning">
                                                    Reward Points <span className="ml-1 px-1.5 py-0.5 bg-warning/10 rounded border border-warning/20">{data.total_reward_points} pts</span>
                                                </td>
                                                <td className="px-6 py-2 text-sm font-mono text-right text-warning font-bold">-${data.total_reward_discount}</td>
                                            </tr>
                                        )}
                                        <tr className="bg-background/30 border-t border-border/50">
                                            <td colSpan={4} className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-text-secondary">Grand Total</td>
                                            <td className="px-6 py-4 text-base font-black text-right text-text tracking-tighter">${data.total_amount}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    />
                </div>
            ) : (
                <div className="pb-10">
                    <DataGrid
                        data={filteredOrders}
                        renderItem={renderOrderCard}
                    />
                </div>
            )}

            {/* Cancel Order Modal */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 bg-error/10 border-b border-error/20 flex justify-between items-center">
                            <h3 className="text-error font-black uppercase tracking-widest flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Cancel Order
                            </h3>
                            <button
                                onClick={() => setCancelModal({ isOpen: false, group: null })}
                                className="text-error/60 hover:text-error transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Reason for Cancellation</label>
                                <select
                                    value={cancelForm.reason}
                                    onChange={(e) => setCancelForm(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-error/20 focus:border-error transition-all outline-none"
                                >
                                    <option value="">Select a reason...</option>
                                    {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Remarks</label>
                                <textarea
                                    value={cancelForm.remarks}
                                    onChange={(e) => setCancelForm(prev => ({ ...prev, remarks: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-error/20 focus:border-error transition-all outline-none resize-none"
                                    placeholder="Explain the reason in detail..."
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-background border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setCancelModal({ isOpen: false, group: null })}
                                className="px-5 py-2 text-sm font-bold text-text-secondary hover:text-text transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => {
                                    if (!cancelForm.reason) {
                                        showNotification('Please select a reason', 'error');
                                        return;
                                    }
                                    handleUpdateStatus(cancelModal.group, 'cancelled', cancelForm);
                                }}
                                disabled={isLoading}
                                className="px-6 py-2.5 bg-error hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-error/20 hover:shadow-error/40 transition-all disabled:opacity-50"
                            >
                                Confirm Cancellation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
