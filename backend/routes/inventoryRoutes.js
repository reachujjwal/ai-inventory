const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

router.get('/', auth, checkPermission('inventory', 'can_view'), inventoryController.getAllInventory);
router.put('/', auth, checkPermission('inventory', 'can_update'), inventoryController.updateStock);
router.put('/adjust', auth, checkPermission('inventory', 'can_update'), inventoryController.adjustStock);
router.get('/alerts', auth, checkPermission('inventory', 'can_view'), inventoryController.getLowStockAlerts);

module.exports = router;
