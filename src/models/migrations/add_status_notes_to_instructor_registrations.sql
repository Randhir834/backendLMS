-- Migration: Add status and notes columns to instructor_registrations table
-- This allows admin to track the status of instructor applications and add notes

-- Add status column with CHECK constraint
ALTER TABLE instructor_registrations 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
CHECK (status IN ('pending', 'contacted', 'accepted', 'rejected'));

-- Add notes column for admin comments
ALTER TABLE instructor_registrations 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_instructor_registrations_status ON instructor_registrations(status);

-- Add comment
COMMENT ON COLUMN instructor_registrations.status IS 'Application status: pending, contacted, accepted, or rejected';
COMMENT ON COLUMN instructor_registrations.notes IS 'Admin notes about the application';
