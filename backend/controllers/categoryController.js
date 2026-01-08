const db = require('../config/db');

exports.getAllCategories = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;
        console.log(`Fetching categories for user: ${userId}, role: ${userRole}`);

        let query = `
            SELECT c.*, 
                   u1.username as created_by_name, 
                   u2.username as updated_by_name
            FROM categories c
            LEFT JOIN users u1 ON c.created_by = u1.id
            LEFT JOIN users u2 ON c.updated_by = u2.id
        `;

        query += ' ORDER BY c.name ASC';
        const [categories] = await db.query(query);
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.createCategory = async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    try {
        const [result] = await db.query(
            'INSERT INTO categories (name, description, created_by) VALUES (?, ?, ?)',
            [name, description, req.user.id]
        );
        res.status(201).json({ id: result.insertId, name, description });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Category already exists' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    try {
        await db.query(
            'UPDATE categories SET name=?, description=?, updated_by=?, updated_at=NOW() WHERE id=?',
            [name, description, req.user.id, id]
        );
        res.json({ message: 'Category updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM categories WHERE id = ?', [id]);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
