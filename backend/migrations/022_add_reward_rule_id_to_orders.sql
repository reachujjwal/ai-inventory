-- Migration: Add reward_rule_id to orders
-- Date: 2026-01-07

ALTER TABLE orders 
ADD COLUMN reward_rule_id INT NULL,
ADD CONSTRAINT fk_orders_reward_rule FOREIGN KEY (reward_rule_id) REFERENCES reward_point_rules(id) ON DELETE SET NULL;
