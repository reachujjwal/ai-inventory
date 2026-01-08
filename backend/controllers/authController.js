const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/activityLogger');

exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Allow 'tenant' role registration, default others to 'user'
        const userRole = role === 'tenant' ? 'tenant' : 'user';
        const isApproved = userRole === 'tenant' ? 0 : 1;

        await db.query('INSERT INTO users (username, email, password_hash, role, is_approved) VALUES (?, ?, ?, ?, ?)', [username, email, hashedPassword, userRole, isApproved]);

        if (userRole === 'tenant') {
            await logActivity(null, 'Tenant Registered', 'user', null, { username, email });
            res.status(201).json({ message: 'Registration successful. Account pending admin approval.' });
        } else {
            // Since we don't have the user ID yet as it's a new insertion, we'll log it without it or fetch it first.
            // For registration, we can just log it without user_id if we want to track anonymous signups.
            await logActivity(null, 'User Registered', 'user', null, { username, email });
            res.status(201).json({ message: 'User registered successfully' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.is_approved === 0) {
            return res.status(403).json({ message: 'Account is pending approval' });
        }

        // --- REWARD POINTS LOGIC (User role only) ---
        let currentPoints = user.reward_points || 0;
        if (user.role === 'user') {
            const today = new Date().toISOString().split('T')[0];
            const lastRewardDate = user.last_login_reward_at ? new Date(user.last_login_reward_at).toISOString().split('T')[0] : null;

            if (lastRewardDate !== today) {
                // Fetch settings
                const [settings] = await db.query('SELECT setting_value FROM reward_settings WHERE setting_key = "daily_login_bonus"');
                const [systemSettings] = await db.query('SELECT setting_value FROM reward_settings WHERE setting_key = "enable_rewards"');

                const isEnabled = systemSettings.length > 0 ? systemSettings[0].setting_value === '1' : true;
                const rewardAmount = settings.length > 0 ? parseInt(settings[0].setting_value) : 10;

                if (isEnabled && rewardAmount > 0) {
                    await db.query(
                        'UPDATE users SET reward_points = reward_points + ?, last_login_reward_at = ? WHERE id = ?',
                        [rewardAmount, today, user.id]
                    );
                    await db.query(
                        'INSERT INTO reward_logs (user_id, points, type) VALUES (?, ?, ?)',
                        [user.id, rewardAmount, 'login']
                    );
                    currentPoints += rewardAmount;
                    console.log(`User ${user.id} awarded ${rewardAmount} points for daily login.`);
                }
            }
        }
        // ---------------------------

        await logActivity(user.id, 'User Login', 'user', user.id);

        // Fetch permissions for the user's role
        const [permissions] = await db.query('SELECT * FROM role_permissions WHERE role = ?', [user.role]);

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                branch_id: user.branch_id,
                reward_points: user.role === 'user' ? currentPoints : undefined,
                permissions: permissions
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Please provide both current and new passwords' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, userId]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await db.query('SELECT id, username, email, role, branch_id, reward_points FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        const [permissions] = await db.query('SELECT * FROM role_permissions WHERE role = ?', [user.role]);

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            branch_id: user.branch_id,
            reward_points: user.role === 'user' ? user.reward_points : undefined,
            permissions: permissions
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
