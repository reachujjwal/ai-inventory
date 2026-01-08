const express = require('express');
const router = express.Router();
const rolePermissionController = require('../controllers/rolePermissionController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

// Get all permissions (Admin only)
router.get('/', auth, checkPermission('permissions', 'can_view'), rolePermissionController.getAllRolePermissions);

// Get permissions for a specific role (Admin only)
router.get('/:role', auth, checkPermission('permissions', 'can_view'), rolePermissionController.getPermissionsByRole);

// Update a specific module's permission for a role (Admin only)
router.post('/update', auth, checkPermission('permissions', 'can_update'), rolePermissionController.updateRolePermission);

// Bulk update permissions (Admin only)
router.post('/bulk-update', auth, checkPermission('permissions', 'can_update'), rolePermissionController.updateBulkPermissions);

module.exports = router;
