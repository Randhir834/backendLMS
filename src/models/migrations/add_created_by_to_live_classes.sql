-- Add created_by field to live_classes table to track which instructor created the class
ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_live_classes_created_by ON live_classes(created_by);
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled_at ON live_classes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_classes_course_id ON live_classes(course_id);
