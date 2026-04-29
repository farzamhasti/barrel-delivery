-- Add missing columns to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'offline' AFTER license_number;

-- Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name varchar(100) AFTER order_number;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS formatted_receipt_image longtext AFTER receipt_image;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_text longtext AFTER formatted_receipt_image;

-- Remove UNIQUE constraint from order_number if it exists
ALTER TABLE orders DROP INDEX IF EXISTS order_number;
