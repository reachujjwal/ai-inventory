const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', auth, authController.changePassword);
router.get('/me', auth, authController.getCurrentUser);

module.exports = router;
