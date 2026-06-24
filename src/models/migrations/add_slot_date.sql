-- Migration: Add specific date to instructor availability slots
-- This allows slots to be scheduled for specific dates instead of just recurring days

-- Step 1: Add slot_date column (nullable initially for backwards compatibility)
ALTER TABLE instructor_availability_slots 
ADD COLUMN IF NOT EXISTS slot_date DATE;

-- Step 2: Add index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_availability_slot_date ON instructor_availability_slots(slot_date);

-- Step 3: Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_availability_date_instructor ON instructor_availability_slots(slot_date, instructor_id);

-- Step 4: Update the unique constraint to include date
-- First drop the old constraint
ALTER TABLE instructor_availability_slots 
DROP CONSTRAINT IF EXISTS instructor_availability_slots_instructor_id_course_id_day_of_week_key;

-- Add new constraint that includes date
-- This allows same day/hour but different dates, or same date but different hours
ALTER TABLE instructor_availability_slots 
ADD CONSTRAINT instructor_availability_slots_unique_date_slot 
UNIQUE (instructor_id, course_id, slot_date, hour);

-- Step 5: Add check constraint to ensure slot_date is not in the past
ALTER TABLE instructor_availability_slots
ADD CONSTRAINT check_slot_date_not_past 
CHECK (slot_date >= CURRENT_DATE);

-- Step 6: Add comments
COMMENT ON COLUMN instructor_availability_slots.slot_date IS 'Specific date for this slot (YYYY-MM-DD). If null, slot is recurring based on day_of_week';
COMMENT ON CONSTRAINT instructor_availability_slots_unique_date_slot ON instructor_availability_slots IS 'Ensures instructor cannot create duplicate slots for same date and hour in same course';

-- Migration completed
SELECT 'Migration completed: Added slot_date column with constraints and indexes' AS status;
