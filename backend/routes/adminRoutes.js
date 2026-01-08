const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware'); // Assuming this exists
// const checkRole = require('../middleware/roleMiddleware'); // If needed

// Protect all admin routes
// router.use(auth); // Or apply individually

// Get pending tenants
router.get('/tenants/pending', auth, adminController.getPendingTenants);

// Approve tenant
router.put('/tenants/:id/approve', auth, adminController.approveTenant);

// Reject tenant
router.delete('/tenants/:id', auth, adminController.rejectTenant);

module.exports = router;
