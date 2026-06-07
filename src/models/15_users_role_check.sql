-- Optional: enforce allowed roles at the database level (run after users exist with valid roles)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'instructor', 'admin'));
