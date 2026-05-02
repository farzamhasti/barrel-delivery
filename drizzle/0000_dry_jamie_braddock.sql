CREATE TABLE `authorized_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','kitchen','driver') NOT NULL,
	`is_active` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authorized_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorized_emails_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`address` text NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `driver_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driver_id` int NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_sessions_session_token_unique` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`license_number` varchar(50),
	`vehicle_type` varchar(100),
	`is_active` boolean DEFAULT true,
	`status` enum('online','offline') NOT NULL DEFAULT 'offline',
	`current_latitude` decimal(10,8),
	`current_longitude` decimal(11,8),
	`last_location_update` timestamp,
	`return_time_total_seconds` int,
	`return_time_start_timestamp` timestamp,
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
CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`previous_status` enum('Pending','Ready','On the Way','Delivered'),
	`new_status` enum('Pending','Ready','On the Way','Delivered') NOT NULL,
	`transition_time` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`driver_id` int,
	`status` enum('Pending','Ready','On the Way','Delivered') NOT NULL DEFAULT 'Pending',
	`subtotal` decimal(10,2) NOT NULL DEFAULT '0',
	`tax_percentage` decimal(5,2) NOT NULL DEFAULT '13',
	`tax_amount` decimal(10,2) NOT NULL DEFAULT '0',
	`total_price` decimal(10,2) NOT NULL,
	`delivery_time` timestamp,
	`has_delivery_time` boolean DEFAULT false,
	`notes` text,
	`area` varchar(50),
	`picked_up_at` timestamp,
	`delivered_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `return_time_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driver_id` int NOT NULL,
	`total_seconds` int NOT NULL,
	`start_timestamp` timestamp NOT NULL,
	`end_timestamp` timestamp,
	`action` enum('saved','cleared') NOT NULL DEFAULT 'saved',
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `return_time_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`password_hash` text NOT NULL,
	`role` enum('admin','kitchen') NOT NULL,
	`is_active` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_credentials_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `system_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`credential_id` int NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_sessions_session_token_unique` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin','driver') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `system_sessions` ADD CONSTRAINT `system_sessions_credential_id_system_credentials_id_fk` FOREIGN KEY (`credential_id`) REFERENCES `system_credentials`(`id`) ON DELETE no action ON UPDATE no action;