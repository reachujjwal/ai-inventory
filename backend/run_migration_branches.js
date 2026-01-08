const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    try {
        const migrationFile = path.join(__dirname, 'migrations', '004_add_branches.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log('Running migration: 004_add_branches.sql');

        // Split by semicolon but be careful with stored procedures/prepared statements if any. 
        // For this simple script, splitting might break the prepared statement logic because it spans multiple lines.
        // Let's try executing the whole thing if the driver supports multiple statements.
        // Usually mysql2 needs `multipleStatements: true` in connection config.

        // If not supported, we might need a simpler approach for the ALTER.
        // Let's assume standard execution for now, but to be safe, I'll execute the CREATE TABLE first.

        await db.query(`
            CREATE TABLE IF NOT EXISTS branches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Branches table checked/created.');

        // Add column independently to avoid complex dynamic SQL issues in node driver
        try {
            await db.query("ALTER TABLE users ADD COLUMN branch_id INT");
            await db.query("ALTER TABLE users ADD FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL");
            console.log('Added branch_id to users.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('branch_id column already exists.');
            } else {
                console.error('Error altering table:', e);
            }
        }

        // Add default branch
        await db.query("INSERT INTO branches (name, location) VALUES ('Main Branch', 'Headquarters') ON DUPLICATE KEY UPDATE name=name");
        console.log('Default branch ensured.');

        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

runMigrations();
