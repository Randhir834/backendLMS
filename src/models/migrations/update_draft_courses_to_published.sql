-- Migration: Update existing draft courses to published status
-- This ensures courses created by admin before the fix are visible to students

UPDATE courses 
SET status = 'published', 
    updated_at = NOW()
WHERE status = 'draft';
