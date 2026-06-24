-- Migration: Remove the entire time-slot booking system
-- This drops all slot-related tables and constraints

-- Step 1: Drop slot_registrations table (has foreign key to slots)
DROP TABLE IF EXISTS slot_registrations CASCADE;

-- Step 2: Drop instructor_availability_slots table
DROP TABLE IF NOT EXISTS instructor_availability_slots CASCADE;

-- Step 3: Drop any remaining indexes
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

-- Migration completed
SELECT 'Migration completed: Slot system removed successfully' AS status;
