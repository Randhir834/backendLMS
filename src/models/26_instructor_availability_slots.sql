-- Simple instructor availability slots table
CREATE TABLE IF NOT EXISTS instructor_availability_slots (
  id SERIAL PRIMARY KEY,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23), -- 0-23 for 24-hour format
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id, course_id, day_of_week, hour)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability_instructor_course ON instructor_availability_slots(instructor_id, course_id);
CREATE INDEX IF NOT EXISTS idx_availability_day_hour ON instructor_availability_slots(day_of_week, hour);

-- Comment
COMMENT ON TABLE instructor_availability_slots IS 'Simple hourly availability slots for instructors per course';
COMMENT ON COLUMN instructor_availability_slots.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN instructor_availability_slots.hour IS 'Hour of day in 24-hour format (0-23)';
