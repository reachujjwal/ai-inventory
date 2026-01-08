-- Migration: Create Coupons Table and update Orders Table
-- Description: Adds support for coupon codes and discounts.

CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    expires_at DATE,
    usage_limit INT DEFAULT NULL,
    times_used INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add coupon_id and discount_amount to orders table
ALTER TABLE orders ADD COLUMN coupon_id INT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;
