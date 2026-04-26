-- Drop all existing tables to start fresh
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `order_status_history`;
DROP TABLE IF EXISTS `return_time_history`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `menu_items`;
DROP TABLE IF EXISTS `menu_categories`;
DROP TABLE IF EXISTS `drivers`;
DROP TABLE IF EXISTS `system_sessions`;
DROP TABLE IF EXISTS `system_credentials`;
DROP TABLE IF EXISTS `users`;

-- Create Users table
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `openId` varchar(255) UNIQUE,
  `name` varchar(255),
  `email` varchar(255),
  `loginMethod` varchar(50),
  `role` enum('admin', 'user') DEFAULT 'user',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `lastSignedIn` timestamp
);



-- Create Drivers table
CREATE TABLE `drivers` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20),
  `license_number` varchar(50) UNIQUE,
  `is_active` boolean DEFAULT true,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create NEW Orders table (simplified for scanned receipts)
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_number` varchar(50) UNIQUE NOT NULL,
  `customer_address` text NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `area` enum('DN', 'CP', 'B') NOT NULL,
  `delivery_time` timestamp,
  `has_delivery_time` boolean DEFAULT false,
  `receipt_text` text,
  `receipt_image` text,
  `subtotal` decimal(10, 2) NOT NULL DEFAULT '0',
  `tax_percentage` decimal(5, 2) DEFAULT '13' NOT NULL,
  `tax_amount` decimal(10, 2) DEFAULT '0' NOT NULL,
  `total_price` decimal(10, 2) NOT NULL,
  `status` enum('Pending', 'Ready', 'On the Way', 'Delivered') DEFAULT 'Pending' NOT NULL,
  `driver_id` int,
  `picked_up_at` timestamp,
  `delivered_at` timestamp,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`)
);

-- Create Order Items table
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` int NOT NULL,
  `menu_item_id` int,
  `item_name` varchar(255),
  `quantity` int NOT NULL,
  `price_at_order` decimal(10, 2) NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
);

-- Create Order Status History table
CREATE TABLE `order_status_history` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` int NOT NULL,
  `status` enum('Pending', 'Ready', 'On the Way', 'Delivered') NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
);

-- Create Return Time History table
CREATE TABLE `return_time_history` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `driver_id` int NOT NULL,
  `estimated_return_time` timestamp,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`)
);

-- Create Reservations table
CREATE TABLE `reservations` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `customer_email` varchar(255),
  `reservation_date` timestamp NOT NULL,
  `party_size` int NOT NULL,
  `special_requests` text,
  `status` enum('Pending', 'Confirmed', 'Cancelled') DEFAULT 'Pending' NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create System Credentials table
CREATE TABLE `system_credentials` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` varchar(255) UNIQUE NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create System Sessions table
CREATE TABLE `system_sessions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `credential_id` int NOT NULL,
  `session_token` varchar(255) UNIQUE NOT NULL,
  `expires_at` timestamp NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`credential_id`) REFERENCES `system_credentials` (`id`)
);
