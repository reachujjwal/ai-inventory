const fs = require('fs');
const path = require('path');
const db = require('./config/db');
require('dotenv').config();

const runMigration = async () => {
    try {
        console.log('Checking if order_code column exists...');

        // Check if column exists
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_code'
        `, [process.env.DB_NAME || 'inventory_db']); // Default to inventory_db if env not set, but env should be loaded

        if (columns.length > 0) {
            console.log('Column order_code already exists. Skipping.');
        } else {
            console.log('Column does not exist. Adding...');
            await db.query('ALTER TABLE orders ADD COLUMN order_code VARCHAR(50) DEFAULT NULL');
            console.log('Column added successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
