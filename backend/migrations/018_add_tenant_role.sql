-- Migration: Add tenant role and is_approved column
-- Date: 2026-01-06

ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'user', 'branch_manager', 'branch_cashier', 'tenant') DEFAULT 'user';

ALTER TABLE users
ADD COLUMN is_approved BOOLEAN DEFAULT 1;
