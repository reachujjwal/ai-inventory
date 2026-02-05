const db = require('../config/db');

exports.getActivities = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;
        const { start_date, end_date, search } = req.query;

        // Pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let baseQuery = `
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        let params = [];

        // Role-based filtering
        if (userRole === 'admin') {
            // Admin sees everything
        } else if (userRole === 'tenant') {
            // Tenant sees logs for their products and orders
            baseQuery += ` AND (
                (al.entity_type = 'product' AND al.entity_id IN (SELECT id FROM products WHERE created_by = ?))
                OR (al.entity_type = 'order' AND al.entity_id IN (SELECT o.id FROM orders o JOIN products p ON o.product_id = p.id WHERE p.created_by = ?))
                OR al.user_id = ?
            )`;
            params.push(userId, userId, userId);
        } else {
            // Regular user sees only their own logs
            baseQuery += ' AND al.user_id = ?';
            params.push(userId);
        }

        // Date filtering
        if (start_date) {
            baseQuery += ' AND al.created_at >= ?';
            params.push(start_date);
        }
        if (end_date) {
            // Include the whole end day
            baseQuery += ' AND al.created_at <= ?';
            params.push(`${end_date} 23:59:59`);
        }

        // Search filtering
        if (search) {
            baseQuery += ' AND (al.action LIKE ? OR u.username LIKE ? OR al.entity_type LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // 1. Get Total Count
        const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        // 2. Get Paginated Data
        const dataQuery = `
            SELECT al.*, u.username, u.email, u.role
            ${baseQuery}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [logs] = await db.query(dataQuery, [...params, limit, offset]);

        // Parse details JSON
        const processedLogs = logs.map(log => ({
            ...log,
            details: log.details ? JSON.parse(log.details) : null
        }));

        res.json({
            data: processedLogs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
