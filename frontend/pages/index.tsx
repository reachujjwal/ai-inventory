
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useLoading } from '../context/LoadingContext';
import DateRangePicker from '../components/DateRangePicker';
import { canAccess, PERMISSIONS } from '../lib/rbac';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import dynamic from 'next/dynamic';
const UserDashboard = dynamic(() => import('../components/UserDashboard'), { ssr: false });
const LowStockChart = dynamic(() => import('../components/LowStockChart'), { ssr: false });

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function Dashboard() {
    const [alerts, setAlerts] = useState<any[]>([]);
    // New Stats Structure
    const [stats, setStats] = useState<any>({
        users: { total: 0 },
        orders: { total: 0 },
        products: { total: 0, added: 0, lowStock: 0, outOfStock: 0, todaySalesCount: 0 },
        sales: { count: 0, amount: 0 }
    });

    // Filters
    const [filterPeriod, setFilterPeriod] = useState<string>('all_time'); // all_time, today, custom
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [summaryData, setSummaryData] = useState<any>({ users: [], orders: [], sales: [] });
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any>(null);
    const { isAuthenticated, user, loading } = useAuth();
    const router = useRouter();
    const { setIsLoading } = useLoading();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        } else if (isAuthenticated) {
            loadDashboard();
        }
    }, [isAuthenticated, loading, user, filterPeriod, dateRange.start, dateRange.end]);

    const loadDashboard = async () => {
        // Skip for regular users as they have their own component
        if (user?.role === 'user') return;

        // Only load if custom is complete or not custom
        if (filterPeriod === 'custom' && (!dateRange.start || !dateRange.end)) return;

        setIsLoading(true);
        try {
            const tasks = [
                fetchStats(),
                fetchSummaryData(),
                fetchTopProducts()
            ];

            if (canAccess(user?.role, PERMISSIONS.MODULE_INVENTORY)) {
                tasks.push(fetchAlerts());
                tasks.push(fetchChartData());
            }

            await Promise.all(tasks);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSummaryData = async () => {
        try {
            const fetches = [
                api.get('/orders')
            ];

            // Only fetch sales if user has permission
            if (canAccess(user?.role, PERMISSIONS.MODULE_SALES)) {
                fetches.push(api.get('/sales'));
            }

            if (canAccess(user?.role, PERMISSIONS.MODULE_USERS)) {
                fetches.push(api.get('/users'));
            }

            const results = await Promise.all(fetches);
            const ordersRes = results[0];

            let salesRes = { data: [] };
            let usersRes = { data: [] };
            let resultIndex = 1;

            if (canAccess(user?.role, PERMISSIONS.MODULE_SALES)) {
                salesRes = results[resultIndex];
                resultIndex++;
            }

            if (canAccess(user?.role, PERMISSIONS.MODULE_USERS)) {
                usersRes = results[resultIndex];
            }

            const today = new Date().toISOString().split('T')[0];
            const todaySales = salesRes.data.filter((s: any) => s.sale_date?.startsWith(today));

            setSummaryData({
                users: usersRes.data ? usersRes.data.slice(0, 10) : [],
                orders: ordersRes.data.slice(0, 10),
                sales: todaySales.slice(0, 10)
            });
        } catch (err) {
            console.error('Failed to fetch summary data', err);
        }
    };

    const fetchTopProducts = async () => {
        try {
            const params: any = { period: filterPeriod };
            if (filterPeriod === 'custom') {
                params.startDate = dateRange.start;
                params.endDate = dateRange.end;
            }
            const res = await api.get('/dashboard/top-products', { params });
            setTopProducts(res.data);
        } catch (err) {
            console.error('Failed to fetch top products', err);
        }
    };

    const fetchStats = async () => {
        try {
            const params: any = { period: filterPeriod };
            if (filterPeriod === 'custom') {
                params.startDate = dateRange.start;
                params.endDate = dateRange.end;
            }
            const res = await api.get('/dashboard/stats', { params });
            // Map backend response to current stats structure if needed, or update backend to match
            // Backend now sends structure: { users: {}, products: {}, sales: {} }
            // Let's ensure we handle the old flat structure if the backend change hasn't propagated or if we want to be safe
            // Actually I updated backend to return nested object.
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    };

    const fetchAlerts = async () => {
        try {
            const res = await api.get('/inventory/alerts');
            setAlerts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchChartData = async () => {
        try {
            const res = await api.get('/inventory');
            const products = res.data;

            const data = {
                labels: products.map((p: any) => p.product_name),
                datasets: [
                    {
                        label: 'Stock Level',
                        data: products.map((p: any) => p.stock_level),
                        backgroundColor: 'rgba(99, 102, 241, 0.5)',
                        borderColor: 'rgba(99, 102, 241, 1)',
                        borderWidth: 1,
                    },
                ],
            };
            setChartData(data);
        } catch (err) {
            console.error('Failed to load chart data', err);
        }
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: '#94a3b8' }
            },
            title: {
                display: true,
                text: 'Current Stock Levels',
                color: '#f8fafc'
            },
        },
        scales: {
            y: {
                ticks: { color: '#94a3b8' },
                grid: { color: '#334155' }
            },
            x: {
                ticks: { color: '#94a3b8' },
                grid: { display: false }
            }
        }
    };

    if (loading || !isAuthenticated) {
        return null;
    }

    if (user?.role === 'user') {
        return (
            <Layout title="Dashboard">
                <UserDashboard user={user} />
            </Layout>
        );
    }

    return (
        <Layout title="Dashboard">

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex space-x-2 bg-surface p-1 rounded-lg border border-border">
                    <button
                        onClick={() => setFilterPeriod('all_time')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterPeriod === 'all_time' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-text'}`}
                    >
                        All Time
                    </button>
                    <button
                        onClick={() => setFilterPeriod('today')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterPeriod === 'today' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-text'}`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setFilterPeriod('custom')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterPeriod === 'custom' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-text'}`}
                    >
                        Custom
                    </button>
                </div>

                {filterPeriod === 'custom' && (
                    <DateRangePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onChange={(start, end) => setDateRange({ start, end })}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

                {/* Users Card */}
                {canAccess(user?.role, PERMISSIONS.MODULE_USERS) && (
                    <div
                        onClick={() => setExpandedSection(expandedSection === 'users' ? null : 'users')}
                        className={`bg-surface border ${expandedSection === 'users' ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'} rounded-xl p-6 shadow-sm hover:border-primary/50 transition-all group cursor-pointer active:scale-95`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-text-secondary">Users</h3>
                            <span className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-text mb-1">{stats.users.total}</p>
                        <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Total Registered</p>
                    </div>
                )}

                {/* Product Widget 1: Total Products */}
                {canAccess(user?.role, PERMISSIONS.MODULE_INVENTORY) && (
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-info/50 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-text-secondary">Total Products</h3>
                            <span className="p-2 bg-info/10 rounded-lg text-info group-hover:bg-info group-hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-1">
                            <p className="text-3xl font-bold text-text">{stats.products.total}</p>
                            {stats.products.added > 0 && (
                                <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                                    +{stats.products.added} Added
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">In Catalog</p>
                    </div>
                )}



                {/* Product Widget 4: Out of Stock */}
                {canAccess(user?.role, PERMISSIONS.MODULE_INVENTORY) && (
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-error/50 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-text-secondary">Out of Stock</h3>
                            <span className="p-2 bg-error/10 rounded-lg text-error group-hover:bg-error group-hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-error mb-1">{stats.products.outOfStock}</p>
                        <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Zero Stock</p>
                    </div>
                )}

                {/* Product Widget 5: Sold Today */}
                {canAccess(user?.role, PERMISSIONS.MODULE_INVENTORY) && (
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-primary/50 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-text-secondary">Sold Today</h3>
                            <span className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-primary mb-1">{stats.products.todaySalesCount}</p>
                        <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Unique Items</p>
                    </div>
                )}



                {/* Total Orders Card */}
                {canAccess(user?.role, PERMISSIONS.MODULE_SALES) && (
                    <div
                        onClick={() => setExpandedSection(expandedSection === 'orders' ? null : 'orders')}
                        className={`bg-surface border ${expandedSection === 'orders' ? 'border-info shadow-lg shadow-info/10' : 'border-border'} rounded-xl p-6 shadow-sm hover:border-info/50 transition-all group cursor-pointer active:scale-95`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-text-secondary">Total Orders</h3>
                            <span className="p-2 bg-info/10 rounded-lg text-info group-hover:bg-info group-hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-text">{stats.orders?.total || 0}</p>
                        <p className="text-[10px] text-text-secondary mt-1 uppercase font-bold tracking-wider">Lifecycle Volume</p>
                    </div>
                )}

                {/* Sales Card */}
                {canAccess(user?.role, PERMISSIONS.MODULE_SALES) && (
                    <div
                        onClick={() => setExpandedSection(expandedSection === 'sales' ? null : 'sales')}
                        className={`bg-surface border ${expandedSection === 'sales' ? 'border-warning shadow-lg shadow-warning/10' : 'border-border'} rounded-xl p-6 shadow-sm hover:border-warning/50 transition-all group cursor-pointer active:scale-95`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-text-secondary">Sales Revenue</h3>
                            <span className="p-2 bg-warning/10 rounded-lg text-warning group-hover:bg-warning group-hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-text">${stats.sales?.amount?.toLocaleString() || 0}</p>
                        <p className="text-[10px] text-text-secondary mt-1 uppercase font-bold tracking-wider">Daily Performance</p>
                    </div>
                )}

                {/* Low Stock Widget (Moved) */}
                {canAccess(user?.role, PERMISSIONS.MODULE_INVENTORY) && (
                    <div className="col-span-full bg-surface border border-error/30 shadow-lg shadow-error/5 rounded-xl p-6 relative overflow-hidden group hover:border-error/60 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-text-secondary">Low Stock Alerts</h3>
                            <span className="p-2 bg-error/10 rounded-lg text-error group-hover:bg-error group-hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </span>
                        </div>
                        <div className="flex items-end justify-between mb-4">
                            <div>
                                <p className="text-3xl font-black text-text">{stats.products.lowStock}</p>
                                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Items minimize</p>
                            </div>
                        </div>

                        {/* Use Chart instead of list */}
                        {stats.products.lowStockItems?.length > 0 ? (
                            <LowStockChart items={stats.products.lowStockItems} />
                        ) : (
                            <p className="text-xs text-text-secondary italic">No critical stock alerts.</p>
                        )}
                    </div>
                )}
            </div>

            {/* EXPANDED SECTION (Keeping existing logic mostly but ensuring compat with new structure if needed) */}
            {expandedSection && (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`bg-surface border rounded-2xl p-6 shadow-xl ${expandedSection === 'users' ? 'border-primary/20' : 'border-warning/20'
                        }`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em]">{expandedSection} Details</h3>
                            <button onClick={() => setExpandedSection(null)} className="text-text-secondary hover:text-text">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {expandedSection === 'users' && summaryData.users.map((u: any) => (
                                <div key={u.id} className="flex items-center justify-between bg-background/50 p-4 rounded-xl border border-primary/10">
                                    <div>
                                        <p className="font-bold text-text text-sm">{u.username}</p>
                                        <p className="text-[10px] text-text-secondary">{u.email}</p>
                                    </div>
                                    <span className="text-[8px] uppercase px-2 py-1 rounded bg-primary/10 text-primary">{u.role}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    {chartData ? <Bar options={chartOptions} data={chartData} /> : <p className="text-text-secondary">Loading chart...</p>}
                </div>
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-text-secondary mb-4">Sales Overview (Last 30 Days)</h3>
                    {/* Visual representation of top products in last 30 days */}
                    {topProducts.length > 0 ? (
                        <div className="space-y-4">
                            {(() => {
                                const maxAmount = Math.max(...topProducts.map(p => p.total_amount));
                                return topProducts.map((p, i) => (
                                    <div key={i} className="relative">
                                        <div className="flex mb-1 items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-text mb-0.5">
                                                    {p.product_name}
                                                </span>
                                                <span className="text-[10px] text-text-secondary uppercase tracking-tight">
                                                    {p.total_quantity} units sold
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-black text-warning">
                                                    ${parseFloat(p.total_amount).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-1.5 flex rounded bg-warning/5">
                                            <div
                                                style={{ width: `${(p.total_amount / maxAmount) * 100}%` }}
                                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-warning/60"
                                            ></div>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
                            <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="text-xs italic">No sales data for visualization in the last 30 days</p>
                        </div>
                    )}
                </div>
            </div>

        </Layout>
    );
}
