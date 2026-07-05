-- Contact Requests Table
CREATE TABLE IF NOT EXISTS contact_requests (
  id SERIAL PRIMARY KEY,
  parent_name VARCHAR(255) NOT NULL,
  child_name VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  course_interest VARCHAR(100),
  message TEXT,
  type VARCHAR(20) DEFAULT 'general' CHECK (type IN ('general', 'trial')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_type ON contact_requests(type);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON contact_requests(email);

-- Add comment
COMMENT ON TABLE contact_requests IS 'Stores contact form submissions and trial requests from the website';
