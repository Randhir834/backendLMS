-- Course Materials table for secure file storage
CREATE TABLE course_materials (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_type VARCHAR(50) NOT NULL, -- 'pdf', 'ppt', 'image', 'document'
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- Supabase storage path
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  is_secure BOOLEAN DEFAULT TRUE, -- Whether file requires secure viewing
  access_level VARCHAR(50) DEFAULT 'instructor', -- 'instructor', 'admin'
  upload_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_course_materials_course_id ON course_materials(course_id);
CREATE INDEX idx_course_materials_file_type ON course_materials(file_type);
CREATE INDEX idx_course_materials_access_level ON course_materials(access_level);

-- Course Material Access Logs table for tracking access
CREATE TABLE course_material_access_logs (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_type VARCHAR(50) NOT NULL, -- 'view', 'download_attempt', 'screenshot_attempt'
  ip_address INET,
  user_agent TEXT,
  access_granted BOOLEAN DEFAULT TRUE,
  blocked_reason TEXT, -- Reason if access was blocked
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for access logs
CREATE INDEX idx_material_access_logs_material_id ON course_material_access_logs(material_id);
CREATE INDEX idx_material_access_logs_user_id ON course_material_access_logs(user_id);
CREATE INDEX idx_material_access_logs_access_type ON course_material_access_logs(access_type);
CREATE INDEX idx_material_access_logs_accessed_at ON course_material_access_logs(accessed_at);

-- Secure File Tokens table for temporary access tokens
CREATE TABLE secure_file_tokens (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for secure tokens
CREATE INDEX idx_secure_file_tokens_token ON secure_file_tokens(token);
CREATE INDEX idx_secure_file_tokens_material_user ON secure_file_tokens(material_id, user_id);
CREATE INDEX idx_secure_file_tokens_expires_at ON secure_file_tokens(expires_at);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM secure_file_tokens 
  WHERE expires_at < NOW() OR is_used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired tokens (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 * * * *', 'SELECT cleanup_expired_tokens();');