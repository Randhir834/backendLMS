-- Migration: Replace "one slot per day" with "no overlapping time slots" constraint
-- This allows students to book multiple slots on the same day as long as times don't overlap

-- Step 1: Drop the old "one slot per day" constraint
-- This constraint prevented students from booking multiple slots on the same day
DROP INDEX IF EXISTS idx_one_slot_per_day_per_student;

-- Step 2: We rely on application-level validation for time overlap checking
-- The backend checks if student has a booking at the same day AND same hour
-- This allows: Monday 10:00 AM + Monday 2:00 PM ✅ (different hours)
-- This blocks: Monday 10:00 AM + Monday 10:00 AM ❌ (same hour = overlap)

-- Note: The constraint (slot_id, student_id) UNIQUE still prevents duplicate registrations for the same slot
-- Note: The idx_one_student_per_slot constraint still enforces 1-to-1 mentoring

-- Migration completed
SELECT 'Migration completed: Removed day-based constraint, now using time-based overlap validation' AS status;
