-- System settings table
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (key, value) VALUES
  ('platform_name', 'PlayFit LMS'),
  ('default_currency', 'INR'),
  ('max_file_upload_size_mb', '50'),
  ('allow_self_registration', 'true');
