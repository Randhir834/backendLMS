-- Migration to support submission history and resubmission tracking
-- This allows students to resubmit assignments while preserving submission history

-- Drop the UNIQUE constraint on assignment_submissions to allow multiple submissions
ALTER TABLE assignment_submissions 
DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_student_id_key;

-- Add a column to track if this is the latest submission
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE;

-- Add a column to track which submission version this is
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create an index to quickly find the latest submission
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_latest 
ON assignment_submissions(assignment_id, student_id, is_latest) 
WHERE is_latest = TRUE;

-- Create an index for versioning
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_version 
ON assignment_submissions(assignment_id, student_id, version);

-- Add graded_by column to track which instructor graded the submission
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create a function to automatically set is_latest to false for previous submissions
CREATE OR REPLACE FUNCTION update_submission_latest() 
RETURNS TRIGGER AS $$
BEGIN
  -- Set all previous submissions for this assignment and student to is_latest = false
  UPDATE assignment_submissions 
  SET is_latest = FALSE 
  WHERE assignment_id = NEW.assignment_id 
    AND student_id = NEW.student_id 
    AND id != NEW.id;
  
  -- Ensure new submission is marked as latest
  NEW.is_latest := TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update is_latest flag
DROP TRIGGER IF EXISTS trigger_update_submission_latest ON assignment_submissions;
CREATE TRIGGER trigger_update_submission_latest
  BEFORE INSERT ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_latest();
