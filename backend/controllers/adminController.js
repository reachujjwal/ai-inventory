const db = require('../config/db');

exports.getPendingTenants = async (req, res) => {
    try {
        const [tenants] = await db.query('SELECT id, username, email, created_at FROM users WHERE role = "tenant" AND is_approved = 0');
        res.json(tenants);
    } catch (error) {
        console.error('Error fetching pending tenants:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.approveTenant = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('UPDATE users SET is_approved = 1 WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tenant not found' });
        }
        res.json({ message: 'Tenant approved successfully' });
    } catch (error) {
        console.error('Error approving tenant:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectTenant = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM users WHERE id = ? AND role = "tenant" AND is_approved = 0', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tenant not found or already approved' });
        }
        res.json({ message: 'Tenant rejected/deleted successfully' });
    } catch (error) {
        console.error('Error rejecting tenant:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
