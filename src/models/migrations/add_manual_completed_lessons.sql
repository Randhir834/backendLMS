-- Add manual_completed_lessons column to enrollments table
-- This allows instructors to manually track how many lessons a student has completed

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS manual_completed_lessons INTEGER DEFAULT 0;

-- Add constraint to ensure it's not negative
ALTER TABLE enrollments ADD CONSTRAINT check_manual_completed_lessons_non_negative 
  CHECK (manual_completed_lessons >= 0);

-- Add comment to explain the column
COMMENT ON COLUMN enrollments.manual_completed_lessons IS 'Number of lessons manually marked as completed by instructor';

-- Update existing enrollments to have 0 if NULL
UPDATE enrollments SET manual_completed_lessons = 0 WHERE manual_completed_lessons IS NULL;
