CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`previous_status` enum('Pending','Ready','On the Way','Delivered'),
	`new_status` enum('Pending','Ready','On the Way','Delivered') NOT NULL,
	`transition_time` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
