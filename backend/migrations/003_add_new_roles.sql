-- Migration: Update User Roles ENUM
-- Date: 2026-01-05
-- Description: Adds 'branch manager' and 'branch cashier' to the role column enum in the users table

ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'user', 'branch manager', 'branch cashier') DEFAULT 'user';
