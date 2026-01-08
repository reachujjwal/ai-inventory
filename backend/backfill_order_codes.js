const db = require('./config/db');
require('dotenv').config();

const backfillOrderCodes = async () => {
    try {
        console.log('Starting backfill of order codes...');
        const connection = await db.getConnection();

        // 1. Get all orders with NULL order_code
        const [orders] = await connection.query('SELECT id, created_at FROM orders WHERE order_code IS NULL');

        console.log(`Found ${orders.length} orders to update.`);

        if (orders.length === 0) {
            console.log('No orders need updating.');
            connection.release();
            process.exit(0);
        }

        // 2. Update each order
        // We could optimize with a batch update or stored proc, but for data safety script loop is fine for now (assuming not millions of rows)
        // To be safe against timeouts, we'll process in chunks or just simple loop for this task environment.

        let updatedCount = 0;
        for (const order of orders) {
            // Create a unique code. Using timestamp and ID to ensure uniqueness and "legacy" look.
            // Format: ORD-LEGACY-{ID} to clearly distinguish them? Or just match new format?
            // User asked for "some unique order code". 
            // Matching new format "ORD-{Timestamp}-{Random}" might be confusing if timestamp is effectively now or order created_at.
            // Let's use "ORD-{YYYYMMDD}-{ID}" to be informative.

            const date = new Date(order.created_at);
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            const newCode = `ORD-${dateStr}-${order.id}`;

            await connection.query('UPDATE orders SET order_code = ? WHERE id = ?', [newCode, order.id]);
            updatedCount++;
            if (updatedCount % 100 === 0) process.stdout.write('.');
        }

        console.log(`\nSuccessfully backfilled ${updatedCount} orders.`);
        connection.release();
        process.exit(0);

    } catch (error) {
        console.error('Backfill failed:', error);
        process.exit(1);
    }
};

backfillOrderCodes();
