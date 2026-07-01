-- Migration: Remove all unused and deprecated tables
-- Created: 2026-06-25
-- Description: Clean up database by removing tables that are no longer used

-- TABLES BEING REMOVED:
-- 1. assignment_assignments & assignment_files - Assignment feature removed
-- 2. attendance - Attendance tracking removed
-- 3. quiz_options & quiz_responses - Quiz feature removed
-- 4. instructor_availability_slots & slot_registrations - Slot booking system removed
-- 5. certificates - Empty, not implemented
-- 6. instructor_registrations - Empty, not used
-- 7. lesson_progress - Empty, not implemented
-- 8. lessons - Empty, not used in current course structure
-- 9. sections - Empty, not used in current course structure

-- TABLES BEING KEPT (even though empty, they are actively used in code):
-- - secure_file_tokens - Used in courseMaterialService for secure file access
-- - password_reset_tokens - Used in passwordResetService for password resets
-- - course_metadata - Used in recommendationController (to be populated)
-- - notifications - May be implemented in future
-- - system_settings - May be used for configuration

BEGIN;

-- Drop tables related to assignments (removed feature)
DROP TABLE IF EXISTS assignment_files CASCADE;
DROP TABLE IF EXISTS assignment_assignments CASCADE;

-- Drop attendance table (removed feature)  
DROP TABLE IF EXISTS attendance CASCADE;

-- Drop quiz tables (removed feature)
DROP TABLE IF EXISTS quiz_responses CASCADE;
DROP TABLE IF EXISTS quiz_options CASCADE;

-- Drop slot booking tables (removed feature)
DROP TABLE IF EXISTS slot_registrations CASCADE;
DROP TABLE IF EXISTS instructor_availability_slots CASCADE;

-- Drop indexes related to slot system (if they still exist)
DROP INDEX IF EXISTS idx_availability_instructor_course;
DROP INDEX IF EXISTS idx_availability_day_hour;
DROP INDEX IF EXISTS idx_availability_slot_date;
DROP INDEX IF EXISTS idx_availability_date_instructor;
DROP INDEX IF EXISTS idx_slot_registrations_slot;
DROP INDEX IF EXISTS idx_slot_registrations_student;
DROP INDEX IF EXISTS idx_slot_registrations_course;
DROP INDEX IF EXISTS idx_slot_registrations_status;
DROP INDEX IF EXISTS idx_one_student_per_slot;
DROP INDEX IF EXISTS idx_one_slot_per_day_per_student;
DROP INDEX IF EXISTS idx_one_slot_per_day_per_course;

-- Drop empty/unused tables that were never properly implemented
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS instructor_registrations CASCADE;
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS sections CASCADE;

-- Log the migration
INSERT INTO migration_history (migration_name, executed_at)
VALUES ('remove_all_unused_tables', NOW())
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

-- Verify remaining tables
SELECT 
  'Tables remaining: ' || COUNT(*) AS status
FROM pg_tables 
WHERE schemaname = 'public';

SELECT 
  '✅ Migration completed successfully - 12 unused tables removed' AS message;
