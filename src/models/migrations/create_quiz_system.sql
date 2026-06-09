-- Quiz & Test System Migration
-- This migration creates a complete quiz/test workflow similar to assignments
-- Features:
-- 1. Quiz creation with questions and options
-- 2. Student-specific quiz assignments
-- 3. Quiz attempts with time tracking and auto-submission
-- 4. Automatic and manual grading support
-- 5. Analytics and statistics

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  quiz_type VARCHAR(50) DEFAULT 'test', -- 'quiz', 'test', 'exam', 'practice'
  time_limit_minutes INTEGER, -- NULL for no time limit
  total_marks INTEGER DEFAULT 100,
  passing_marks INTEGER DEFAULT 40,
  allow_retake BOOLEAN DEFAULT FALSE,
  max_attempts INTEGER DEFAULT 1,
  show_results_immediately BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT FALSE,
  randomize_questions BOOLEAN DEFAULT FALSE,
  randomize_options BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMP WITH TIME ZONE, -- Quiz available from this date
  due_date TIMESTAMP WITH TIME ZONE, -- Quiz must be completed by this date
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'short_answer', 'essay'
  marks INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  explanation TEXT, -- Explanation shown after submission
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_options table (for multiple choice and true/false)
CREATE TABLE IF NOT EXISTS quiz_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_assignments table (which students are assigned which quiz)
CREATE TABLE IF NOT EXISTS quiz_assignments (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT FALSE,
  UNIQUE(quiz_id, student_id)
);

-- Create quiz_attempts table (student attempts at quizzes)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'graded', 'auto_submitted'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_taken_minutes INTEGER, -- Actual time taken
  score DECIMAL(10, 2), -- Obtained score
  percentage DECIMAL(5, 2), -- Percentage score
  is_passed BOOLEAN, -- Whether student passed (based on passing_marks)
  is_late BOOLEAN DEFAULT FALSE, -- Submitted after due date
  feedback TEXT, -- Overall feedback from instructor
  graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_responses table (student answers to questions)
CREATE TABLE IF NOT EXISTS quiz_responses (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_id INTEGER REFERENCES quiz_options(id) ON DELETE SET NULL, -- For multiple choice
  answer_text TEXT, -- For short answer/essay questions
  is_correct BOOLEAN, -- Auto-evaluated for objective questions
  marks_obtained DECIMAL(10, 2), -- Marks awarded (for manual grading)
  instructor_feedback TEXT, -- Feedback on this specific answer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON quiz_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_id ON quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student_id ON quiz_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_attempt_id ON quiz_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_question_id ON quiz_responses(question_id);

-- Add trigger to update quiz_assignments when attempt is submitted
CREATE OR REPLACE FUNCTION update_quiz_assignment_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('submitted', 'graded', 'auto_submitted') THEN
    UPDATE quiz_assignments 
    SET is_completed = TRUE 
    WHERE quiz_id = NEW.quiz_id AND student_id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quiz_assignment_completion
AFTER INSERT OR UPDATE ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION update_quiz_assignment_completion();

-- Add trigger to auto-calculate percentage and pass status
CREATE OR REPLACE FUNCTION calculate_quiz_result()
RETURNS TRIGGER AS $$
DECLARE
  total_marks INTEGER;
  passing_marks INTEGER;
BEGIN
  IF NEW.score IS NOT NULL THEN
    SELECT q.total_marks, q.passing_marks INTO total_marks, passing_marks
    FROM quizzes q WHERE q.id = NEW.quiz_id;
    
    IF total_marks > 0 THEN
      NEW.percentage := (NEW.score / total_marks) * 100;
      NEW.is_passed := NEW.score >= passing_marks;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_quiz_result
BEFORE INSERT OR UPDATE ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION calculate_quiz_result();
