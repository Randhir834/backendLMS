-- Create trial requests table
CREATE TABLE IF NOT EXISTS trial_requests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  grade VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for email query/searching if needed
CREATE INDEX IF NOT EXISTS idx_trial_requests_email ON trial_requests(email);
