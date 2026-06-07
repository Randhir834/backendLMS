-- Migration history tracking table
-- This table keeps track of which migrations have been applied
-- Run this first before any other migrations

CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migration_history_name ON migration_history(migration_name);

-- Add comment
COMMENT ON TABLE migration_history IS 'Tracks which database migrations have been applied';
