-- Remove first_login_required field from users table
-- This removes the first-time login password change functionality

ALTER TABLE users 
DROP COLUMN IF EXISTS first_login_required;
