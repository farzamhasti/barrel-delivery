CREATE TABLE `system_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
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
