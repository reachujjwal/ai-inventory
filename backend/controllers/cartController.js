const db = require('../config/db');

exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT 
                ci.id, 
                ci.user_id, 
                ci.product_id, 
                ci.quantity, 
                p.name, 
                p.price, 
                p.image_url, 
                COALESCE(i.stock_level, 0) as stock_level 
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE ci.user_id = ?
        `;
        const [items] = await db.query(query, [userId]);

        // Format to match frontend CartItem interface
        const formattedItems = items.map(item => ({
            product_id: item.product_id,
            name: item.name,
            price: Number(item.price), // Ensure number
            quantity: item.quantity,
            image_url: item.image_url,
            stock_level: item.stock_level
        }));

        res.json(formattedItems);
    } catch (error) {
        console.error('Get Cart Error:', error);
        res.status(500).json({ message: 'Failed to fetch cart', error: error.message });
    }
};

exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id, quantity = 1 } = req.body;

        if (!product_id) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        // Check stock first from INVENTORY table
        const [[inventory]] = await db.query('SELECT stock_level FROM inventory WHERE product_id = ?', [product_id]);
        const stockLevel = inventory ? inventory.stock_level : 0;

        if (stockLevel === 0) {
            return res.status(400).json({ message: 'Product is out of stock' });
        }

        // Upsert logic: If exists, add quantity; else insert.
        // But we need to be careful not to exceed stock.
        // First check if item exists in cart to calc new quantity
        const [[existingItem]] = await db.query('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, product_id]);

        let newQuantity = quantity;
        if (existingItem) {
            newQuantity = existingItem.quantity + quantity;
        }

        if (newQuantity > stockLevel) {
            return res.status(400).json({ message: `Cannot add more. Only ${stockLevel} in stock.` });
        }

        const query = `
            INSERT INTO cart_items (user_id, product_id, quantity) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE quantity = quantity + ?
        `;
        await db.query(query, [userId, product_id, quantity, quantity]);

        res.json({ message: 'Item added to cart' });
    } catch (error) {
        console.error('Add to Cart Error:', error);
        res.status(500).json({ message: 'Failed to add item to cart', error: error.message });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.productId;
        const { quantity } = req.body;

        if (quantity < 1) {
            // If quantity < 1, remove item
            await db.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
            return res.json({ message: 'Item removed from cart' });
        }

        // Check stock from INVENTORY table
        const [[inventory]] = await db.query('SELECT stock_level FROM inventory WHERE product_id = ?', [productId]);
        const stockLevel = inventory ? inventory.stock_level : 0;

        if (quantity > stockLevel) {
            return res.status(400).json({ message: `Cannot update. Only ${stockLevel} in stock.` });
        }

        const query = 'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?';
        const [result] = await db.query(query, [quantity, userId, productId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        res.json({ message: 'Cart updated' });
    } catch (error) {
        console.error('Update Cart Error:', error);
        res.status(500).json({ message: 'Failed to update cart', error: error.message });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.productId;

        const query = 'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?';
        await db.query(query, [userId, productId]);

        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove from Cart Error:', error);
        res.status(500).json({ message: 'Failed to remove item', error: error.message });
    }
};

exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
        await db.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear Cart Error:', error);
        res.status(500).json({ message: 'Failed to clear cart', error: error.message });
    }
};
