const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');

exports.createCheckoutSession = async (req, res) => {
    const { items, coupon_code } = req.body;
    const userId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'No items provided' });
    }

    try {
        const lineItems = [];
        let cartTotal = 0;

        for (const item of items) {
            // Verify product exists and get current price
            const [products] = await db.query('SELECT name, price FROM products WHERE id = ?', [item.product_id]);

            if (products.length === 0) {
                throw new Error(`Product with ID ${item.product_id} not found`);
            }

            const product = products[0];
            const itemTotal = product.price * item.quantity;
            cartTotal += itemTotal;

            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product.name,
                    },
                    unit_amount: Math.round(product.price * 100), // Stripe expects cents
                },
                quantity: item.quantity,
            });
        }

        let discountParam = [];
        if (coupon_code) {
            const [coupons] = await db.query('SELECT * FROM coupons WHERE code = ? AND status = "active"', [coupon_code.toUpperCase()]);
            if (coupons.length > 0) {
                const coupon = coupons[0];
                if (cartTotal >= coupon.min_purchase_amount) {
                    let total_discount = 0;
                    if (coupon.discount_type === 'percentage') {
                        total_discount = (cartTotal * coupon.discount_value) / 100;
                    } else {
                        total_discount = coupon.discount_value;
                    }
                    total_discount = Math.min(total_discount, cartTotal);

                    // Create a temporary Stripe coupon
                    const stripeCoupon = await stripe.coupons.create({
                        amount_off: Math.round(total_discount * 100),
                        currency: 'usd',
                        duration: 'once',
                        name: `Coupon: ${coupon.code}`,
                    });

                    discountParam = [{ coupon: stripeCoupon.id }];
                }
            }
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            discounts: discountParam,
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cart`,
            metadata: {
                userId: userId.toString(),
                items: JSON.stringify(items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))),
                coupon_code: coupon_code || ''
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Session Error:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};
