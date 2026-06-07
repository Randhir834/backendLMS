-- Enhanced Quiz System Migration
-- This migration adds support for:
-- 1. Assigning quizzes to specific students or all enrolled students
-- 2. Deadline management
-- 3. Creator tracking (admin or instructor)
-- 4. Better attempt tracking and analytics

-- Add new columns to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS show_correct_answers BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0;

-- Create quiz_assignments table for student-specific assignments
CREATE TABLE IF NOT EXISTS quiz_assignments (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT FALSE,
  UNIQUE(quiz_id, student_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_id ON quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student_id ON quiz_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);

-- Add attempt number tracking
ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER;
