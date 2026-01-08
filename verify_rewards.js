const db = require('./backend/config/db');

async function verifyRewards() {
    try {
        console.log('Verifying Reward Points System...');

        // Check columns
        const [userCols] = await db.query('DESCRIBE users');
        const hasPoints = userCols.some(c => c.Field === 'reward_points');
        const hasLastLogin = userCols.some(c => c.Field === 'last_login_reward_at');
        console.log(`Users table has reward columns: ${hasPoints && hasLastLogin}`);

        // Check logs table
        const [logsCols] = await db.query('SHOW TABLES LIKE "reward_logs"');
        console.log(`Reward logs table exists: ${logsCols.length > 0}`);

        if (hasPoints && hasLastLogin && logsCols.length > 0) {
            console.log('--- Verification Successful ---');
        } else {
            console.log('--- Verification Failed ---');
        }

        process.exit(0);
    } catch (err) {
        console.error('Verification error:', err);
        process.exit(1);
    }
}

verifyRewards();
