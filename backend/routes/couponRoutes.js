const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

router.get('/', auth, checkPermission('coupons', 'can_view'), couponController.getAllCoupons);
router.get('/export', auth, checkPermission('coupons', 'can_export'), couponController.exportCoupons);
router.post('/', auth, checkPermission('coupons', 'can_add'), couponController.createCoupon);
router.put('/:id', auth, checkPermission('coupons', 'can_update'), couponController.updateCoupon);
router.delete('/:id', auth, checkPermission('coupons', 'can_delete'), couponController.deleteCoupon);
router.post('/validate', auth, couponController.validateCoupon);

module.exports = router;
