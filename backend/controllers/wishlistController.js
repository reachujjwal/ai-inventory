const db = require('../config/db');

exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const [wishlist] = await db.query(
            `SELECT w.product_id, p.name, p.price, p.image_url, p.description, i.stock_level 
             FROM wishlist w 
             JOIN products p ON w.product_id = p.id 
             LEFT JOIN inventory i ON p.id = i.product_id
             WHERE w.user_id = ?`,
            [userId]
        );
        res.json(wishlist);
    } catch (error) {
        console.error('Fetch wishlist error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id } = req.body;

        if (!product_id) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        await db.query(
            'INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)',
            [userId, product_id]
        );
        res.json({ message: 'Added to wishlist' });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        await db.query(
            'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );
        res.json({ message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
