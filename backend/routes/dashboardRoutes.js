const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

router.get('/stats', auth, checkPermission('dashboard', 'can_view'), dashboardController.getStats);
router.get('/chart-data', auth, checkPermission('dashboard', 'can_view'), dashboardController.getChartData);
router.get('/top-products', auth, checkPermission('dashboard', 'can_view'), dashboardController.getTopSellingProducts);

module.exports = router;
