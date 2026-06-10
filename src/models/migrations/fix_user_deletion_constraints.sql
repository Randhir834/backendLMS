-- Migration: Fix User Deletion Constraints
-- This migration ensures that users can be deleted without foreign key constraint violations
-- by properly setting up CASCADE and SET NULL behaviors

-- First, let's drop existing foreign key constraints that are problematic
-- and recreate them with proper CASCADE/SET NULL behavior

-- 1. Fix course_materials table - the upload_by field should SET NULL when user is deleted
-- This allows keeping the material but removing the reference to the deleted user
ALTER TABLE course_materials 
DROP CONSTRAINT IF EXISTS course_materials_upload_by_fkey;

ALTER TABLE course_materials 
ADD CONSTRAINT course_materials_upload_by_fkey 
FOREIGN KEY (upload_by) REFERENCES users(id) ON DELETE SET NULL;

-- 2. Fix courses table - instructor_id should SET NULL when instructor is deleted
-- This allows keeping the course but removing the instructor reference
ALTER TABLE courses 
DROP CONSTRAINT IF EXISTS courses_instructor_id_fkey;

ALTER TABLE courses 
ADD CONSTRAINT courses_instructor_id_fkey 
FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Fix live_classes table - created_by should CASCADE when user is deleted
-- If the creator is deleted, the live class should also be deleted
ALTER TABLE live_classes 
DROP CONSTRAINT IF EXISTS live_classes_created_by_fkey;

ALTER TABLE live_classes 
ADD CONSTRAINT live_classes_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Ensure all user-related tables have proper CASCADE behavior
-- These should already be correct, but let's verify and fix if needed

-- Enrollments - CASCADE (if user is deleted, their enrollments should be deleted)
ALTER TABLE enrollments 
DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;

ALTER TABLE enrollments 
ADD CONSTRAINT enrollments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Payments - CASCADE (if user is deleted, their payment records should be deleted)
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE payments 
ADD CONSTRAINT payments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Assignment submissions - CASCADE
ALTER TABLE assignment_submissions 
DROP CONSTRAINT IF EXISTS assignment_submissions_student_id_fkey;

ALTER TABLE assignment_submissions 
ADD CONSTRAINT assignment_submissions_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- Quiz attempts - CASCADE
ALTER TABLE quiz_attempts 
DROP CONSTRAINT IF EXISTS quiz_attempts_student_id_fkey;

ALTER TABLE quiz_attempts 
ADD CONSTRAINT quiz_attempts_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- Notifications - CASCADE
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Lesson progress - CASCADE
ALTER TABLE lesson_progress 
DROP CONSTRAINT IF EXISTS lesson_progress_student_id_fkey;

ALTER TABLE lesson_progress 
ADD CONSTRAINT lesson_progress_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- Course instructors - CASCADE
ALTER TABLE course_instructors 
DROP CONSTRAINT IF EXISTS course_instructors_instructor_id_fkey;

ALTER TABLE course_instructors 
ADD CONSTRAINT course_instructors_instructor_id_fkey 
FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;

-- Attendance - CASCADE for student and instructor
ALTER TABLE attendance 
DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;

ALTER TABLE attendance 
ADD CONSTRAINT attendance_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE attendance 
DROP CONSTRAINT IF EXISTS attendance_instructor_id_fkey;

ALTER TABLE attendance 
ADD CONSTRAINT attendance_instructor_id_fkey 
FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;

-- Course material access logs - CASCADE
ALTER TABLE course_material_access_logs 
DROP CONSTRAINT IF EXISTS course_material_access_logs_user_id_fkey;

ALTER TABLE course_material_access_logs 
ADD CONSTRAINT course_material_access_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Secure file tokens - CASCADE
ALTER TABLE secure_file_tokens 
DROP CONSTRAINT IF EXISTS secure_file_tokens_user_id_fkey;

ALTER TABLE secure_file_tokens 
ADD CONSTRAINT secure_file_tokens_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Password reset tokens - CASCADE
ALTER TABLE password_reset_tokens 
DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;

ALTER TABLE password_reset_tokens 
ADD CONSTRAINT password_reset_tokens_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add a function to safely delete users with all related data
CREATE OR REPLACE FUNCTION delete_user_safely(user_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = user_id_param) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE NOTICE 'User with ID % does not exist', user_id_param;
        RETURN FALSE;
    END IF;
    
    -- Log the deletion attempt
    RAISE NOTICE 'Starting deletion of user ID: %', user_id_param;
    
    -- Delete the user (all related records will be handled by CASCADE/SET NULL)
    DELETE FROM users WHERE id = user_id_param;
    
    RAISE NOTICE 'Successfully deleted user ID: %', user_id_param;
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting user ID %: %', user_id_param, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Add a function to get user deletion impact (what will be affected)
CREATE OR REPLACE FUNCTION get_user_deletion_impact(user_id_param INTEGER)
RETURNS TABLE(
    table_name TEXT,
    record_count BIGINT,
    action TEXT
) AS $$
BEGIN
    -- Return information about what will be affected by user deletion
    RETURN QUERY
    SELECT 'enrollments'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM enrollments WHERE user_id = user_id_param
    UNION ALL
    SELECT 'payments'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM payments WHERE user_id = user_id_param
    UNION ALL
    SELECT 'assignment_submissions'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM assignment_submissions WHERE student_id = user_id_param
    UNION ALL
    SELECT 'quiz_attempts'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM quiz_attempts WHERE student_id = user_id_param
    UNION ALL
    SELECT 'notifications'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM notifications WHERE user_id = user_id_param
    UNION ALL
    SELECT 'lesson_progress'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM lesson_progress WHERE student_id = user_id_param
    UNION ALL
    SELECT 'course_instructors'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM course_instructors WHERE instructor_id = user_id_param
    UNION ALL
    SELECT 'attendance'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM attendance WHERE student_id = user_id_param OR instructor_id = user_id_param
    UNION ALL
    SELECT 'course_material_access_logs'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM course_material_access_logs WHERE user_id = user_id_param
    UNION ALL
    SELECT 'secure_file_tokens'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM secure_file_tokens WHERE user_id = user_id_param
    UNION ALL
    SELECT 'password_reset_tokens'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM password_reset_tokens WHERE user_id = user_id_param
    UNION ALL
    SELECT 'courses (instructor_id)'::TEXT, COUNT(*)::BIGINT, 'SET NULL'::TEXT FROM courses WHERE instructor_id = user_id_param
    UNION ALL
    SELECT 'course_materials (upload_by)'::TEXT, COUNT(*)::BIGINT, 'SET NULL'::TEXT FROM course_materials WHERE upload_by = user_id_param
    UNION ALL
    SELECT 'live_classes (created_by)'::TEXT, COUNT(*)::BIGINT, 'DELETE (CASCADE)'::TEXT FROM live_classes WHERE created_by = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create an index on users.email for better performance during user lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create an index on users.role for better performance during role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add a comment to document the migration
COMMENT ON FUNCTION delete_user_safely(INTEGER) IS 'Safely deletes a user and all related data with proper cascade handling';
COMMENT ON FUNCTION get_user_deletion_impact(INTEGER) IS 'Returns information about what records will be affected when deleting a user';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'User deletion constraints migration completed successfully';
END $$;