ALTER TABLE `orders` ADD `subtotal` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `tax_percentage` decimal(5,2) DEFAULT '13' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `tax_amount` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_time` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `has_delivery_time` boolean DEFAULT false;