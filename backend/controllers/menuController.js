const db = require('../config/db');

exports.getAllMenus = async (req, res) => {
    try {
        const [menus] = await db.query('SELECT * FROM menus WHERE is_active = 1 ORDER BY sort_order ASC');
        res.json(menus);
    } catch (error) {
        console.error('Error fetching menus:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
