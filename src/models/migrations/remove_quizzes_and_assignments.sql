-- Migration to remove quizzes and assignments from the database
-- Created: 2026-06-23
-- Description: Complete removal of quiz and assignment features

-- Drop quiz-related tables
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_assignments CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;

-- Drop assignment-related tables  
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;

-- Log the migration
INSERT INTO migration_history (migration_name, executed_at)
VALUES ('remove_quizzes_and_assignments', NOW())
ON CONFLICT (migration_name) DO NOTHING;
