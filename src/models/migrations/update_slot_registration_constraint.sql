-- Migration: Update slot registration constraint to enforce one slot per day per course
-- This allows students to book one slot per day, not just one slot per course

-- Step 1: Drop the old unique constraint
ALTER TABLE slot_registrations 
DROP CONSTRAINT IF EXISTS slot_registrations_slot_id_student_id_key;

-- Step 2: Add day_of_week column if it doesn't exist (denormalized for performance)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'slot_registrations' 
    AND column_name = 'day_of_week'
  ) THEN
    -- Add the column
    ALTER TABLE slot_registrations 
    ADD COLUMN day_of_week INTEGER;
    
    -- Populate it from the related slot
    UPDATE slot_registrations sr
    SET day_of_week = ias.day_of_week
    FROM instructor_availability_slots ias
    WHERE sr.slot_id = ias.id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE slot_registrations 
    ALTER COLUMN day_of_week SET NOT NULL;
    
    -- Add check constraint
    ALTER TABLE slot_registrations
    ADD CONSTRAINT check_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6);
  END IF;
END $$;

-- Step 3: Create new unique constraint for one slot per day per course per student
-- Only one registration per student per course per day (regardless of status being registered)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_slot_per_day_per_course 
ON slot_registrations (student_id, course_id, day_of_week, status)
WHERE status = 'registered';

-- Step 4: Add comment
COMMENT ON COLUMN slot_registrations.day_of_week IS 'Day of week (0=Sunday, 6=Saturday) - denormalized for constraint enforcement';

-- Step 5: Create trigger to ensure day_of_week is always synced with slot
CREATE OR REPLACE FUNCTION sync_slot_day_of_week()
RETURNS TRIGGER AS $$
BEGIN
  SELECT day_of_week INTO NEW.day_of_week
  FROM instructor_availability_slots
  WHERE id = NEW.slot_id;
  
  IF NEW.day_of_week IS NULL THEN
    RAISE EXCEPTION 'Invalid slot_id: slot does not exist';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_slot_day_of_week ON slot_registrations;
CREATE TRIGGER trg_sync_slot_day_of_week
  BEFORE INSERT OR UPDATE OF slot_id ON slot_registrations
  FOR EACH ROW
  EXECUTE FUNCTION sync_slot_day_of_week();

-- Migration completed
SELECT 'Migration completed: One slot per day per course constraint applied' AS status;
