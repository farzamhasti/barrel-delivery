-- Change estimated_return_time from INT to TIMESTAMP (absolute future timestamp)
ALTER TABLE drivers MODIFY COLUMN estimated_return_time TIMESTAMP NULL DEFAULT NULL COMMENT 'Absolute future timestamp (UTC) when driver will return';
