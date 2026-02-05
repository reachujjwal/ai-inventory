import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';

interface ActivityLog {
    id: number;
    action: string;
    entity_type: string;
    entity_id: number;
    details: any;
    created_at: string;
    username: string;
    email: string;
    role: string;
}

export default function ActivityLogs() {
    const { user } = useAuth();
    const router = useRouter();
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [dateRange, setDateRange] = useState(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    });
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        if (user) {
            fetchActivities();
        }
    }, [user, page]);

    const fetchActivities = async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page,
                limit: 10
            };
            if (dateRange.start) params.start_date = dateRange.start;
            if (dateRange.end) params.end_date = dateRange.end;
            if (searchText) params.search = searchText;

            const res = await api.get('/activities', { params });
            // Handle new paginated response
            if (res.data.data) {
                setActivities(res.data.data);
                setTotalPages(res.data.pagination.pages);
            } else {
                setActivities(res.data); // Fallback
            }
        } catch (err) {
            console.error('Failed to fetch activities', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchActivities();
    };

    return (
        <Layout title="Activity Logs">
            <PageHeader
                title="Activity Logs"
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search logs..."
            />

            <div className="mb-6 bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <label className="text-xs font-bold text-text-secondary uppercase">From</label>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary w-full"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <label className="text-xs font-bold text-text-secondary uppercase">To</label>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary w-full"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    className="w-full md:w-auto bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-primary/20"
                >
                    Apply Filter
                </button>
                {(dateRange.start || dateRange.end) && (
                    <button
                        onClick={() => {
                            setDateRange({ start: '', end: '' });
                            // Need to refetch after state update
                            setTimeout(fetchActivities, 0);
                        }}
                        className="text-xs text-text-secondary hover:text-text font-medium underline"
                    >
                        Clear
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : activities.length === 0 ? (
                <div className="text-center py-20 bg-surface border border-dashed border-border rounded-xl">
                    <div className="text-text-secondary mb-2">No activity logs found.</div>
                    <p className="text-xs text-text-secondary/70">Try adjusting your search or date filters.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {activities.map((log) => (
                        <div key={log.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/40 transition-all shadow-sm group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {log.username?.charAt(0).toUpperCase() || 'S'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-text group-hover:text-primary transition-colors">{log.action}</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-background text-text-secondary border border-border uppercase tracking-wider">
                                                {log.entity_type || 'system'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-text-secondary">
                                            by <span className="font-medium text-text-secondary/80">{log.username}</span>
                                            <span className="mx-1">•</span>
                                            <span className="capitalize">{log.role}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-text-secondary font-medium bg-background px-3 py-1 rounded-full border border-border self-start md:self-center">
                                    {new Date(log.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between bg-surface border border-border rounded-xl p-4">
                    <div className="text-xs text-text-secondary">
                        Page <span className="font-bold text-text">{page}</span> of <span className="font-bold text-text">{totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 text-xs font-bold bg-background border border-border rounded hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 text-xs font-bold bg-background border border-border rounded hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </Layout>
    );
}
