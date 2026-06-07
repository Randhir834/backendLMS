-- Migration: Add indexes for search performance
-- Description: Creates indexes on searchable columns to improve search query performance
-- Date: 2026-05-12

-- Add indexes for courses table
CREATE INDEX IF NOT EXISTS idx_courses_title_lower ON courses(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_courses_description_lower ON courses(LOWER(description));
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Add indexes for lessons table
CREATE INDEX IF NOT EXISTS idx_lessons_title_lower ON lessons(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_lessons_description_lower ON lessons(LOWER(description));

-- Add indexes for assignments table
CREATE INDEX IF NOT EXISTS idx_assignments_title_lower ON assignments(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_assignments_description_lower ON assignments(LOWER(description));

-- Add indexes for quizzes table
CREATE INDEX IF NOT EXISTS idx_quizzes_title_lower ON quizzes(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_quizzes_description_lower ON quizzes(LOWER(description));

-- Add indexes for live_classes table
CREATE INDEX IF NOT EXISTS idx_live_classes_title_lower ON live_classes(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_live_classes_description_lower ON live_classes(LOWER(description));

-- Add indexes for categories table
CREATE INDEX IF NOT EXISTS idx_categories_name_lower ON categories(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_categories_description_lower ON categories(LOWER(description));

-- Add indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_name_lower ON users(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_courses_status_category ON courses(status, category_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_lookup ON course_instructors(course_id, instructor_id);

-- Add index for sections to improve lesson lookups
CREATE INDEX IF NOT EXISTS idx_sections_course_id ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section_id ON lessons(section_id);

-- Add indexes for foreign key relationships used in search
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_course_id ON live_classes(course_id);

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Performance note: These indexes will significantly improve search query performance
-- but will slightly slow down INSERT/UPDATE operations. This is an acceptable tradeoff
-- for a read-heavy search feature.
