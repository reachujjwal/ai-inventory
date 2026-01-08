-- Migration: Add Reward Point Rules
-- Date: 2026-01-06

-- Create reward point rules table
CREATE TABLE IF NOT EXISTS reward_point_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    min_purchase_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_purchase_amount DECIMAL(10,2) NULL,
    points_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    description VARCHAR(255) NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default reward point rules
INSERT INTO reward_point_rules (min_purchase_amount, max_purchase_amount, points_multiplier, description) VALUES
(0.00, 49.99, 1.00, 'Standard: 1 point per $1'),
(50.00, 99.99, 1.50, 'Bronze: 1.5 points per $1'),
(100.00, 199.99, 2.00, 'Silver: 2 points per $1'),
(200.00, NULL, 3.00, 'Gold: 3 points per $1');
