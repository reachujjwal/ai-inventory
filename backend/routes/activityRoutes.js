const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, activityController.getActivities);

module.exports = router;
