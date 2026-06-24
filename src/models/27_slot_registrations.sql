-- Slot registrations table for student bookings
CREATE TABLE IF NOT EXISTS slot_registrations (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES instructor_availability_slots(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_id, student_id) -- Prevent duplicate registrations
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slot_registrations_slot ON slot_registrations(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_registrations_student ON slot_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_slot_registrations_course ON slot_registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_slot_registrations_status ON slot_registrations(status);

-- Comment
COMMENT ON TABLE slot_registrations IS 'Student registrations for instructor availability slots';
COMMENT ON COLUMN slot_registrations.status IS 'Registration status: registered, cancelled, completed';

-- Add max_capacity to instructor_availability_slots if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instructor_availability_slots' 
    AND column_name = 'max_capacity'
  ) THEN
    ALTER TABLE instructor_availability_slots 
    ADD COLUMN max_capacity INTEGER DEFAULT 10 CHECK (max_capacity > 0);
  END IF;
END $$;

COMMENT ON COLUMN instructor_availability_slots.max_capacity IS 'Maximum number of students that can register for this slot';
