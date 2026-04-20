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
