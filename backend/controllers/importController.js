const db = require('../config/db');
const fs = require('fs');
const csv = require('csv-parser');

// Helper function to parse CSV file
const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                // Clean up uploaded file
                fs.unlinkSync(filePath);
                resolve(results);
            })
            .on('error', reject);
    });
};

// ============================================
// PRODUCTS IMPORT
// ============================================

exports.analyzeProductsImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const records = await parseCSV(req.file.path);

        const valid = [];
        const invalid = [];
        const duplicates = [];

        for (const record of records) {
            // Validate required fields
            if (!record.sku || !record.name || !record.price) {
                invalid.push({ ...record, reason: 'Missing required fields (sku, name, price)' });
                continue;
            }

            // Check for duplicate SKU
            const [existing] = await db.query(`
                SELECT p.id, p.name, p.price, p.description, p.category_id,
                       u1.username as created_by_name, p.created_at,
                       u2.username as updated_by_name, p.updated_at
                FROM products p
                LEFT JOIN users u1 ON p.created_by = u1.id
                LEFT JOIN users u2 ON p.updated_by = u2.id
                WHERE p.sku = ?
            `, [record.sku]);

            if (existing.length > 0) {
                duplicates.push({
                    ...record,
                    existing: existing[0]
                });
            } else {
                valid.push(record);
            }
        }

        res.json({ valid, duplicates, invalid, total: records.length });
    } catch (error) {
        console.error('Products import analysis failed:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.processProductsImport = async (req, res) => {
    const { inserts, updates } = req.body;
    const userId = req.user.id;

    try {
        let inserted = 0;
        let updated = 0;

        // Process inserts
        for (const record of inserts || []) {
            await db.query(
                'INSERT INTO products (name, description, price, sku, category_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                [record.name, record.description || null, record.price, record.sku, record.category_id || null, userId]
            );

            // Initialize inventory
            const [result] = await db.query('SELECT id FROM products WHERE sku = ?', [record.sku]);
            await db.query(
                'INSERT INTO inventory (product_id, stock_level, reorder_threshold, created_by) VALUES (?, 0, 10, ?)',
                [result[0].id, userId]
            );
            inserted++;
        }

        // Process updates
        for (const record of updates || []) {
            await db.query(
                'UPDATE products SET name=?, description=?, price=?, category_id=?, updated_by=?, updated_at=NOW() WHERE sku=?',
                [record.name, record.description || null, record.price, record.category_id || null, userId, record.sku]
            );
            updated++;
        }

        res.json({
            message: 'Import completed successfully',
            inserted,
            updated,
            skipped: (req.body.skips || []).length
        });
    } catch (error) {
        console.error('Products import processing failed:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// CATEGORIES IMPORT
// ============================================

exports.analyzeCategoriesImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const records = await parseCSV(req.file.path);

        const valid = [];
        const invalid = [];
        const duplicates = [];

        for (const record of records) {
            // Validate required fields
            if (!record.name) {
                invalid.push({ ...record, reason: 'Missing required field (name)' });
                continue;
            }

            // Check for duplicate name
            const [existing] = await db.query(`
                SELECT c.id, c.name, c.description,
                       u1.username as created_by_name, c.created_at,
                       u2.username as updated_by_name, c.updated_at
                FROM categories c
                LEFT JOIN users u1 ON c.created_by = u1.id
                LEFT JOIN users u2 ON c.updated_by = u2.id
                WHERE c.name = ?
            `, [record.name]);

            if (existing.length > 0) {
                duplicates.push({
                    ...record,
                    existing: existing[0]
                });
            } else {
                valid.push(record);
            }
        }

        res.json({ valid, duplicates, invalid, total: records.length });
    } catch (error) {
        console.error('Categories import analysis failed:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.processCategoriesImport = async (req, res) => {
    const { inserts, updates } = req.body;
    const userId = req.user.id;

    try {
        let inserted = 0;
        let updated = 0;

        // Process inserts
        for (const record of inserts || []) {
            await db.query(
                'INSERT INTO categories (name, description, created_by) VALUES (?, ?, ?)',
                [record.name, record.description || null, userId]
            );
            inserted++;
        }

        // Process updates
        for (const record of updates || []) {
            await db.query(
                'UPDATE categories SET description=?, updated_by=?, updated_at=NOW() WHERE name=?',
                [record.description || null, userId, record.name]
            );
            updated++;
        }

        res.json({
            message: 'Import completed successfully',
            inserted,
            updated,
            skipped: (req.body.skips || []).length
        });
    } catch (error) {
        console.error('Categories import processing failed:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// USERS IMPORT
// ============================================

exports.analyzeUsersImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const records = await parseCSV(req.file.path);

        const valid = [];
        const invalid = [];
        const duplicates = [];

        for (const record of records) {
            // Validate required fields
            if (!record.email || !record.username || !record.password) {
                invalid.push({ ...record, reason: 'Missing required fields (email, username, password)' });
                continue;
            }

            // Prevent admin role import
            if (record.role && record.role.toLowerCase() === 'admin') {
                invalid.push({ ...record, reason: 'Admin role cannot be imported via CSV' });
                continue;
            }

            // Check for duplicate email
            const [existing] = await db.query(`
                SELECT u.id, u.username, u.email, u.role,
                       u1.username as created_by_name, u.created_at,
                       u2.username as updated_by_name, u.updated_at
                FROM users u
                LEFT JOIN users u1 ON u.created_by = u1.id
                LEFT JOIN users u2 ON u.updated_by = u2.id
                WHERE u.email = ?
            `, [record.email]);

            if (existing.length > 0) {
                duplicates.push({
                    ...record,
                    existing: existing[0]
                });
            } else {
                valid.push(record);
            }
        }

        res.json({ valid, duplicates, invalid, total: records.length });
    } catch (error) {
        console.error('Users import analysis failed:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.processUsersImport = async (req, res) => {
    const { inserts, updates } = req.body;
    const userId = req.user.id;
    const bcrypt = require('bcryptjs');

    try {
        let inserted = 0;
        let updated = 0;

        // Process inserts
        for (const record of inserts || []) {
            // Additional server-side check to prevent admin role
            if (record.role && record.role.toLowerCase() === 'admin') {
                continue; // Skip admin role records
            }

            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(record.password, salt);

            await db.query(
                'INSERT INTO users (username, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?)',
                [record.username, record.email, password_hash, record.role || 'user', userId]
            );
            inserted++;
        }

        // Process updates
        for (const record of updates || []) {
            // Additional server-side check to prevent admin role
            if (record.role && record.role.toLowerCase() === 'admin') {
                continue; // Skip admin role records
            }

            let updateQuery = 'UPDATE users SET username=?, role=?, updated_by=?, updated_at=NOW() WHERE email=?';
            let params = [record.username, record.role || 'user', userId, record.email];

            // Only update password if provided
            if (record.password) {
                const salt = await bcrypt.genSalt(10);
                const password_hash = await bcrypt.hash(record.password, salt);
                updateQuery = 'UPDATE users SET username=?, password_hash=?, role=?, updated_by=?, updated_at=NOW() WHERE email=?';
                params = [record.username, password_hash, record.role || 'user', userId, record.email];
            }

            await db.query(updateQuery, params);
            updated++;
        }

        res.json({
            message: 'Import completed successfully',
            inserted,
            updated,
            skipped: (req.body.skips || []).length
        });
    } catch (error) {
        console.error('Users import processing failed:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================================
// COUPONS IMPORT
// ============================================

exports.analyzeCouponsImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const records = await parseCSV(req.file.path);

        const valid = [];
        const invalid = [];
        const duplicates = [];

        for (const record of records) {
            // Validate required fields
            if (!record.code || !record.discount_type || !record.discount_value) {
                invalid.push({ ...record, reason: 'Missing required fields (code, discount_type, discount_value)' });
                continue;
            }

            // Check for duplicate code
            const [existing] = await db.query(`
                SELECT c.*, u.username as creator_name 
                FROM coupons c 
                LEFT JOIN users u ON c.created_by = u.id 
                WHERE c.code = ?
            `, [record.code.toUpperCase()]);

            if (existing.length > 0) {
                duplicates.push({
                    ...record,
                    existing: existing[0]
                });
            } else {
                valid.push(record);
            }
        }

        res.json({ valid, duplicates, invalid, total: records.length });
    } catch (error) {
        console.error('Coupons import analysis failed:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.processCouponsImport = async (req, res) => {
    const { inserts, updates } = req.body;
    const userId = req.user.id;

    try {
        let inserted = 0;
        let updated = 0;

        // Process inserts
        for (const record of inserts || []) {
            await db.query(
                'INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase_amount, expires_at, usage_limit, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    record.code.toUpperCase(),
                    record.description || null,
                    record.discount_type,
                    record.discount_value,
                    record.min_purchase_amount || 0,
                    record.expires_at || null,
                    record.usage_limit || null,
                    record.status || 'active',
                    userId
                ]
            );
            inserted++;
        }

        // Process updates
        for (const record of updates || []) {
            await db.query(
                'UPDATE coupons SET description=?, discount_type=?, discount_value=?, min_purchase_amount=?, expires_at=?, usage_limit=?, status=?, updated_by=?, updated_at=NOW() WHERE code=?',
                [
                    record.description || null,
                    record.discount_type,
                    record.discount_value,
                    record.min_purchase_amount || 0,
                    record.expires_at || null,
                    record.usage_limit || null,
                    record.status || 'active',
                    userId,
                    record.code.toUpperCase()
                ]
            );
            updated++;
        }

        res.json({
            message: 'Import completed successfully',
            inserted,
            updated,
            skipped: (req.body.skips || []).length
        });
    } catch (error) {
        console.error('Coupons import processing failed:', error);
        res.status(500).json({ message: error.message });
    }
};
