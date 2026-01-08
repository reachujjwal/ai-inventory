const db = require('../config/db');

exports.getRoles = async (req, res) => {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'role'");
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Role column not found' });
        }
        const type = rows[0].Type; // e.g. enum('admin','user','branch_manager')
        const roles = type.match(/'([^']+)'/g).map(r => r.replace(/'/g, ''));
        res.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
