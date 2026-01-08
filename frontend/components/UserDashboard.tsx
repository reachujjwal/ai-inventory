import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import DashboardFilter from './DashboardFilter';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import RewardPointsWidget from './RewardPointsWidget';
import { useAuth } from '../context/AuthContext';

interface UserDashboardProps {
    user: any;
}

export default function UserDashboard({ user }: UserDashboardProps) {
    const { refreshUser } = useAuth();
    const [period, setPeriod] = useState<string>('all_time');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stats State
    const [stats, setStats] = useState({
        orders: { total: 0, today: 0, delivered: 0, cancelled: 0 },
        sales: { count: 0, amount: 0 }
    });

    // Chart Data State
    const [chartOptions, setChartOptions] = useState<any>({});

    useEffect(() => {
        // Initial load or when filters change
        // Refresh user data first, then fetch dashboard data
        if (refreshUser) {
            refreshUser().catch(console.error).then(() => {
                fetchDashboardData();
            });
        } else {
            fetchDashboardData();
        }
    }, [period, dateRange.start, dateRange.end]);

    const fetchDashboardData = async () => {
        // Debounce or check valid custom range
        if (period === 'custom' && (!dateRange.start || !dateRange.end)) return;

        setLoading(true);
        try {
            const params: any = { period };
            if (period === 'custom') {
                params.startDate = dateRange.start;
                params.endDate = dateRange.end;
            }

            // Parallel Data Fetching
            const [statsRes, chartRes] = await Promise.all([
                api.get('/dashboard/stats', { params }),
                api.get('/dashboard/chart-data', { params })
            ]);

            if (statsRes.data) {
                setStats(prev => ({ ...prev, ...statsRes.data }));
            }
            if (Array.isArray(chartRes.data)) {
                setupChart(chartRes.data);
            }
        } catch (error: any) {
            console.error("Failed to load user dashboard data", error);
            setError(error.message || 'Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const setupChart = (data: any[]) => {
        if (!Array.isArray(data)) return;
        // data array of { date, total, count }
        const categories = data.map(d => new Date(d.date).toLocaleDateString());
        const seriesData = data.map(d => parseFloat(d.total || 0));

        setChartOptions({
            chart: {
                type: 'column', // Bar chart (vertical)
                backgroundColor: 'transparent',
                style: {
                    fontFamily: 'Inter, sans-serif'
                }
            },
            title: {
                text: 'Your Spend Overview',
                style: { color: '#94a3b8' },
                align: 'left'
            },
            xAxis: {
                categories: categories,
                labels: { style: { color: '#94a3b8' } },
                lineColor: '#334155'
            },
            yAxis: {
                title: { text: null },
                gridLineColor: '#334155',
                labels: { style: { color: '#94a3b8' } }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                style: { color: '#f8fafc' },
                borderColor: '#334155',
                pointFormat: '<b>${point.y:,.2f}</b>'
            },
            plotOptions: {
                column: {
                    borderRadius: 5,
                    borderWidth: 0,
                    color: {
                        linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                        stops: [
                            [0, 'rgba(99, 102, 241, 1)'], // Primary color solid
                            [1, 'rgba(99, 102, 241, 0.6)']
                        ]
                    }
                }
            },
            legend: {
                enabled: false
            },
            series: [{
                name: 'Spent',
                data: seriesData
            }],
            credits: { enabled: false }
        });
    };

    if (loading && !stats.orders) return <div className="p-8 text-center text-text-secondary">Loading dashboard...</div>;

    return (
        <div className="animate-in fade-in duration-500">
            {/* Filter Section */}
            <DashboardFilter
                period={period}
                onPeriodChange={setPeriod}
                startDate={dateRange.start}
                endDate={dateRange.end}
                onDateRangeChange={(start, end) => setDateRange({ start, end })}
            />

            {/* Error Message */}
            {error && (
                <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl mb-6 flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* 1. Total Orders */}
                <div className="bg-surface border border-info/20 shadow-lg shadow-info/5 rounded-xl p-6 relative overflow-hidden group hover:border-info/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-24 h-24 text-info" fill="currentColor" viewBox="0 0 20 20"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
                    </div>
                    <h3 className="text-sm font-medium text-text-secondary z-10 relative">Total Orders</h3>
                    <p className="text-3xl font-black text-text mt-2 z-10 relative">{stats.orders?.total || 0}</p>
                    <p className="text-xs text-info mt-1 z-10 relative font-medium">All Statuses</p>
                </div>

                {/* 2. Delivered Orders */}
                <div className="bg-surface border border-success/20 shadow-lg shadow-success/5 rounded-xl p-6 relative overflow-hidden group hover:border-success/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-24 h-24 text-success" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    <h3 className="text-sm font-medium text-text-secondary z-10 relative">Delivered</h3>
                    <p className="text-3xl font-black text-text mt-2 z-10 relative">{stats.orders?.delivered || 0}</p>
                    <p className="text-xs text-success mt-1 z-10 relative font-medium">Completed Orders</p>
                </div>

                {/* 3. Cancelled Orders */}
                <div className="bg-surface border border-error/20 shadow-lg shadow-error/5 rounded-xl p-6 relative overflow-hidden group hover:border-error/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-24 h-24 text-error" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </div>
                    <h3 className="text-sm font-medium text-text-secondary z-10 relative">Cancelled</h3>
                    <p className="text-3xl font-black text-text mt-2 z-10 relative">{stats.orders?.cancelled || 0}</p>
                    <p className="text-xs text-error mt-1 z-10 relative font-medium">Cancelled Orders</p>
                </div>

                {/* 4. Total Spend */}
                <div className="bg-surface border border-warning/20 shadow-lg shadow-warning/5 rounded-xl p-6 relative overflow-hidden group hover:border-warning/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-24 h-24 text-warning" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                    </div>
                    <h3 className="text-sm font-medium text-text-secondary z-10 relative">Total Spend</h3>
                    <p className="text-3xl font-black text-text mt-2 z-10 relative">
                        ${Number(stats.sales?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-warning mt-1 z-10 relative font-medium">
                        {period === 'all_time' ? 'Lifetime' : 'Period'}
                    </p>
                </div>
            </div>

            {/* Reward Points Widget */}
            <RewardPointsWidget className="mb-8" />

            {/* Highcharts Widget */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm mb-8">
                {Object.keys(chartOptions).length > 0 ? (
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={chartOptions}
                    />
                ) : (
                    <div className="h-64 flex items-center justify-center text-text-secondary">
                        No chart data available
                    </div>
                )}
            </div>

        </div>
    );
}
