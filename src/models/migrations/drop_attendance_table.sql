-- Migration: Drop attendance table
-- Created: 2026-06-23
-- Description: Remove attendance management functionality from the system

-- Drop the attendance table if it exists
DROP TABLE IF EXISTS attendance CASCADE;
