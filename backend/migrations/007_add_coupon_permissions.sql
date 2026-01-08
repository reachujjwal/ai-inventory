-- Migration: Add Coupons Module to role_permissions
-- Description: Inserts coupon permissions for admin and branch_manager roles.

INSERT INTO role_permissions (role, module, can_view, can_add, can_update, can_delete, can_import, can_export)
VALUES 
('admin', 'coupons', 1, 1, 1, 1, 1, 1),
('branch_manager', 'coupons', 1, 1, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE 
can_view = 1, can_add = 1, can_update = 1, can_delete = 1, can_import = 1, can_export = 1;
