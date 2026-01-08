-- Migration: Add Reward Points Redemption
-- Date: 2026-01-06

-- Add redemption columns to orders table
ALTER TABLE orders ADD COLUMN reward_points_used INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN reward_discount_amount DECIMAL(10,2) DEFAULT 0;

-- Update reward_logs type enum to include 'redeem'
ALTER TABLE reward_logs MODIFY COLUMN type ENUM('login', 'purchase', 'redeem') NOT NULL;
