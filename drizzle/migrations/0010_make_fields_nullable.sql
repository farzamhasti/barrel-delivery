-- Make fields nullable to support optional data entry
ALTER TABLE `orders` 
MODIFY COLUMN `customer_address` text,
MODIFY COLUMN `customer_phone` varchar(20),
MODIFY COLUMN `area` enum('DN', 'CP', 'B');
