const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

router.get('/', auth, checkPermission('sales', 'can_view'), salesController.getAllSales);
router.post('/', auth, checkPermission('sales', 'can_add'), salesController.recordSale);

module.exports = router;
