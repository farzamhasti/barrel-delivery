ALTER TABLE `customers` MODIFY COLUMN `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `drivers` MODIFY COLUMN `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `drivers` ADD `license_number` varchar(50);--> statement-breakpoint
ALTER TABLE `drivers` ADD `vehicle_type` varchar(100);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `phone`;