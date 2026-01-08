const db = require('./config/db');

async function checkDB() {
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'role_permissions'");
        console.log('Tables found:', tables);

        if (tables.length > 0) {
            const [rows] = await db.query("SELECT * FROM role_permissions");
            console.log('Role Permissions rows:', rows.length);
            console.log('Sample row:', rows[0]);
        } else {
            console.log('role_permissions table does NOT exist!');
        }
    } catch (err) {
        console.error('DB Check Error:', err);
    } finally {
        process.exit();
    }
}

checkDB();
