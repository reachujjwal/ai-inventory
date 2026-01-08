-- Migration: Add ownership columns to reward_point_rules
-- Date: 2026-01-07

ALTER TABLE reward_point_rules 
ADD COLUMN created_by INT NULL,
ADD COLUMN updated_by INT NULL,
ADD CONSTRAINT fk_reward_rules_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_reward_rules_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Assign existing rules to the first admin if possible (optional but good for consistency)
UPDATE reward_point_rules SET created_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1) WHERE created_by IS NULL;
