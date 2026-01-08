-- Migration: Add Reward Settings Table
-- Date: 2026-01-06

-- Create reward settings table for configurable values
CREATE TABLE IF NOT EXISTS reward_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default settings
INSERT INTO reward_settings (setting_key, setting_value, description) VALUES
('daily_login_bonus', '10', 'Points awarded for first login each day'),
('min_redemption_points', '1', 'Minimum points required to redeem'),
('points_expiry_days', '0', 'Days until points expire (0 = never)'),
('enable_rewards', '1', 'Enable/disable entire reward system');
