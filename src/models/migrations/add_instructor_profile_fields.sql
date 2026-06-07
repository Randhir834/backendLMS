-- Add qualifications and specialization columns for instructor profile
ALTER TABLE users ADD COLUMN IF NOT EXISTS qualifications VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(255);
