-- Add student profile fields to users table
-- Run this in your Supabase SQL editor or via psql

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS school VARCHAR(255),
  ADD COLUMN IF NOT EXISTS grade VARCHAR(50),
  ADD COLUMN IF NOT EXISTS parent_guardian_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255);
