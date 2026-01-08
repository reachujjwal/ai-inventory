const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ['temp_admin', 'temp_admin@example.com', hashedPassword, 'admin']
        );
        console.log('Temporary admin created with ID:', result.insertId);
    } catch (err) {
        console.error('Error creating admin:', err.message);
    } finally {
        process.exit();
    }
}

createAdmin();
