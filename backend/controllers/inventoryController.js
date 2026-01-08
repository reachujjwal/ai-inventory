const db = require('../config/db');

exports.getAllInventory = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;
        console.log(`Fetching inventory for user: ${userId}, role: ${userRole}`);

        let query = `
            SELECT p.id as product_id, p.name as product_name, p.sku, p.price,
                   COALESCE(i.stock_level, 0) as stock_level,
                   COALESCE(i.reorder_threshold, 10) as reorder_threshold,
                   u1.username as created_by_name,
                   i.created_at,
                   u2.username as updated_by_name,
                   i.updated_at
            FROM products p 
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN users u1 ON i.created_by = u1.id
            LEFT JOIN users u2 ON i.updated_by = u2.id
        `;
        let params = [];

        if (userRole !== 'admin') {
            query += ' WHERE p.created_by = ?';
            params.push(userId);
        }

        const [inventory] = await db.query(query, params);
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStock = async (req, res) => {
    const { product_id, stock_level, reorder_threshold } = req.body;
    try {
        // Check if inventory record exists
        const [exists] = await db.query('SELECT id FROM inventory WHERE product_id = ?', [product_id]);

        if (exists.length > 0) {
            await db.query(
                'UPDATE inventory SET stock_level=?, reorder_threshold=?, updated_by=?, updated_at=NOW() WHERE product_id=?',
                [stock_level, reorder_threshold, req.user.id, product_id]
            );
        } else {
            await db.query(
                'INSERT INTO inventory (product_id, stock_level, reorder_threshold, created_by) VALUES (?, ?, ?, ?)',
                [product_id, stock_level, reorder_threshold, req.user.id]
            );
        }
        res.json({ message: 'Inventory updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.adjustStock = async (req, res) => {
    const { product_id, adjustment, unit_price } = req.body;
    try {
        await db.query(
            'UPDATE inventory SET stock_level = stock_level + ?, updated_by = ?, updated_at = NOW() WHERE product_id = ?',
            [adjustment, req.user.id, product_id]
        );


        res.json({ message: 'Stock adjusted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getLowStockAlerts = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;

        let query = `
            SELECT i.*, p.name as product_name 
            FROM inventory i 
            JOIN products p ON i.product_id = p.id 
            WHERE i.stock_level <= i.reorder_threshold
        `;
        let params = [];

        if (userRole !== 'admin') {
            query += ' AND p.created_by = ?';
            params.push(userId);
        }

        const [alerts] = await db.query(query, params);
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
