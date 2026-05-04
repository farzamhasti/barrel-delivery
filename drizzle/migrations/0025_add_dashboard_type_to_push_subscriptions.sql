-- Add dashboardType and driverId columns to push_subscriptions table
ALTER TABLE `push_subscriptions` 
ADD COLUMN `dashboard_type` enum('admin','kitchen','driver') NOT NULL DEFAULT 'admin' AFTER `p256dh`,
ADD COLUMN `driver_id` int AFTER `dashboard_type`;

-- Update existing rows to use dashboard_type based on role
UPDATE `push_subscriptions` 
SET `dashboard_type` = COALESCE(`role`, 'admin') 
WHERE `dashboard_type` = 'admin';
