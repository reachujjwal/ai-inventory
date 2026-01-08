const db = require('./config/db');

async function checkUsers() {
    try {
        const [users] = await db.query("SELECT id, username, email, role FROM users");
        console.log('Users found:', users.length);
        console.table(users);
    } catch (err) {
        console.error('DB Check Error:', err);
    } finally {
        process.exit();
    }
}

checkUsers();
