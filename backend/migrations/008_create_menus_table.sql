-- Migration: Create Menus Table
-- Description: Adds a table to store system modules/menus dynamically.

CREATE TABLE IF NOT EXISTS menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    module_id VARCHAR(50) NOT NULL UNIQUE,
    url VARCHAR(255),
    icon VARCHAR(100),
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Populate with existing modules
INSERT INTO menus (label, module_id, url, icon, sort_order) VALUES
('Users', 'users', '/users', 'UsersIcon', 10),
('Products', 'products', '/products', 'CubeIcon', 20),
('Categories', 'categories', '/categories', 'TagIcon', 30),
('Inventory', 'inventory', '/inventory', 'ClipboardListIcon', 40),
('Sales', 'sales', '/sales', 'ChartBarIcon', 50),
('Orders', 'orders', '/orders', 'ShoppingCartIcon', 60),
('Permissions', 'permissions', '/settings/permissions', 'LockClosedIcon', 70),
('Coupons', 'coupons', '/coupons', 'TicketIcon', 80)
ON DUPLICATE KEY UPDATE 
label = VALUES(label),
url = VALUES(url),
sort_order = VALUES(sort_order);
