const fs = require('fs');
const path = require('path');
const db = require('./config/db');
require('dotenv').config();

const runMigration = async () => {
    try {
        console.log('Running coupon migration...');
        const migrationPath = path.join(__dirname, 'migrations', '006_add_coupons.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolon and filter out empty statements
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await db.query(statement);
        }

        console.log('Coupon migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
