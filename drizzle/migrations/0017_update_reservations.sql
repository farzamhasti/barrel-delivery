DROP TABLE IF EXISTS `reservations`;

CREATE TABLE `reservations` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `event_type` varchar(255) NOT NULL,
  `number_of_people` int NOT NULL,
  `date_time` timestamp NOT NULL,
  `description` text,
  `status` enum('Pending','Done') NOT NULL DEFAULT 'Pending',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
