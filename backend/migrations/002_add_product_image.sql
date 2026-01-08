-- Migration: Add Image Support for Products and Users
-- Date: 2026-01-05
-- Description: Adds image_url column to products and users tables for storing images

-- ============================================
-- PRODUCTS TABLE - Add Image URL Column
-- ============================================
ALTER TABLE products
ADD COLUMN image_url VARCHAR(255) NULL AFTER category_id;

-- ============================================
-- USERS TABLE - Add Image URL Column
-- ============================================
ALTER TABLE users
ADD COLUMN image_url VARCHAR(255) NULL AFTER password_hash;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration was successful:
-- DESCRIBE products;
-- DESCRIBE users;
