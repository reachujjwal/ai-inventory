-- Migration: Add reward_points_earned to orders table
-- Date: 2026-01-06

ALTER TABLE orders 
ADD COLUMN reward_points_earned INT DEFAULT 0 AFTER reward_discount_amount;
