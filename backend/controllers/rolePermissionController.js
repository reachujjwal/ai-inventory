const db = require('../config/db');

exports.getAllRolePermissions = async (req, res) => {
    try {
        const [permissions] = await db.query('SELECT * FROM role_permissions');
        res.json(permissions);
    } catch (error) {
        console.error('Error fetching role permissions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getPermissionsByRole = async (req, res) => {
    const { role } = req.params;
    try {
        const [permissions] = await db.query('SELECT * FROM role_permissions WHERE role = ?', [role]);
        res.json(permissions);
    } catch (error) {
        console.error('Error fetching role permissions by role:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateRolePermission = async (req, res) => {
    const { role, module, can_view, can_add, can_update, can_delete, can_import, can_export } = req.body;
    try {
        await db.query(
            `INSERT INTO role_permissions 
            (role, module, can_view, can_add, can_update, can_delete, can_import, can_export) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            can_view = VALUES(can_view), 
            can_add = VALUES(can_add), 
            can_update = VALUES(can_update), 
            can_delete = VALUES(can_delete), 
            can_import = VALUES(can_import), 
            can_export = VALUES(can_export)`,
            [role, module, can_view, can_add, can_update, can_delete, can_import, can_export]
        );
        res.json({ message: 'Permission updated successfully' });
    } catch (error) {
        console.error('Error updating role permission:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateBulkPermissions = async (req, res) => {
    const { permissions } = req.body; // Array of permission objects

    if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ message: 'Invalid permissions data' });
    }

    // Filter out invalid entries (empty role or module)
    const validPermissions = permissions.filter(p => p.role && p.role.trim() !== '' && p.module && p.module.trim() !== '');

    if (validPermissions.length === 0) {
        return res.status(400).json({ message: 'No valid permissions to update' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const p of validPermissions) {
            await connection.query(
                `INSERT INTO role_permissions 
                (role, module, can_view, can_add, can_update, can_delete, can_import, can_export) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                can_view = VALUES(can_view), 
                can_add = VALUES(can_add), 
                can_update = VALUES(can_update), 
                can_delete = VALUES(can_delete), 
                can_import = VALUES(can_import), 
                can_export = VALUES(can_export)`,
                [p.role, p.module, p.can_view, p.can_add, p.can_update, p.can_delete, p.can_import, p.can_export]
            );
        }
        await connection.commit();
        res.json({ message: 'Bulk permissions updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating bulk role permissions:', error);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        connection.release();
    }
};
