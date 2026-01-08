const db = require('../config/db');

/**
 * Log an activity to the database.
 * @param {number} userId - The ID of the user performing the action.
 * @param {string} action - Descriptive name of the action (e.g., 'Created Product').
 * @param {string} entityType - The type of entity involved (e.g., 'product', 'order').
 * @param {number} entityId - The ID of the entity involved.
 * @param {object} details - Any additional JSON-serializable details.
 */
const logActivity = async (userId, action, entityType = null, entityId = null, details = null) => {
    try {
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
            [userId, action, entityType, entityId, details ? JSON.stringify(details) : null]
        );
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

module.exports = { logActivity };
