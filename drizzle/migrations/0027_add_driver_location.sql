ALTER TABLE `drivers` ADD COLUMN `latitude` DECIMAL(10, 6);
ALTER TABLE `drivers` ADD COLUMN `longitude` DECIMAL(10, 6);
ALTER TABLE `drivers` ADD COLUMN `location_updated_at` TIMESTAMP;
