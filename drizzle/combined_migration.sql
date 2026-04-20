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

CREATE TABLE `driver_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driver_id` int NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_sessions_session_token_unique` UNIQUE(`session_token`)
);
