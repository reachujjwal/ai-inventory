-- Migration: Add tenant role permissions
-- Date: 2026-01-06
-- Description: Sets up default permissions for tenant role

-- Tenant gets full access to manage their own products, inventory, orders, and categories
INSERT IGNORE INTO role_permissions (role, module, can_view, can_add, can_update, can_delete, can_import, can_export) VALUES 
('tenant', 'products', 1, 1, 1, 1, 1, 1),
('tenant', 'inventory', 1, 1, 1, 1, 0, 1),
('tenant', 'orders', 1, 1, 1, 1, 0, 1),
('tenant', 'categories', 1, 1, 1, 1, 0, 0),
('tenant', 'dashboard', 1, 0, 0, 0, 0, 0);

-- Tenants cannot access user management, coupons, branches, permissions, rewards, or sales
-- (No entries = no access by default)
