CREATE TABLE `notifications` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `recipient_role` enum('admin','kitchen','driver') NOT NULL,
  `recipient_id` int,
  `type` enum('order_created','order_edited','order_ready','order_delivered','reservation_created','reservation_edited','reservation_done','driver_assignment') NOT NULL,
  `message` text NOT NULL,
  `order_id` int,
  `reservation_id` int,
  `driver_id` int,
  `is_read` boolean NOT NULL DEFAULT false,
  `read_at` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
