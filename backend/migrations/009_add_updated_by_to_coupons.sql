-- Migration: Add updated_by to Coupons Table
-- Date: 2026-01-06
-- Description: Adds updated_by column and foreign key to coupons table for audit tracking

ALTER TABLE coupons
ADD COLUMN updated_by INT NULL AFTER updated_at,
ADD CONSTRAINT fk_coupons_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
