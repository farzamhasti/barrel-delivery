CREATE TABLE `customers` (
`id` int AUTO_INCREMENT NOT NULL,
`name` varchar(255) NOT NULL,
`phone` varchar(20) NOT NULL,
`address` text NOT NULL,
`latitude` decimal(10,8),
`longitude` decimal(11,8),
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
`id` int AUTO_INCREMENT NOT NULL,
`user_id` int,
`name` varchar(255) NOT NULL,
`phone` varchar(20) NOT NULL,
`is_active` boolean DEFAULT true,
`current_latitude` decimal(10,8),
`current_longitude` decimal(11,8),
`last_location_update` timestamp,
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_categories` (
`id` int AUTO_INCREMENT NOT NULL,
`name` varchar(255) NOT NULL,
`description` text,
`display_order` int DEFAULT 0,
`is_active` boolean DEFAULT true,
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `menu_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
`id` int AUTO_INCREMENT NOT NULL,
`category_id` int NOT NULL,
`name` varchar(255) NOT NULL,
`description` text,
`price` decimal(10,2) NOT NULL,
`image_url` text,
`is_available` boolean DEFAULT true,
`display_order` int DEFAULT 0,
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
`id` int AUTO_INCREMENT NOT NULL,
`order_id` int NOT NULL,
`menu_item_id` int NOT NULL,
`quantity` int NOT NULL,
`price_at_order` decimal(10,2) NOT NULL,
`createdAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
`id` int AUTO_INCREMENT NOT NULL,
`customer_id` int NOT NULL,
`driver_id` int,
`status` enum('Pending','On the Way','Delivered') NOT NULL DEFAULT 'Pending',
`total_price` decimal(10,2) NOT NULL,
`notes` text,
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','driver') NOT NULL DEFAULT 'user';
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);
