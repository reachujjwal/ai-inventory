-- Migration: Add Audit Trail Fields to All Tables
-- Date: 2026-01-05
-- Description: Adds created_by, updated_at, and updated_by columns to all tables for audit tracking

-- ============================================
-- PRODUCTS TABLE
-- ============================================
ALTER TABLE products
ADD COLUMN created_by INT NULL AFTER created_at,
ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
ADD COLUMN updated_by INT NULL AFTER updated_at,
ADD CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- CATEGORIES TABLE
-- ============================================
ALTER TABLE categories
ADD COLUMN created_by INT NULL AFTER created_at,
ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
ADD COLUMN updated_by INT NULL AFTER updated_at,
ADD CONSTRAINT fk_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_categories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- ORDERS TABLE
-- ============================================
ALTER TABLE orders
ADD COLUMN created_by INT NULL AFTER created_at,
ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
ADD COLUMN updated_by INT NULL AFTER updated_at,
ADD CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- USERS TABLE
-- ============================================
ALTER TABLE users
ADD COLUMN created_by INT NULL AFTER created_at,
ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
ADD COLUMN updated_by INT NULL AFTER updated_at,
ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- INVENTORY TABLE
-- ============================================
ALTER TABLE inventory
ADD COLUMN created_by INT NULL AFTER last_updated,
ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
ADD COLUMN updated_by INT NULL AFTER updated_at,
ADD CONSTRAINT fk_inventory_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_inventory_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- SALES TABLE
-- ============================================
ALTER TABLE sales
ADD COLUMN created_by INT NULL AFTER sale_date,
ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
ADD COLUMN updated_by INT NULL AFTER updated_at,
ADD CONSTRAINT fk_sales_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_sales_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration was successful:
-- DESCRIBE products;
-- DESCRIBE categories;
-- DESCRIBE orders;
-- DESCRIBE users;
-- DESCRIBE inventory;
-- DESCRIBE sales;
