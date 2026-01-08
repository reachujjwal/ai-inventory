const db = require('../config/db');

exports.getAllCoupons = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;

        let query = 'SELECT c.*, u.username as creator_name FROM coupons c LEFT JOIN users u ON c.created_by = u.id';
        let params = [];

        if (userRole === 'user') {
            query += ' WHERE c.status = "active"';
        } else if (userRole !== 'admin') {
            query += ' WHERE c.created_by = ?';
            params.push(userId);
        }

        query += ' ORDER BY c.created_at DESC';
        const [coupons] = await db.query(query, params);
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createCoupon = async (req, res) => {
    const { code, description, discount_type, discount_value, min_purchase_amount, expires_at, usage_limit, status } = req.body;

    if (!code || !discount_type || !discount_value) {
        return res.status(400).json({ message: 'Missing required fields (code, discount_type, discount_value)' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase_amount, expires_at, usage_limit, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [code.toUpperCase(), description, discount_type, discount_value, min_purchase_amount || 0, expires_at || null, usage_limit || null, status || 'active', req.user.id]
        );
        res.status(201).json({ id: result.insertId, message: 'Coupon created successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.updateCoupon = async (req, res) => {
    const { id } = req.params;
    const { code, description, discount_type, discount_value, min_purchase_amount, expires_at, usage_limit, status } = req.body;
    const userRole = req.user.role?.toLowerCase();
    const userId = req.user.id;

    try {
        // Ownership check
        if (userRole !== 'admin') {
            const [existing] = await db.query('SELECT created_by FROM coupons WHERE id = ?', [id]);
            if (existing.length === 0 || existing[0].created_by !== userId) {
                return res.status(403).json({ message: 'Unauthorized to update this coupon' });
            }
        }

        await db.query(
            'UPDATE coupons SET code=?, description=?, discount_type=?, discount_value=?, min_purchase_amount=?, expires_at=?, usage_limit=?, status=?, updated_by=? WHERE id=?',
            [code.toUpperCase(), description, discount_type, discount_value, min_purchase_amount, expires_at, usage_limit, status, userId, id]
        );
        res.json({ message: 'Coupon updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCoupon = async (req, res) => {
    const { id } = req.params;
    const userRole = req.user.role?.toLowerCase();
    const userId = req.user.id;

    try {
        // Ownership check
        if (userRole !== 'admin') {
            const [existing] = await db.query('SELECT created_by FROM coupons WHERE id = ?', [id]);
            if (existing.length === 0 || existing[0].created_by !== userId) {
                return res.status(403).json({ message: 'Unauthorized to delete this coupon' });
            }
        }

        await db.query('DELETE FROM coupons WHERE id = ?', [id]);
        res.json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.validateCoupon = async (req, res) => {
    const { code, cartTotal } = req.body;

    if (!code) return res.status(400).json({ message: 'Coupon code is required' });

    try {
        const [coupons] = await db.query(
            'SELECT * FROM coupons WHERE code = ? AND status = "active"',
            [code.toUpperCase()]
        );

        if (coupons.length === 0) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        const coupon = coupons[0];

        // Check expiry
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        // Check usage limit
        if (coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit) {
            return res.status(400).json({ message: 'Coupon usage limit reached' });
        }

        // Check min purchase
        if (cartTotal < coupon.min_purchase_amount) {
            return res.status(400).json({ message: `Minimum purchase of $${coupon.min_purchase_amount} required for this coupon` });
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discount_type === 'percentage') {
            discount = (cartTotal * coupon.discount_value) / 100;
        } else {
            discount = coupon.discount_value;
        }

        // Discount cannot exceed cart total
        discount = Math.min(discount, cartTotal);

        res.json({
            id: coupon.id,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            discount: parseFloat(discount.toFixed(2))
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.exportCoupons = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;

        let query = 'SELECT * FROM coupons';
        let params = [];

        if (userRole !== 'admin') {
            query += ' WHERE created_by = ?';
            params.push(userId);
        }

        query += ' ORDER BY created_at DESC';
        const [coupons] = await db.query(query, params);

        if (coupons.length === 0) {
            return res.status(404).json({ message: 'No coupons to export' });
        }

        // CSV Header
        const headers = ['code', 'description', 'discount_type', 'discount_value', 'min_purchase_amount', 'expires_at', 'usage_limit', 'status'];
        let csvContent = headers.join(',') + '\n';

        // CSV Data
        coupons.forEach(coupon => {
            const row = headers.map(header => {
                let value = coupon[header];
                if (value === null || value === undefined) return '';
                if (header === 'expires_at' && value) {
                    value = new Date(value).toISOString().split('T')[0];
                }
                // Wrap in quotes if contains comma
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            });
            csvContent += row.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=coupons.csv');
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Coupon export failed:', error);
        res.status(500).json({ message: error.message });
    }
};
