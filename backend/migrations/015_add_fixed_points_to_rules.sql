-- Migration: Add support for fixed reward points
-- Date: 2026-01-06

ALTER TABLE reward_point_rules 
ADD COLUMN reward_type ENUM('multiplier', 'fixed') DEFAULT 'multiplier' AFTER max_purchase_amount,
ADD COLUMN fixed_points INT DEFAULT NULL AFTER points_multiplier;

-- Update existing rules to have reward_type as 'multiplier'
UPDATE reward_point_rules SET reward_type = 'multiplier' WHERE reward_type IS NULL;
