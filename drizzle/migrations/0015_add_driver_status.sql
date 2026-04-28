ALTER TABLE `drivers` ADD COLUMN `status` varchar(20) NOT NULL DEFAULT 'offline' AFTER `license_number`;
