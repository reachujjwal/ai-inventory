const db = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;
        const { startDate, endDate, period } = req.query; // period: 'today', 'custom', 'all_time'

        // Determine User's Branch (if needed for BM)
        let branchId = null;
        if (userRole === 'admin' || userRole === 'branch_manager') {
            const [[userData]] = await db.query('SELECT branch_id FROM users WHERE id = ?', [userId]);
            branchId = userData?.branch_id;
        }

        // --- SCOPE FILTERS ---
        // Admin: No extra filters (global)
        // Branch Manager: Filter by users in the same branch
        // User: Filter by own user_id

        // Helper to build WHERE clauses for RBAC
        const getRbacClause = (tableAlias, userCol = 'user_id') => {
            if (userRole === 'admin') return '1=1'; // No filter
            if (userRole === 'branch_manager') {
                // This assumes we join with users table to check branch
                return `${tableAlias ? tableAlias + '.' : ''}branch_id = ?`;
            }
            return `${tableAlias ? tableAlias + '.' : ''}${userCol} = ?`;
        };

        const getRbacParams = () => {
            if (userRole === 'admin') return [];
            if (userRole === 'branch_manager') return [branchId];
            return [userId];
        };

        // Date Filter Helper
        const getDateClause = (dateCol) => {
            if (period === 'today') return ` AND DATE(${dateCol}) = CURDATE()`;
            if (period === 'custom' && startDate && endDate) return ` AND DATE(${dateCol}) BETWEEN ? AND ?`;
            return '';
        };
        const getDateParams = () => {
            if (period === 'custom' && startDate && endDate) return [startDate, endDate];
            return [];
        };

        // --- 1. USERS COUNT ---
        // Admin: All users
        // BM: Users in branch
        // User: Just themselves (1)
        let totalUsers = 0;
        if (userRole === 'user') {
            totalUsers = 1;
        } else {
            let userQuery = 'SELECT COUNT(*) as count FROM users';
            let userParams = [];

            if (userRole === 'branch_manager') {
                userQuery += ' WHERE branch_id = ?';
                userParams.push(branchId);
            }

            // Apply Date Filter to Users (Created Date)
            userQuery += (userRole === 'branch_manager' ? ' AND ' : ' WHERE ') + '1=1 ' + getDateClause('created_at');
            userParams.push(...getDateParams());

            const [[{ count }]] = await db.query(userQuery, userParams);
            totalUsers = count;
        }

        // --- 2. PRODUCTS COUNT ---
        // Admin/BM: All products (global catalog usually)
        // Tenant: Only their own products
        // Filters: Added (Date range), Low Stock, Out of Stock

        // Base Products Query
        let productQuery = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
        let productParams = [];

        // Tenant filter: only their products
        if (userRole === 'tenant') {
            productQuery += ' AND created_by = ?';
            productParams.push(userId);
        }

        productQuery += getDateClause('created_at');
        productParams.push(...getDateParams());

        const [[{ count: productsAdded }]] = await db.query(productQuery, productParams);

        // Low Stock Count
        let lowStockQuery = 'SELECT COUNT(*) as count FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.stock_level <= i.reorder_threshold AND i.stock_level > 0';
        let lowStockParams = [];
        if (userRole === 'tenant') {
            lowStockQuery += ' AND p.created_by = ?';
            lowStockParams.push(userId);
        }
        const [[{ count: lowStockCount }]] = await db.query(lowStockQuery, lowStockParams);

        // Low Stock Items (Top 5)
        let lowStockItemsQuery = `
            SELECT p.name, i.stock_level, i.reorder_threshold 
            FROM inventory i 
            JOIN products p ON i.product_id = p.id 
            WHERE i.stock_level <= i.reorder_threshold AND i.stock_level > 0`;
        let lowStockItemsParams = [];
        if (userRole === 'tenant') {
            lowStockItemsQuery += ' AND p.created_by = ?';
            lowStockItemsParams.push(userId);
        }
        lowStockItemsQuery += ' ORDER BY i.stock_level ASC LIMIT 5';
        const [lowStockItems] = await db.query(lowStockItemsQuery, lowStockItemsParams);

        // Out of Stock
        let outOfStockQuery = 'SELECT COUNT(*) as count FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.stock_level = 0';
        let outOfStockParams = [];
        if (userRole === 'tenant') {
            outOfStockQuery += ' AND p.created_by = ?';
            outOfStockParams.push(userId);
        }
        const [[{ count: outOfStockCount }]] = await db.query(outOfStockQuery, outOfStockParams);

        // Total Active Products (All time)
        let totalProductsQuery = 'SELECT COUNT(*) as count FROM products';
        let totalProductsParams = [];
        if (userRole === 'tenant') {
            totalProductsQuery += ' WHERE created_by = ?';
            totalProductsParams.push(userId);
        }
        const [[{ count: totalProducts }]] = await db.query(totalProductsQuery, totalProductsParams);


        // --- 3. SALES TODAY (or Date Range) ---
        // RBAC applied
        // User: Calculate from orders table to show spend immediately
        // Others: Use sales table for realized revenue
        let salesQuery = '';
        let salesParams = [];

        if (userRole === 'user') {
            console.log('Fetching stats for user:', userId, 'Period:', period);
            salesQuery = `
                SELECT COUNT(*) as count, SUM(total_amount) as total 
                FROM orders
                WHERE user_id = ? AND status != 'cancelled'
            `;
            salesParams.push(userId);

            // Apply Date Filter to orders
            salesQuery += getDateClause('created_at');
            salesParams.push(...getDateParams());
        } else {
            salesQuery = `
                SELECT COUNT(*) as count, SUM(s.total_amount) as total 
                FROM sales s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN orders o ON s.order_id = o.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE 1=1 
            `;

            // Apply RBAC
            if (userRole === 'admin') {
                // No RBAC filter
            } else if (userRole === 'branch_manager') {
                salesQuery += ' AND u.branch_id = ?';
                salesParams.push(branchId);
            } else if (userRole === 'tenant') {
                // Tenant sees sales from their products
                salesQuery += ' AND p.created_by = ?';
                salesParams.push(userId);
            }

            // Apply Date Filter
            salesQuery += getDateClause('s.sale_date');
            salesParams.push(...getDateParams());
        }

        const [[{ count: salesCount, total: salesTotal }]] = await db.query(salesQuery, salesParams);


        // --- 4. SALES (TODAY SPECIFIC) ---
        // Requirement: "Today’s sales count" for Product card
        // This acts as a snippet regardless of the global filter if requested, 
        // but typically "Today" filter covers this. 
        // Let's compute specifically for TODAY to show in the Product card as requested.
        let todaySalesQuery = `
            SELECT COUNT(*) as count 
            FROM sales s
            JOIN products p ON s.product_id = p.id
            LEFT JOIN orders o ON s.order_id = o.id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE DATE(s.sale_date) = CURDATE()
        `;
        let todaySalesParams = [];
        if (userRole === 'branch_manager') {
            todaySalesQuery += ' AND u.branch_id = ?';
            todaySalesParams.push(branchId);
        } else if (userRole === 'tenant') {
            todaySalesQuery += ' AND p.created_by = ?';
            todaySalesParams.push(userId);
        } else if (userRole === 'user') {
            todaySalesQuery += ' AND o.user_id = ?';
            todaySalesParams.push(userId);
        }
        const [[{ count: todaySalesCount }]] = await db.query(todaySalesQuery, todaySalesParams);

        // --- 4. ORDERS COUNT ---
        // Admin: All
        // BM: Branch users
        // Tenant: Orders containing their products
        // User: Own orders broken down by status
        let ordersQuery = '';
        let ordersParams = [];
        let deliveredCount = 0;
        let cancelledCount = 0;

        if (userRole === 'user') {
            // Fetch Total, Delivered, and Cancelled counts for the user
            ordersQuery = `
                SELECT 
                    COUNT(DISTINCT id) as total,
                    COUNT(DISTINCT CASE WHEN status = 'delivered' THEN id END) as delivered,
                    COUNT(DISTINCT CASE WHEN status = 'cancelled' THEN id END) as cancelled
                FROM orders 
                WHERE user_id = ?
            `;
            ordersParams.push(userId);
            ordersQuery += getDateClause('created_at');
            ordersParams.push(...getDateParams());

            const [[userOrderStats]] = await db.query(ordersQuery, ordersParams);
            totalOrders = userOrderStats.total;
            deliveredCount = userOrderStats.delivered;
            cancelledCount = userOrderStats.cancelled;

        } else {
            ordersQuery = 'SELECT COUNT(DISTINCT o.id) as count FROM orders o JOIN products p ON o.product_id = p.id LEFT JOIN users u ON o.user_id = u.id WHERE 1=1 ';

            if (userRole === 'admin') {
                // No filter
            } else if (userRole === 'branch_manager') {
                ordersQuery += ' AND u.branch_id = ?';
                ordersParams.push(branchId);
            } else if (userRole === 'tenant') {
                // Tenant sees orders for their products
                ordersQuery += ' AND p.created_by = ?';
                ordersParams.push(userId);
            } else {
                ordersQuery += ' AND o.user_id = ?';
                ordersParams.push(userId);
            }

            // Date filter for orders
            ordersQuery += getDateClause('o.created_at');
            ordersParams.push(...getDateParams());

            const [[{ count }]] = await db.query(ordersQuery, ordersParams);
            totalOrders = count;
        }

        // --- 5. SALES (TODAY SPECIFIC) --- (Existing logic)
        // ...

        // --- 6. TODAY ORDERS (Fixed for today) ---
        let todayOrdersQuery = '';
        let todayOrdersParams = [];

        if (userRole === 'user') {
            todayOrdersQuery = 'SELECT COUNT(DISTINCT id) as count FROM orders WHERE user_id = ? AND DATE(created_at) = CURDATE()';
            todayOrdersParams.push(userId);
        } else {
            todayOrdersQuery = 'SELECT COUNT(DISTINCT o.id) as count FROM orders o JOIN products p ON o.product_id = p.id LEFT JOIN users u ON o.user_id = u.id WHERE DATE(o.created_at) = CURDATE()';
            if (userRole === 'branch_manager') {
                todayOrdersQuery += ' AND u.branch_id = ?';
                todayOrdersParams.push(branchId);
            } else if (userRole === 'tenant') {
                todayOrdersQuery += ' AND p.created_by = ?';
                todayOrdersParams.push(userId);
            } else if (userRole === 'user') {
                // Fallback (though covered by if block above)
                todayOrdersQuery += ' AND o.user_id = ?';
                todayOrdersParams.push(userId);
            }
        }

        const [[{ count: todayOrdersCount }]] = await db.query(todayOrdersQuery, todayOrdersParams);


        res.json({
            users: {
                total: totalUsers
            },
            products: {
                total: totalProducts,
                added: productsAdded,
                lowStock: lowStockCount,
                lowStockItems: lowStockItems,
                outOfStock: outOfStockCount,
                todaySalesCount: todaySalesCount
            },
            orders: {
                total: totalOrders,
                today: todayOrdersCount,
                delivered: typeof deliveredCount !== 'undefined' ? deliveredCount : 0,
                cancelled: typeof cancelledCount !== 'undefined' ? cancelledCount : 0
            },
            sales: {
                count: salesCount,
                amount: salesTotal || 0
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getChartData = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;
        const { startDate, endDate, period } = req.query;

        let branchId = null;
        if (userRole === 'branch_manager') {
            const [[userData]] = await db.query('SELECT branch_id FROM users WHERE id = ?', [userId]);
            branchId = userData?.branch_id;
        }

        // Date clauses
        const getDateClause = (dateCol) => {
            if (period === 'today') return ` AND DATE(${dateCol}) = CURDATE()`;
            if (period === 'custom' && startDate && endDate) return ` AND DATE(${dateCol}) BETWEEN ? AND ?`;
            // Default to last 7 days if 'all_time' or default for charts to avoid massive load
            if (period === 'all_time') return '';
            // If just loading default 'week' view:
            return ` AND ${dateCol} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
        };

        const getDateParams = () => {
            if (period === 'custom' && startDate && endDate) return [startDate, endDate];
            return [];
        };

        let query = '';
        let params = [];

        if (userRole === 'user') {
            query = `
                SELECT DATE(created_at) as date, SUM(total_amount) as total, COUNT(*) as count
                FROM orders
                WHERE user_id = ? AND status != 'cancelled'
            `;
            params.push(userId);
            query += getDateClause('created_at');
            params.push(...getDateParams());
            query += ' GROUP BY DATE(created_at) ORDER BY date ASC';
        } else {
            query = `
                SELECT DATE(s.sale_date) as date, SUM(s.total_amount) as total, COUNT(*) as count
                FROM sales s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN orders o ON s.order_id = o.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE 1=1
            `;

            if (userRole === 'branch_manager') {
                query += ' AND u.branch_id = ?';
                params.push(branchId);
            } else if (userRole === 'tenant') {
                // Tenant sees sales from their products
                query += ' AND p.created_by = ?';
                params.push(userId);
            }

            // Apply date filter
            query += getDateClause('s.sale_date');
            params.push(...getDateParams());
            query += ' GROUP BY DATE(s.sale_date) ORDER BY date ASC';
        }

        const [results] = await db.query(query, params);
        res.json(results);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.getTopSellingProducts = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;
        const { startDate, endDate, period } = req.query;

        let branchId = null;
        if (userRole === 'branch_manager') {
            const [[userData]] = await db.query('SELECT branch_id FROM users WHERE id = ?', [userId]);
            branchId = userData?.branch_id;
        }

        // Date clauses helper (keeping it simple and localized for now)
        const getDateClause = (dateCol) => {
            if (period === 'today') return ` AND DATE(${dateCol}) = CURDATE()`;
            if (period === 'custom' && startDate && endDate) return ` AND DATE(${dateCol}) BETWEEN ? AND ?`;
            return ''; // Default to all time
        };

        const getDateParams = () => {
            if (period === 'custom' && startDate && endDate) return [startDate, endDate];
            return [];
        };

        let query = '';
        let params = [];

        if (userRole === 'user') {
            query = `
                SELECT p.name as product_name, SUM(o.total_amount) as total_amount, SUM(o.quantity) as total_quantity
                FROM orders o
                JOIN products p ON o.product_id = p.id
                WHERE o.user_id = ? AND o.status != 'cancelled'
            `;
            params.push(userId);
            query += getDateClause('o.created_at');
            params.push(...getDateParams());
            query += ' GROUP BY p.id, p.name ORDER BY total_amount DESC LIMIT 5';
        } else {
            query = `
                SELECT p.name as product_name, SUM(s.total_amount) as total_amount, SUM(s.quantity) as total_quantity
                FROM sales s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN orders o ON s.order_id = o.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE 1=1
            `;

            if (userRole === 'branch_manager') {
                query += ' AND u.branch_id = ?';
                params.push(branchId);
            } else if (userRole === 'tenant') {
                query += ' AND p.created_by = ?';
                params.push(userId);
            }

            query += getDateClause('s.sale_date');
            params.push(...getDateParams());
            query += ' GROUP BY p.id, p.name ORDER BY total_amount DESC LIMIT 5';
        }

        const [results] = await db.query(query, params);
        res.json(results);

    } catch (error) {
        console.error('Error fetching top selling products:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
