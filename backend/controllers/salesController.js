const db = require('../config/db');

exports.getAllSales = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;
        console.log(`Fetching sales for user: ${userId}, role: ${userRole}`);

        let query = `
            SELECT s.*, p.name as product_name,
                   u1.username as created_by_name,
                   u2.username as updated_by_name
            FROM sales s 
            JOIN products p ON s.product_id = p.id
            LEFT JOIN orders o ON s.order_id = o.id
            LEFT JOIN users u1 ON s.created_by = u1.id
            LEFT JOIN users u2 ON s.updated_by = u2.id
        `;
        let params = [];

        if (userRole !== 'admin') {
            query += ' WHERE o.user_id = ? OR (s.order_id IS NULL AND s.created_by = ?)';
            params.push(userId, userId);
        }

        query += ' ORDER BY s.sale_date DESC';
        const [sales] = await db.query(query, params);
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.recordSale = async (req, res) => {
    const { product_id, quantity, total_amount } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Record Sale
        await connection.query(
            'INSERT INTO sales (product_id, quantity, total_amount, created_by) VALUES (?, ?, ?, ?)',
            [product_id, quantity, total_amount, req.user.id]
        );

        // 2. Update Inventory
        await connection.query(
            'UPDATE inventory SET stock_level = stock_level - ? WHERE product_id = ?',
            [quantity, product_id]
        );

        await connection.commit();
        res.status(201).json({ message: 'Sale recorded and inventory updated' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};
