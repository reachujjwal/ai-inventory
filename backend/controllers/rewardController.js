const db = require('../config/db');
const { logActivity } = require('../utils/activityLogger');

exports.getRewardHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const [logs] = await db.query(
            `SELECT id, points, type, reference_id, created_at 
             FROM reward_logs 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json(logs);
    } catch (error) {
        console.error('Error fetching reward history:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllHistory = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;

        // Pagination and Filter params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const type = req.query.type;
        const search = req.query.search;

        let queryBase = `
            FROM reward_logs rl
            JOIN users u ON rl.user_id = u.id
        `;
        let whereClauses = [];
        let params = [];

        // Tenant filtering (existing logic)
        if (userRole === 'tenant') {
            queryBase += `
                JOIN orders o ON rl.reference_id = o.order_code
                JOIN reward_point_rules rpr ON o.reward_rule_id = rpr.id
            `;
            whereClauses.push('rpr.created_by = ?');
            params.push(userId);
        }

        // Type filtering
        if (type && type !== 'all') {
            whereClauses.push('rl.type = ?');
            params.push(type);
        }

        // Search filtering
        if (search) {
            whereClauses.push('(u.username LIKE ? OR u.email LIKE ? OR rl.reference_id LIKE ?)');
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Construct WHERE string
        const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        // Count Total
        const countQuery = `SELECT COUNT(*) as total ${queryBase} ${whereSql}`;
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        // Fetch Data
        const dataQuery = `
            SELECT rl.id, rl.points, rl.type, rl.reference_id, rl.created_at, u.username as user_name, u.email as user_email
            ${queryBase}
            ${whereSql}
            ORDER BY rl.created_at DESC
            LIMIT ? OFFSET ?
        `;

        // Add limit/offset to params
        const dataParams = [...params, limit, offset];
        const [logs] = await db.query(dataQuery, dataParams);

        res.json({
            data: logs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching all reward history:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getRewardBalance = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await db.query(
            'SELECT reward_points FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ balance: users[0].reward_points || 0 });
    } catch (error) {
        console.error('Error fetching reward balance:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getRewardRules = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;

        let query = `SELECT id, min_purchase_amount, max_purchase_amount, reward_type, points_multiplier, fixed_points, description 
                     FROM reward_point_rules 
                     WHERE is_active = 1`;
        let params = [];

        if (userRole !== 'admin' && userRole !== 'user') {
            query += ' AND created_by = ?';
            params.push(userId);
        }

        query += ' ORDER BY min_purchase_amount ASC';
        const [rules] = await db.query(query, params);

        res.json(rules);
    } catch (error) {
        console.error('Error fetching reward rules:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.createRule = async (req, res) => {
    try {
        const { min_purchase_amount, max_purchase_amount, reward_type, points_multiplier, fixed_points, description } = req.body;
        const userId = req.user.id;

        const [result] = await db.query(
            `INSERT INTO reward_point_rules (min_purchase_amount, max_purchase_amount, reward_type, points_multiplier, fixed_points, description, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [min_purchase_amount, max_purchase_amount, reward_type || 'multiplier', points_multiplier || 1.0, fixed_points || null, description, userId]
        );

        await logActivity(userId, 'Created Reward Rule', 'reward_rule', result.insertId, { description });

        res.status(201).json({ message: 'Reward rule created successfully' });
    } catch (error) {
        console.error('Error creating reward rule:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateRule = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_purchase_amount, max_purchase_amount, reward_type, points_multiplier, fixed_points, description, is_active } = req.body;
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;

        // Ownership check
        if (userRole !== 'admin') {
            const [existing] = await db.query('SELECT created_by FROM reward_point_rules WHERE id = ?', [id]);
            if (existing.length === 0 || existing[0].created_by !== userId) {
                return res.status(403).json({ message: 'Unauthorized to update this reward rule' });
            }
        }

        await db.query(
            `UPDATE reward_point_rules 
             SET min_purchase_amount = ?, max_purchase_amount = ?, reward_type = ?, points_multiplier = ?, fixed_points = ?, description = ?, is_active = ?, updated_by = ?
             WHERE id = ?`,
            [min_purchase_amount, max_purchase_amount, reward_type, points_multiplier, fixed_points, description, is_active, userId, id]
        );

        await logActivity(userId, 'Updated Reward Rule', 'reward_rule', id, { description });

        res.json({ message: 'Reward rule updated successfully' });
    } catch (error) {
        console.error('Error updating reward rule:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteRule = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;

        // Ownership check
        if (userRole !== 'admin') {
            const [existing] = await db.query('SELECT created_by FROM reward_point_rules WHERE id = ?', [id]);
            if (existing.length === 0 || existing[0].created_by !== userId) {
                return res.status(403).json({ message: 'Unauthorized to delete this reward rule' });
            }
        }

        await db.query('DELETE FROM reward_point_rules WHERE id = ?', [id]);

        await logActivity(userId, 'Deleted Reward Rule', 'reward_rule', id);

        res.json({ message: 'Reward rule deleted successfully' });
    } catch (error) {
        console.error('Error deleting reward rule:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const [settings] = await db.query('SELECT * FROM reward_settings ORDER BY setting_key');

        // Convert to key-value object
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = req.body; // { daily_login_bonus: '10', ... }
        const userId = req.user.id;
        const userRole = req.user.role?.toLowerCase();

        // Only admins can update global settings
        if (userRole !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized to update global reward settings' });
        }

        for (const [key, value] of Object.entries(settings)) {
            await db.query(
                'UPDATE reward_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
                [value, userId, key]
            );
        }

        await logActivity(userId, 'Updated Reward Settings', 'reward_settings', null, settings);

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
