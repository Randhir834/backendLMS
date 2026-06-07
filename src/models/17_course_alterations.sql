-- Add new columns to courses table for duration, level, language
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_value INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(20) DEFAULT 'days';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'beginner';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'English';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS what_you_learn TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements TEXT;
