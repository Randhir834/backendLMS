-- Migration: Add Google Meet link to courses table
-- This allows instructors/admins to set a default Google Meet link for each course
-- that will be used for all live classes of that course

-- Add google_meet_link column to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS google_meet_link VARCHAR(500);

-- Add comment for documentation
COMMENT ON COLUMN courses.google_meet_link IS 'Default Google Meet link for all live classes of this course';
