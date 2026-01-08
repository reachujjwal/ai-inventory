const db = require('../config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { logActivity } = require('../utils/activityLogger');

exports.checkout = async (req, res) => {
    let { items, stripe_session_id, payment_method } = req.body;
    const user_id = req.user.id;
    let connection;

    try {
        connection = await db.getConnection();

        if (stripe_session_id) {
            // Retrieve session from Stripe to verify payment and get items
            const session = await stripe.checkout.sessions.retrieve(stripe_session_id);
            if (session.payment_status !== 'paid') {
                return res.status(400).json({ message: 'Payment not completed' });
            }
            // Parse items from metadata
            items = JSON.parse(session.metadata.items);
            payment_method = 'card';
            // Retrieve coupon_code if it was passed via metadata
            if (session.metadata.coupon_code) {
                req.body.coupon_code = session.metadata.coupon_code;
            }
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'No items in checkout' });
        }

        await connection.beginTransaction();

        // Generate unique Order Code for this checkout session
        const orderCode = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        let coupon_id = null;
        let total_discount_for_order = 0;
        let cartTotal = 0;

        // Calculate cart total for all checkouts (needed for proportional discount and validation)
        for (const item of items) {
            const [p] = await connection.query('SELECT price FROM products WHERE id = ?', [item.product_id]);
            if (p.length > 0) cartTotal += p[0].price * item.quantity;
        }

        const { coupon_code, reward_points_to_use } = req.body;

        // --- REWARD POINTS REDEMPTION (User role only) ---
        let reward_discount = 0;
        let points_to_redeem = 0;

        if (reward_points_to_use && req.user.role === 'user') {
            const [systemSettings] = await connection.query('SELECT setting_value FROM reward_settings WHERE setting_key = "enable_rewards"');
            const isEnabled = systemSettings.length > 0 ? systemSettings[0].setting_value === '1' : true;

            if (isEnabled) {
                const [userResult] = await connection.query('SELECT reward_points FROM users WHERE id = ?', [user_id]);
                const availablePoints = userResult[0]?.reward_points || 0;

                const [minRedeemSetting] = await connection.query('SELECT setting_value FROM reward_settings WHERE setting_key = "min_redemption_points"');
                const minRedeem = minRedeemSetting.length > 0 ? parseInt(minRedeemSetting[0].setting_value) : 1;

                if (availablePoints >= minRedeem) {
                    points_to_redeem = Math.min(parseInt(reward_points_to_use), availablePoints, cartTotal);
                    reward_discount = points_to_redeem; // 1 point = $1
                }
            }
        }
        // ---------------------------

        if (coupon_code) {
            const [coupons] = await connection.query(
                'SELECT * FROM coupons WHERE code = ? AND status = "active"',
                [coupon_code.toUpperCase()]
            );

            if (coupons.length > 0) {
                const coupon = coupons[0];
                if (cartTotal >= coupon.min_purchase_amount) {
                    coupon_id = coupon.id;
                    if (coupon.discount_type === 'percentage') {
                        total_discount_for_order = (cartTotal * coupon.discount_value) / 100;
                    } else {
                        total_discount_for_order = coupon.discount_value;
                    }
                    total_discount_for_order = Math.min(total_discount_for_order, cartTotal);

                    // Update coupon usage
                    await connection.query('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?', [coupon_id]);
                }
            }
        }

        // --- PRE-CALCULATE REWARD POINTS EARNING ---
        let totalPointsEarned = 0;
        if (req.user.role === 'user') {
            const [systemSettings] = await connection.query('SELECT setting_value FROM reward_settings WHERE setting_key = "enable_rewards"');
            const isEnabled = systemSettings.length > 0 ? systemSettings[0].setting_value === '1' : true;

            if (isEnabled) {
                const finalAmount = cartTotal - total_discount_for_order - reward_discount;
                const [rules] = await connection.query(
                    `SELECT id, reward_type, points_multiplier, fixed_points FROM reward_point_rules 
                    WHERE is_active = 1 
                    AND min_purchase_amount <= ? 
                    AND (max_purchase_amount IS NULL OR max_purchase_amount >= ?)
                    ORDER BY min_purchase_amount DESC LIMIT 1`,
                    [finalAmount, finalAmount]
                );

                if (rules.length > 0) {
                    const rule = rules[0];
                    req.reward_rule_id = rule.id; // Store for order insertion
                    if (rule.reward_type === 'fixed' && rule.fixed_points !== null) {
                        totalPointsEarned = parseInt(rule.fixed_points);
                    } else if (rule.reward_type === 'percentage' && rule.points_multiplier !== null) {
                        totalPointsEarned = Math.floor(finalAmount * (parseFloat(rule.points_multiplier) / 100));
                    } else if (rule.reward_type === 'step' && rule.fixed_points !== null) {
                        totalPointsEarned = Math.floor(finalAmount / 100) * parseInt(rule.fixed_points);
                    } else {
                        const multiplier = parseFloat(rule.points_multiplier) || 1.0;
                        totalPointsEarned = Math.floor(finalAmount * multiplier);
                    }
                }
            }
        }
        // ------------------------------------------

        // FIX: If user is redeeming points, they cannot earn points on this order
        if (points_to_redeem > 0) {
            totalPointsEarned = 0;
            req.reward_rule_id = null; // Clear the rule ID since no points are earned
        }

        let isFirstItem = true;
        for (const item of items) {
            // 1. Get Product Details & Lock Row
            const [products] = await connection.query(
                'SELECT price, name FROM products WHERE id = ?',
                [item.product_id]
            );

            if (products.length === 0) {
                throw new Error(`Product ID ${item.product_id} not found`);
            }

            // 2. Check Inventory & Lock Row
            const [inventory] = await connection.query(
                'SELECT stock_level FROM inventory WHERE product_id = ? FOR UPDATE',
                [item.product_id]
            );

            if (inventory.length === 0 || inventory[0].stock_level < item.quantity) {
                throw new Error(`Insufficient stock for product: ${products[0].name}`);
            }

            // 3. Deduct Inventory
            await connection.query(
                'UPDATE inventory SET stock_level = stock_level - ? WHERE product_id = ?',
                [item.quantity, item.product_id]
            );

            const item_subtotal = products[0].price * item.quantity;
            const item_discount = (item_subtotal / (cartTotal || 1)) * total_discount_for_order;
            const item_reward_discount = (item_subtotal / (cartTotal || 1)) * reward_discount;
            const final_item_total = item_subtotal - item_discount - item_reward_discount;

            // Assign points only to the first item record to avoid duplication
            const pointsToStore = isFirstItem ? totalPointsEarned : 0;
            isFirstItem = false;

            await connection.query(
                'INSERT INTO orders (product_id, quantity, total_amount, user_id, status, created_by, order_code, payment_method, coupon_id, discount_amount, reward_points_used, reward_discount_amount, reward_points_earned, reward_rule_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [item.product_id, item.quantity, final_item_total, user_id, 'confirmed', user_id, orderCode, payment_method || 'cod', coupon_id, item_discount, Math.floor(item_reward_discount), item_reward_discount, pointsToStore, isFirstItem ? req.reward_rule_id : null]
            );
        }

        // --- REWARD POINTS DEDUCTION (User role only) ---
        if (points_to_redeem > 0 && req.user.role === 'user') {
            await connection.query('UPDATE users SET reward_points = reward_points - ? WHERE id = ?', [points_to_redeem, user_id]);
            await connection.query(
                'INSERT INTO reward_logs (user_id, points, type, reference_id) VALUES (?, ?, ?, ?)',
                [user_id, -points_to_redeem, 'redeem', orderCode]
            );
        }

        // --- REWARD POINTS CREDITING (Immediate) ---
        if (totalPointsEarned > 0 && req.user.role === 'user') {
            await connection.query('UPDATE users SET reward_points = reward_points + ? WHERE id = ?', [totalPointsEarned, user_id]);
            await connection.query(
                'INSERT INTO reward_logs (user_id, points, type, reference_id) VALUES (?, ?, ?, ?)',
                [user_id, totalPointsEarned, 'purchase', orderCode]
            );
        }
        // ------------------------------------------

        await connection.commit();
        await logActivity(user_id, 'Placed Order', 'order', null, { order_code: orderCode, items_count: items.length, total: cartTotal });

        res.status(201).json({
            message: 'Order placed successfully',
            points_earned: totalPointsEarned,
            points_redeemed: points_to_redeem
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Checkout failed:', error);
        res.status(400).json({ message: error.message || 'Checkout failed' });
    } finally {
        if (connection) connection.release();
    }
};

// Kept for backward compatibility if needed, but not used by cart flow
exports.createOrder = async (req, res) => {
    res.status(400).json({ message: 'Please use checkout endpoint' });
};

exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status, cancel_reason, cancel_remarks } = req.body; // pending, approved, shipped, delivered, cancelled

    if (req.user.role === 'user' && status !== 'cancelled') {
        return res.status(403).json({ message: 'Users can only cancel orders' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get current order status
        const [orders] = await connection.query('SELECT * FROM orders WHERE id = ?', [id]);
        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];
        const oldStatus = order.status;

        if (oldStatus === status) {
            return res.status(400).json({ message: 'Order is already in this status' });
        }

        if (oldStatus === 'delivered' || oldStatus === 'cancelled') {
            return res.status(400).json({ message: `Cannot change status of a ${oldStatus} order` });
        }

        // 2. If status change to 'delivered', perform inventory and sales updates
        if (status === 'delivered') {
            // Record Sale
            await connection.query(
                'INSERT INTO sales (product_id, quantity, total_amount, order_id, created_by) VALUES (?, ?, ?, ?, ?)',
                [order.product_id, order.quantity, order.total_amount, id, req.user.id]
            );
        }

        // 3. Update Order Status
        let query = 'UPDATE orders SET status = ?, updated_by = ?, updated_at = NOW()';
        const params = [status, req.user.id];

        if (status === 'cancelled') {
            query += ', cancel_reason = ?, cancel_remarks = ?';
            params.push(cancel_reason || null, cancel_remarks || null);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await connection.query(query, params);

        // --- REWARD POINTS HANDLING ON STATUS CHANGE ---
        if (status === 'cancelled') {
            // 1. REFUND REDEEMED POINTS
            const [ptsUsed] = await connection.query(
                'SELECT SUM(reward_points_used) as total_used, user_id, order_code FROM orders WHERE order_code = ? GROUP BY user_id, order_code',
                [order.order_code]
            );

            if (ptsUsed.length > 0 && ptsUsed[0].total_used > 0) {
                const { total_used, user_id, order_code } = ptsUsed[0];
                await connection.query('UPDATE users SET reward_points = reward_points + ? WHERE id = ?', [total_used, user_id]);
                await connection.query(
                    'INSERT INTO reward_logs (user_id, points, type, reference_id) VALUES (?, ?, ?, ?)',
                    [user_id, total_used, 'refund', order_code]
                );
            }

            // 2. REVERSE EARNED POINTS
            const [ptsEarned] = await connection.query(
                'SELECT SUM(reward_points_earned) as total_earned, user_id, order_code FROM orders WHERE order_code = ? GROUP BY user_id, order_code',
                [order.order_code]
            );

            if (ptsEarned.length > 0 && ptsEarned[0].total_earned > 0) {
                const { total_earned, user_id, order_code } = ptsEarned[0];
                // Check if user has enough points to reverse (optimistic: just deduct, can go negative or stop at 0? Let's just deduct)
                await connection.query('UPDATE users SET reward_points = CASE WHEN reward_points >= ? THEN reward_points - ? ELSE 0 END WHERE id = ?', [total_earned, total_earned, user_id]);
                await connection.query(
                    'INSERT INTO reward_logs (user_id, points, type, reference_id) VALUES (?, ?, ?, ?)',
                    [user_id, -total_earned, 'reversal', order_code]
                );
            }
        }
        // -----------------------------------------------

        await connection.commit();
        await logActivity(req.user.id, `Order ${status}`, 'order', id, { order_code: order.order_code, status });

        res.json({ message: `Order status updated to ${status}` });

    } catch (error) {
        await connection.rollback();
        console.error('Status update failed:', error);
        res.status(500).json({ message: error.message || 'Failed to update status' });
    } finally {
        connection.release();
    }
};

exports.getOrders = async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase();
        const userId = req.user.id;

        let query = `
            SELECT o.id, o.quantity, o.total_amount, o.status, o.created_at, o.updated_at, o.order_code, o.product_id, o.discount_amount, o.reward_points_used, o.reward_discount_amount,
                   p.name as product_name, p.image_url as product_image, p.sku as product_sku,
                   u.username as user_name,
                   u1.username as placed_by,
                   u2.username as updated_by_name,
                   c.code as coupon_code
            FROM orders o
            JOIN products p ON o.product_id = p.id
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN users u1 ON o.created_by = u1.id
            LEFT JOIN users u2 ON o.updated_by = u2.id
            LEFT JOIN coupons c ON o.coupon_id = c.id
        `;
        let params = [];

        if (userRole !== 'admin' && userRole !== 'tenant') {
            query += ' WHERE o.user_id = ?';
            params.push(userId);
        } else if (userRole === 'tenant') {
            // Filter orders containing products created by this tenant
            query += ' WHERE p.created_by = ?';
            params.push(userId);
        }

        query += ' ORDER BY o.created_at DESC';
        const [orders] = await db.query(query, params);
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
