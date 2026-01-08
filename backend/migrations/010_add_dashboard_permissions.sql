-- Migration: Add Dashboard permissions for all roles
-- Date: 2026-01-06
-- Description: Ensures all roles can view the dashboard stats

-- Add dashboard view permission for roles that might be missing it
INSERT IGNORE INTO role_permissions (role, module, can_view) VALUES 
('admin', 'dashboard', 1),
('branch_manager', 'dashboard', 1),
('branch_cashier', 'dashboard', 1);

-- If entry exists but can_view is 0, update it
UPDATE role_permissions SET can_view = 1 WHERE module = 'dashboard' AND role IN ('admin', 'branch_manager', 'branch_cashier');
