CREATE TABLE `driver_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driver_id` int NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_sessions_session_token_unique` UNIQUE(`session_token`)
);
