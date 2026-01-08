const db = require('../config/db');
const { logActivity } = require('../utils/activityLogger');

exports.getAllProducts = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;

        console.log(`Fetching products for user: ${userId}, role: ${userRole}`);

        let query = `
            SELECT p.*, c.name as category_name,
                   i.stock_level,
                   u1.username as created_by_name,
                   u2.username as updated_by_name
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN users u1 ON p.created_by = u1.id
            LEFT JOIN users u2 ON p.updated_by = u2.id
        `;

        const params = [];

        // Marketplace Model:
        // - Tenants only see their own products (for management)
        // - Regular users see ALL products (for browsing and purchasing)
        if (userRole === 'tenant') {
            query += ' WHERE p.created_by = ?';
            params.push(userId);
        }
        // Users, admins, and other roles see all products

        const [products] = await db.query(query, params);
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    const { name, description, price, sku, category_id } = req.body;
    const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;

    // Validate required fields
    if (!name || !price || !sku) {
        return res.status(400).json({
            message: 'Missing required fields (name, price, sku)',
            received: { name, price, sku, description, category_id }
        });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO products (name, description, price, sku, category_id, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, description || null, price, sku, category_id || null, image_url, req.user.id]
        );

        // Initialize inventory with 0 stock
        await db.query(
            'INSERT INTO inventory (product_id, stock_level, reorder_threshold, created_by) VALUES (?, 0, 10, ?)',
            [result.insertId, req.user.id]
        );

        await logActivity(req.user.id, 'Created Product', 'product', result.insertId, { name, sku, price });

        res.status(201).json({ id: result.insertId, name, description, price, sku, category_id, image_url });
    } catch (error) {
        console.error('Product creation error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (products.length === 0) return res.status(404).json({ message: 'Product not found' });
        res.json(products[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, description, price, sku, category_id } = req.body;

    try {
        let image_url = null;

        // If new image uploaded, delete old one and use new
        if (req.file) {
            // Get old image path
            const [oldProduct] = await db.query('SELECT image_url FROM products WHERE id = ?', [id]);
            if (oldProduct.length > 0 && oldProduct[0].image_url) {
                const fs = require('fs');
                const oldPath = '.' + oldProduct[0].image_url;
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            image_url = `/uploads/products/${req.file.filename}`;

            let updateQuery = 'UPDATE products SET name=?, description=?, price=?, sku=?, category_id=?, image_url=?, updated_by=?, updated_at=NOW() WHERE id=?';
            const updateParams = [name, description, price, sku, category_id || null, image_url, req.user.id, id];

            if (req.user.role === 'tenant') {
                updateQuery += ' AND created_by = ?';
                updateParams.push(req.user.id);
            }

            const [result] = await db.query(updateQuery, updateParams);
            if (result.affectedRows === 0 && req.user.role === 'tenant') {
                // Check if it failed because ID not found or permission
                return res.status(403).json({ message: 'Permission denied or product not found' });
            }
        } else {
            let updateQuery = 'UPDATE products SET name=?, description=?, price=?, sku=?, category_id=?, updated_by=?, updated_at=NOW() WHERE id=?';
            const updateParams = [name, description, price, sku, category_id || null, req.user.id, id];

            if (req.user.role === 'tenant') {
                updateQuery += ' AND created_by = ?';
                updateParams.push(req.user.id);
            }

            const [result] = await db.query(updateQuery, updateParams);
            if (result.affectedRows === 0 && req.user.role === 'tenant') {
                return res.status(403).json({ message: 'Permission denied or product not found' });
            }
        }

        await logActivity(req.user.id, 'Updated Product', 'product', id, { name, sku, price });

        res.json({ message: 'Product updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        // Get product info before deleting
        const [product] = await db.query('SELECT image_url, created_by FROM products WHERE id = ?', [id]);

        if (product.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if tenant is trying to delete someone else's product
        if (req.user.role === 'tenant' && product[0].created_by !== req.user.id) {
            return res.status(403).json({ message: 'Permission denied: You can only delete your own products' });
        }

        await db.query('DELETE FROM products WHERE id = ?', [id]);

        // Delete image file if exists
        if (product[0].image_url) {
            const fs = require('fs');
            const imagePath = '.' + product[0].image_url;
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await logActivity(req.user.id, 'Deleted Product', 'product', id, { name: product[0].name });

        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
