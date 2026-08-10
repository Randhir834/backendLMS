-- Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author VARCHAR(255) NOT NULL,
  featured_image_url TEXT,
  publication_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);

-- Create index on publication_date for sorting
CREATE INDEX IF NOT EXISTS idx_blogs_publication_date ON blogs(publication_date DESC);

-- Create index on created_by for author filtering
CREATE INDEX IF NOT EXISTS idx_blogs_created_by ON blogs(created_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS blogs_updated_at_trigger ON blogs;
CREATE TRIGGER blogs_updated_at_trigger
  BEFORE UPDATE ON blogs
  FOR EACH ROW
  EXECUTE FUNCTION update_blogs_updated_at();
