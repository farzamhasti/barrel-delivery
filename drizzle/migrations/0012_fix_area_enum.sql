-- Fix area enum to include all valid area codes: DT (Downtown), CP (Central Park), B (Bayshore)
ALTER TABLE `orders` 
MODIFY COLUMN `area` enum('DN', 'DT', 'WE', 'EA', 'CP', 'B');
