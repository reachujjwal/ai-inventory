-- Migration: Add tenant role to role_permissions table ENUM

ALTER TABLE role_permissions 
MODIFY COLUMN role ENUM('admin', 'branch_manager', 'branch_cashier', 'user', 'tenant') NOT NULL;
