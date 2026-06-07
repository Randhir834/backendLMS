-- Enhanced Assignment System Migration
-- This migration adds support for:
-- 1. Assigning assignments to specific students or all enrolled students
-- 2. File attachment requirements and submission rules
-- 3. Creator tracking (admin or instructor)
-- 4. Better submission tracking and grading workflow
-- 5. Feedback and comments system

-- Add new columns to assignments table
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS file_requirements TEXT,
ADD COLUMN IF NOT EXISTS allow_resubmission BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS submission_format VARCHAR(255) DEFAULT 'file';

-- Create assignment_assignments table for student-specific assignments
CREATE TABLE IF NOT EXISTS assignment_assignments (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_submitted BOOLEAN DEFAULT FALSE,
  UNIQUE(assignment_id, student_id)
);

-- Enhance assignment_submissions table
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS feedback TEXT,
ADD COLUMN IF NOT EXISTS instructor_comments TEXT,
ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);

-- Update status column to have more specific values
ALTER TABLE assignment_submissions 
ALTER COLUMN status SET DEFAULT 'submitted';

-- Create assignment_files table for multiple file submissions
CREATE TABLE IF NOT EXISTS assignment_files (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignment_assignments_assignment_id ON assignment_assignments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_assignments_student_id ON assignment_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_files_submission_id ON assignment_files(submission_id);