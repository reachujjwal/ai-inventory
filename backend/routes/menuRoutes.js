const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, menuController.getAllMenus);

module.exports = router;
