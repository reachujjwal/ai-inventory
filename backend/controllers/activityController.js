const db = require('../config/db');

exports.getActivities = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;
        const { start_date, end_date } = req.query;

        let query = `
            SELECT al.*, u.username, u.email, u.role
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
            query += ` AND (
                (al.entity_type = 'product' AND al.entity_id IN (SELECT id FROM products WHERE created_by = ?))
                OR (al.entity_type = 'order' AND al.entity_id IN (SELECT o.id FROM orders o JOIN products p ON o.product_id = p.id WHERE p.created_by = ?))
                OR al.user_id = ?
            )`;
            params.push(userId, userId, userId);
        } else {
            // Regular user sees only their own logs
            query += ' AND al.user_id = ?';
            params.push(userId);
        }

        // Date filtering
        if (start_date) {
            query += ' AND al.created_at >= ?';
            params.push(start_date);
        }
        if (end_date) {
            // Include the whole end day
            query += ' AND al.created_at <= ?';
            params.push(`${end_date} 23:59:59`);
        }

        query += ' ORDER BY al.created_at DESC';

        const [logs] = await db.query(query, params);

        // Parse details JSON
        const processedLogs = logs.map(log => ({
            ...log,
            details: log.details ? JSON.parse(log.details) : null
        }));

        res.json(processedLogs);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
