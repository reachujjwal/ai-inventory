const db = require('./config/db');
const bcrypt = require('bcryptjs');

// Helper for randoms
const rInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function seed() {
    console.log('Starting seed...');

    try {
        // 1. Branches (Ensure we have a few)
        console.log('Seeding Branches...');
        const branches = ['Main Branch', 'North User Hub', 'South Distribution', 'East Retail', 'West Outpost'];
        const branchIds = [];

        for (const name of branches) {
            await db.query(`INSERT INTO branches (name, location) VALUES (?, 'Simulated Location') ON DUPLICATE KEY UPDATE name=name`, [name]);
        }

        const [branchRows] = await db.query('SELECT id FROM branches');
        branchRows.forEach(r => branchIds.push(r.id));

        // 2. Users (500)
        console.log('Seeding Users (500)...');
        const userIds = [];
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password', salt); // Shared hash for speed

        const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

        const userValues = [];
        // Insert in batches of 100 to avoid packet size issues
        for (let i = 0; i < 500; i++) {
            const fn = rItem(firstNames);
            const ln = rItem(lastNames);
            const username = `${fn.toLowerCase()}.${ln.toLowerCase()}${rInt(1, 99999)}`;
            const email = `${username}@example.com`;
            const role = Math.random() < 0.05 ? 'admin' : (Math.random() < 0.1 ? 'branch_manager' : 'user');
            const branch = rItem(branchIds);
            // We'll execute single inserts or smaller batches. Let's do loop for simplicity unless specific req.
            // Batching is better.
            userValues.push([username, email, hash, role, branch]);
        }

        // Batch insert users
        for (let i = 0; i < userValues.length; i += 100) {
            const batch = userValues.slice(i, i + 100);
            await db.query('INSERT IGNORE INTO users (username, email, password_hash, role, branch_id) VALUES ?', [batch]);
        }

        // Get all User IDs for linking
        const [allUsers] = await db.query('SELECT id FROM users');
        allUsers.forEach(u => userIds.push(u.id));

        // 3. Categories (Ensure we have some)
        console.log('Seeding Categories...');
        const categoryNames = ['Electronics', 'Furniture', 'Accessories', 'Office', 'Kitchen', 'Outdoor'];
        const categoryIds = [];

        for (const catName of categoryNames) {
            await db.query(`INSERT INTO categories (name, description) VALUES (?, 'Simulated Category') ON DUPLICATE KEY UPDATE name=name`, [catName]);
        }

        const [catRows] = await db.query('SELECT id FROM categories');
        catRows.forEach(r => categoryIds.push(r.id));

        // 4. Products & Inventory (500)
        console.log('Seeding Products (500)...');
        const adjectives = ['Ergonomic', 'Rustic', 'Smart', 'Sleek', 'Vintage', 'Modern', 'Durable', 'Wireless'];
        const materials = ['Steel', 'Wooden', 'Concrete', 'Plastic', 'Leather', 'Glass'];
        const productTypes = ['Chair', 'Table', 'Lamp', 'Keyboard', 'Mouse', 'Monitor', 'Desk', 'Shelf'];

        const productIds = [];

        for (let i = 0; i < 500; i++) {
            const name = `${rItem(adjectives)} ${rItem(materials)} ${rItem(productTypes)} ${rInt(100, 999)}`;
            const desc = `A very fine ${name} for your daily needs.`;
            const price = rInt(20, 1500) + 0.99;
            const catId = rItem(categoryIds); // Use category_id

            const [res] = await db.query('INSERT INTO products (name, description, price, category_id, sku) VALUES (?, ?, ?, ?, ?)',
                [name, desc, price, catId, `SKU-${rInt(10000, 999999)}-${i}`]);

            const pid = res.insertId;
            productIds.push({ id: pid, price: price });

            // Inventory
            const stock = rInt(0, 200);
            const threshold = rInt(5, 20);
            await db.query('INSERT INTO inventory (product_id, stock_level, reorder_threshold, last_updated) VALUES (?, ?, ?, NOW())', [pid, stock, threshold]);
        }

        // 5. Orders & Sales (500)
        console.log('Seeding Orders & Sales (500)...');
        const statuses = ['pending', 'completed', 'cancelled']; // 'completed' matches schema enum

        for (let i = 0; i < 500; i++) {
            const uid = rItem(userIds);
            const status = rItem(statuses);
            const orderDate = rDate(new Date(2025, 0, 1), new Date());

            // Order logic: Schema requires product_id in orders items. 
            // Assuming 1 order = 1 main product for this schema version
            const prod = rItem(productIds);
            const qty = rInt(1, 5);
            const totalAmount = prod.price * qty;

            const [oRes] = await db.query('INSERT INTO orders (user_id, status, total_amount, created_at, product_id, quantity) VALUES (?, ?, ?, ?, ?, ?)',
                [uid, status, totalAmount, orderDate, prod.id, qty]);
            const oid = oRes.insertId;

            // Create Sales Record (Mirroring the order for dashedboard stats)
            // Schema has order_id, product_id, quantity, total_amount, sale_date
            // Removed payment_method as it might not be in schema
            await db.query('INSERT INTO sales (order_id, product_id, quantity, total_amount, sale_date) VALUES (?, ?, ?, ?, ?)',
                [oid, prod.id, qty, totalAmount, orderDate]);
        }

        console.log('Seeding Complete! Added ~500 records per module.');
        process.exit();
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
