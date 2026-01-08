const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, wishlistController.getWishlist);
router.post('/', auth, wishlistController.addToWishlist);
router.delete('/:productId', auth, wishlistController.removeFromWishlist);

module.exports = router;
