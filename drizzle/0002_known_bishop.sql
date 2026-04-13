ALTER TABLE `orders` MODIFY COLUMN `status` enum('Pending','Ready','On the Way','Delivered') NOT NULL DEFAULT 'Pending';
