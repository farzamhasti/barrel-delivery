ALTER TABLE `orders` ADD COLUMN `area` varchar(50);
ALTER TABLE `orders` ADD COLUMN `total_price` decimal(10,2) NOT NULL DEFAULT '0';
ALTER TABLE `orders` ADD COLUMN `subtotal` decimal(10,2) DEFAULT '0' NOT NULL;
ALTER TABLE `orders` ADD COLUMN `tax_percentage` decimal(5,2) DEFAULT '13' NOT NULL;
ALTER TABLE `orders` ADD COLUMN `tax_amount` decimal(10,2) DEFAULT '0' NOT NULL;
ALTER TABLE `orders` ADD COLUMN `delivery_time` timestamp;
ALTER TABLE `orders` ADD COLUMN `has_delivery_time` boolean DEFAULT false;
ALTER TABLE `orders` MODIFY COLUMN `status` enum('Pending','Ready','On the Way','Delivered') NOT NULL DEFAULT 'Pending';
