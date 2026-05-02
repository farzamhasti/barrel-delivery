CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_type` varchar(255) NOT NULL,
	`number_of_people` int NOT NULL,
	`details` text,
	`event_date` varchar(10) NOT NULL,
	`event_time` varchar(5) NOT NULL,
	`status` enum('pending','completed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
