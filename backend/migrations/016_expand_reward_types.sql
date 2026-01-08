-- Migration: Expand reward_type ENUM to support more types
-- Date: 2026-01-06

ALTER TABLE reward_point_rules 
MODIFY COLUMN reward_type ENUM('multiplier', 'fixed', 'percentage', 'step') DEFAULT 'multiplier';
