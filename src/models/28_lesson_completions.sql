-- Lesson completions table for tracking student progress
-- Replaces the slot booking system with direct lesson completion tracking

CREATE TABLE IF NOT EXISTS lesson_completions (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL CHECK (lesson_number > 0),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_by INTEGER NOT NULL REFERENCES users(id), -- The instructor who marked it complete
  notes TEXT, -- Optional notes about the lesson
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_number) -- Prevent duplicate completions for same lesson
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_completions_enrollment ON lesson_completions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_completed_by ON lesson_completions(completed_by);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_completed_at ON lesson_completions(completed_at);

-- Comments
COMMENT ON TABLE lesson_completions IS 'Tracks which lessons have been completed for each student enrollment';
COMMENT ON COLUMN lesson_completions.enrollment_id IS 'Reference to the student enrollment';
COMMENT ON COLUMN lesson_completions.lesson_number IS 'The lesson number that was completed (1-indexed)';
COMMENT ON COLUMN lesson_completions.completed_by IS 'The instructor who marked this lesson as complete';
COMMENT ON COLUMN lesson_completions.notes IS 'Optional notes about the lesson completion';
