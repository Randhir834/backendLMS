-- Add password_changed flag to track if user has changed their default password
ALTER TABLE users ADD COLUMN password_changed BOOLEAN DEFAULT TRUE;

-- Update existing users to mark password as changed (they already have custom passwords)
UPDATE users SET password_changed = TRUE;
