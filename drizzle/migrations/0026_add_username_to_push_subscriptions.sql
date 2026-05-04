-- Add username column to push_subscriptions table
ALTER TABLE push_subscriptions ADD COLUMN username VARCHAR(255) AFTER user_id;

-- Create index for faster lookups by username
CREATE INDEX idx_push_subscriptions_username ON push_subscriptions(username);
