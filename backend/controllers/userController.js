const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;
        console.log(`Fetching users for requester: ${userId}, role: ${userRole}`);

        let query = `
            SELECT u.id, u.username, u.email, u.role, u.image_url, u.is_approved, u.created_at, u.updated_at,
                   u1.username as created_by_name, 
                   u2.username as updated_by_name
            FROM users u
            LEFT JOIN users u1 ON u.created_by = u1.id
            LEFT JOIN users u2 ON u.updated_by = u2.id
        `;
        let params = [];

        if (userRole !== 'admin') {
            query += ' WHERE u.id = ?';
            params.push(userId);
        } else {
            // Requirement: "remove Admin role contanin data in User listing except admin@gmail.com"
            query += " WHERE (u.role != 'admin' OR u.email = ?)";
            params.push('admin@gmail.com');
        }

        query += ' ORDER BY u.created_at DESC';

        const [users] = await db.query(query, params);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPendingTenants = async (req, res) => {
    try {
        const [tenants] = await db.query(
            `SELECT u.id, u.username, u.email, u.created_at 
             FROM users u 
             WHERE u.role = 'tenant' AND u.is_approved = 0
             ORDER BY u.created_at DESC`
        );
        res.json(tenants);
    } catch (error) {
        console.error('Error fetching pending tenants:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.approveTenant = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query(
            'UPDATE users SET is_approved = 1, updated_by = ?, updated_at = NOW() WHERE id = ? AND role = \'tenant\'',
            [req.user.id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        res.json({ message: 'Tenant approved successfully' });
    } catch (error) {
        console.error('Error approving tenant:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.rejectTenant = async (req, res) => {
    const { id } = req.params;
    try {
        // Get image path before deleting
        const [user] = await db.query('SELECT image_url FROM users WHERE id = ? AND role = \'tenant\'', [id]);

        if (user.length === 0) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        await db.query('DELETE FROM users WHERE id = ? AND role = \'tenant\'', [id]);

        // Delete image file if exists
        if (user[0].image_url) {
            const fs = require('fs');
            const imagePath = '.' + user[0].image_url;
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.json({ message: 'Tenant rejected and removed' });
    } catch (error) {
        console.error('Error rejecting tenant:', error);
        res.status(500).json({ message: error.message });
    }
};


exports.createUser = async (req, res) => {
    const { username, email, password, role } = req.body;
    const image_url = req.file ? `/uploads/users/${req.file.filename}` : null;

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash, role, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, password_hash, role || 'user', image_url, req.user.id]
        );
        res.status(201).json({ id: result.insertId, username, email, role, image_url });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, email, role, password } = req.body;

    try {
        let password_hash = null;
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            password_hash = await bcrypt.hash(password, salt);
        }

        // If new image uploaded, delete old one and use new
        if (req.file) {
            // Get old image path
            const [oldUser] = await db.query('SELECT image_url FROM users WHERE id = ?', [id]);
            if (oldUser.length > 0 && oldUser[0].image_url) {
                const fs = require('fs');
                const oldPath = '.' + oldUser[0].image_url;
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            const image_url = `/uploads/users/${req.file.filename}`;

            let query = 'UPDATE users SET username=?, role=?, image_url=?, updated_by=?, updated_at=NOW()';
            let params = [username, role, image_url, req.user.id];

            if (password_hash) {
                query += ', password_hash=?';
                params.push(password_hash);
            }
            query += ' WHERE id=?';
            params.push(id);

            await db.query(query, params);
        } else {
            let query = 'UPDATE users SET username=?, role=?, updated_by=?, updated_at=NOW()';
            let params = [username, role, req.user.id];

            if (password_hash) {
                query += ', password_hash=?';
                params.push(password_hash);
            }
            query += ' WHERE id=?';
            params.push(id);

            await db.query(query, params);
        }

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        // Get image path before deleting
        const [user] = await db.query('SELECT image_url FROM users WHERE id = ?', [id]);

        await db.query('DELETE FROM users WHERE id = ?', [id]);

        // Delete image file if exists
        if (user.length > 0 && user[0].image_url) {
            const fs = require('fs');
            const imagePath = '.' + user[0].image_url;
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
