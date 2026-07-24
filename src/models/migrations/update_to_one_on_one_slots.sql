-- Migration: Update to 1-to-1 mentoring slots
-- Changes system from group slots to one student per slot
-- NOTE: This migration is skipped if the instructor_availability_slots table doesn't exist

DO $$ 
BEGIN
  -- Check if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'instructor_availability_slots'
  ) THEN
    -- Step 1: Update all existing slots to capacity of 1
    UPDATE instructor_availability_slots 
    SET max_capacity = 1
    WHERE max_capacity IS NULL OR max_capacity > 1;

    -- Step 2: Change default max_capacity to 1
    ALTER TABLE instructor_availability_slots 
    ALTER COLUMN max_capacity SET DEFAULT 1;

    -- Step 3: Drop the "one slot per day per course" constraint since students can now book multiple slots
    DROP INDEX IF EXISTS idx_one_slot_per_day_per_course;

    -- Step 4: Add back a simpler constraint: one student per slot (slot_id is unique per registration)
    -- First, check if there are any duplicate active registrations per slot
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'slot_registrations'
    ) THEN
      -- Check for duplicates
      IF EXISTS (
        SELECT slot_id 
        FROM slot_registrations 
        WHERE status = 'registered'
        GROUP BY slot_id 
        HAVING COUNT(*) > 1
      ) THEN
        RAISE NOTICE 'Warning: Found slots with multiple registrations. Keeping only the first registration per slot.';
        
        -- Keep only the first registration per slot, mark others as cancelled
        UPDATE slot_registrations sr
        SET status = 'cancelled'
        WHERE status = 'registered'
        AND id NOT IN (
          SELECT MIN(id)
          FROM slot_registrations
          WHERE status = 'registered'
          GROUP BY slot_id
        );
      END IF;

      -- Step 5: Create unique constraint: one active registration per slot
      DROP INDEX IF EXISTS idx_one_student_per_slot;
      CREATE UNIQUE INDEX idx_one_student_per_slot
      ON slot_registrations (slot_id)
      WHERE status = 'registered';

      -- Step 6: Add helpful comments
      COMMENT ON INDEX idx_one_student_per_slot IS 'Ensures only one student can book a slot (1-to-1 mentoring)';
    END IF;
    
    COMMENT ON COLUMN instructor_availability_slots.max_capacity IS 'Maximum students per slot (always 1 for 1-to-1 mentoring)';
  END IF;
END $$;
