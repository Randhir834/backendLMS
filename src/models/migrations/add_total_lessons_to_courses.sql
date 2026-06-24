-- Add total_lessons column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN courses.total_lessons IS 'Total number of lessons in the course';
