-- Migration: Add one slot per day restriction (global across all courses)
-- Combines: 1-to-1 mentoring + one slot per day per student

-- Step 1: Keep the existing "one student per slot" constraint
-- (This is already in place from previous migration)

-- Step 2: Add "one slot per day per student" constraint (across all courses)
-- First, check for violations and clean them up
DO $$ 
BEGIN
  -- Check for students with multiple registrations on the same day
  IF EXISTS (
    SELECT sr.student_id, ias.day_of_week, COUNT(*)
    FROM slot_registrations sr
    JOIN instructor_availability_slots ias ON sr.slot_id = ias.id
    WHERE sr.status = 'registered'
    GROUP BY sr.student_id, ias.day_of_week
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Warning: Found students with multiple bookings on same day. Keeping only the first booking per day.';
    
    -- Keep only the first registration per student per day, mark others as cancelled
    UPDATE slot_registrations sr
    SET status = 'cancelled'
    WHERE status = 'registered'
    AND id NOT IN (
      SELECT MIN(sr2.id)
      FROM slot_registrations sr2
      JOIN instructor_availability_slots ias2 ON sr2.slot_id = ias2.id
      WHERE sr2.status = 'registered'
      GROUP BY sr2.student_id, ias2.day_of_week
    );
  END IF;
END $$;

-- Step 3: Create unique constraint: one registration per student per day (any course)
-- Need to use a function-based unique index since day_of_week is in a different table
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_slot_per_day_per_student
ON slot_registrations (student_id, day_of_week)
WHERE status = 'registered';

-- Step 4: Add helpful comments
COMMENT ON INDEX idx_one_slot_per_day_per_student IS 'Ensures student can book only one slot per day across all courses';
COMMENT ON INDEX idx_one_student_per_slot IS 'Ensures only one student can book a slot (1-to-1 mentoring)';

-- Migration completed
SELECT 'Migration completed: One slot per day per student (global) + One student per slot' AS status;
