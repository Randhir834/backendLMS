-- Alter trial_requests to add grade column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='trial_requests' AND column_name='grade'
    ) THEN
        ALTER TABLE trial_requests ADD COLUMN grade VARCHAR(255);
    END IF;
END $$;
