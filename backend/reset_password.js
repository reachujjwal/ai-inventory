const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function resetPassword() {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);

    try {
        await db.query("UPDATE users SET password_hash = ? WHERE email = 'admin@gmail.com'", [hash]);
        console.log('Password updated successfully for admin@gmail.com');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

resetPassword();
