const api = require('axios'); // Placeholder for manual testing logic or script
const db = require('./config/db');

async function testCoupons() {
    try {
        console.log('Testing Coupon Creation...');
        const [res] = await db.query(
            "INSERT INTO coupons (code, discount_type, discount_value, min_purchase_amount, status) VALUES ('SAVE20', 'percentage', 20, 100, 'active')"
        );
        console.log('Created SAVE20 coupon with ID:', res.insertId);

        const [res2] = await db.query(
            "INSERT INTO coupons (code, discount_type, discount_value, min_purchase_amount, status) VALUES ('FLAT50', 'fixed', 50, 200, 'active')"
        );
        console.log('Created FLAT50 coupon with ID:', res2.insertId);

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testCoupons();
