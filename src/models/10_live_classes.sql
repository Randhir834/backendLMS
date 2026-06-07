-- Live classes table (Google Meet integration)
CREATE TABLE live_classes (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meet_link VARCHAR(500) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(50) DEFAULT 'scheduled',
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_live_classes_course_id ON live_classes(course_id);
CREATE INDEX idx_live_classes_scheduled_at ON live_classes(scheduled_at);
CREATE INDEX idx_live_classes_status ON live_classes(status);
