-- Create instructor registrations table
CREATE TABLE IF NOT EXISTS instructor_registrations (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  qualification VARCHAR(255) NOT NULL,
  subject_expertise VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  role VARCHAR(50) DEFAULT 'instructor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for phone number query/searching if needed
CREATE INDEX IF NOT EXISTS idx_instructor_registrations_phone ON instructor_registrations(phone_number);

-- Index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_instructor_registrations_created_at ON instructor_registrations(created_at DESC);

-- Index for role query
CREATE INDEX IF NOT EXISTS idx_instructor_registrations_role ON instructor_registrations(role);
