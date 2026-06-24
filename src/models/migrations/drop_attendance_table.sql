-- Migration: Drop attendance table
-- Created: 2026-06-23
-- Description: Remove attendance management functionality from the system

-- Drop the attendance table if it exists
DROP TABLE IF EXISTS attendance CASCADE;

-- Log migration
INSERT INTO migration_history (version, description, executed_at)
VALUES ('drop_attendance_table', 'Remove attendance management functionality', NOW())
ON CONFLICT (version) DO NOTHING;
