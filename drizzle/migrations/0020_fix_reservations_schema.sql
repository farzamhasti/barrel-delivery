DROP TABLE IF EXISTS `reservations`;

CREATE TABLE `reservations` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `customer_email` varchar(255),
  `reservation_date` timestamp NOT NULL,
  `party_size` int NOT NULL,
  `special_requests` text,
  `status` enum('Pending','Confirmed','Cancelled') NOT NULL DEFAULT 'Pending',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
