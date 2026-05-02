-- Add estimated_return_time and estimated_return_time_updated_at columns to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS estimated_return_time INT DEFAULT NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS estimated_return_time_updated_at TIMESTAMP DEFAULT NULL;
