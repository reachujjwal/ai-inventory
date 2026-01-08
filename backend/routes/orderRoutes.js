const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

router.post('/', auth, checkPermission('orders', 'can_add'), orderController.createOrder);
// Users can place their own orders without explicit permission
router.post('/checkout', auth, orderController.checkout);
router.get('/', auth, checkPermission('orders', 'can_view'), orderController.getOrders);
router.put('/:id/status', auth, checkPermission('orders', 'can_update'), orderController.updateOrderStatus);

module.exports = router;
