-- Add return time columns to existing drivers table
ALTER TABLE `drivers` 
ADD COLUMN `return_time_total_seconds` int NULL AFTER `last_location_update`,
ADD COLUMN `return_time_start_timestamp` timestamp NULL AFTER `return_time_total_seconds`;

-- Create return_time_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS `return_time_history` (
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
