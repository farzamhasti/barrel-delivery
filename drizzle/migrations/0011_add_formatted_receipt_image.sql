-- Add formatted_receipt_image column to orders table
ALTER TABLE `orders` 
ADD COLUMN `formatted_receipt_image` text AFTER `receipt_image`;

-- Update area enum to include new values
ALTER TABLE `orders` 
MODIFY COLUMN `area` enum('DN', 'DT', 'WE', 'EA');
