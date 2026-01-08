const db = require('../config/db');

/**
 * Middleware to check granular permissions for a module
 * @param {string} moduleName - The name of the module (e.g., 'products', 'coupons')
 * @param {string} permissionField - The permission field to check (e.g., 'can_view', 'can_add')
 */
const checkPermission = (moduleName, permissionField) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { role } = req.user;

        // Admins have full access to everything - bypass DB check for performance if needed, 
        // but checking DB ensures synchronization with the ROLES table.
        // However, the requirement is "given access through RBAC", so we check DB.

        try {
            const [rows] = await db.query(
                'SELECT ?? FROM role_permissions WHERE role = ? AND module = ?',
                [permissionField, role, moduleName]
            );

            if (rows.length === 0 || !rows[0][permissionField]) {
                return res.status(403).json({
                    message: `Forbidden: You do not have ${permissionField.replace('can_', '')} permission for ${moduleName}`
                });
            }

            next();
        } catch (error) {
            console.error('Permission Check Error:', error);
            res.status(500).json({ message: 'Internal Server Error during permission check' });
        }
    };
};

module.exports = checkPermission;
