const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/authMiddleware');

router.post('/create-checkout-session', auth, paymentController.createCheckoutSession);

module.exports = router;
