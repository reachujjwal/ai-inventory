const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

// Public-facing rules (still requires auth and permission now)
router.get('/rules', auth, checkPermission('rewards', 'can_view'), rewardController.getRewardRules);

// User specific routes
router.get('/history', auth, checkPermission('rewards', 'can_view'), rewardController.getRewardHistory);
router.get('/history/all', auth, checkPermission('rewards', 'can_view'), rewardController.getAllHistory);
router.get('/balance', auth, checkPermission('rewards', 'can_view'), rewardController.getRewardBalance);

// Management routes
router.post('/rules', auth, checkPermission('rewards', 'can_add'), rewardController.createRule);
router.put('/rules/:id', auth, checkPermission('rewards', 'can_update'), rewardController.updateRule);
router.delete('/rules/:id', auth, checkPermission('rewards', 'can_delete'), rewardController.deleteRule);
router.get('/settings', auth, checkPermission('rewards', 'can_view'), rewardController.getSettings);
router.put('/settings', auth, checkPermission('rewards', 'can_update'), rewardController.updateSettings);

module.exports = router;
