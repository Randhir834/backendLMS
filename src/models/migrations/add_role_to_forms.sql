-- Add role column to trial_requests table if it doesn't exist
ALTER TABLE trial_requests
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student';

-- Create index for role in trial_requests
CREATE INDEX IF NOT EXISTS idx_trial_requests_role ON trial_requests(role);

-- Add role column to instructor_registrations table if it doesn't exist
ALTER TABLE instructor_registrations
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'instructor';

-- Create index for role in instructor_registrations
CREATE INDEX IF NOT EXISTS idx_instructor_registrations_role ON instructor_registrations(role);
