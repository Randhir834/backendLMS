-- Migration to ensure all instructors have date_of_birth for age calculation
-- This migration adds a comment to document the age calculation requirement

COMMENT ON COLUMN users.date_of_birth IS 'Date of birth used for age calculation. Required for instructors and students.';

-- Add a check constraint to ensure instructors have date_of_birth
-- Note: This is commented out to avoid breaking existing data
-- Uncomment and run manually if you want to enforce this constraint
-- ALTER TABLE users ADD CONSTRAINT check_instructor_dob 
--   CHECK (role != 'instructor' OR date_of_birth IS NOT NULL);

-- For existing instructors without date_of_birth, you may want to:
-- 1. Contact them to provide their date of birth
-- 2. Set a default date (not recommended)
-- 3. Handle null values gracefully in the application (current approach)

-- Query to find instructors without date_of_birth:
-- SELECT id, name, email FROM users WHERE role = 'instructor' AND date_of_birth IS NULL;