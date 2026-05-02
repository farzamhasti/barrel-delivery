-- Fix area enum to match new area names: Downtown, Central Park, Both
ALTER TABLE `orders` 
MODIFY COLUMN `area` enum('Downtown', 'Central Park', 'Both');
