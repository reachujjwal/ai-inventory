-- Migration: Add Reward Points System
-- Date: 2026-01-06

-- Add reward points columns to users table
ALTER TABLE users ADD COLUMN reward_points INT DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_reward_at DATE NULL;

-- Create reward logs table
CREATE TABLE IF NOT EXISTS reward_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    points INT NOT NULL,
    type ENUM('login', 'purchase') NOT NULL,
    reference_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
