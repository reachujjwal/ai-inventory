const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const auth = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

router.get('/', auth, checkPermission('permissions', 'can_view'), roleController.getRoles);

module.exports = router;
