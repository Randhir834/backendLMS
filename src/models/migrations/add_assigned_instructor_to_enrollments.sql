-- Add assigned_instructor_id to enrollments table
-- This allows admin to assign a specific instructor to a student enrollment

ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS assigned_instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_enrollments_assigned_instructor 
ON enrollments(assigned_instructor_id);

-- Add comment to document the column
COMMENT ON COLUMN enrollments.assigned_instructor_id IS 'The specific instructor assigned to teach this student for this course';
