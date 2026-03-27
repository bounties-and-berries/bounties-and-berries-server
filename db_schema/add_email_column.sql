-- =========================
-- ADD EMAIL COLUMN TO USER TABLE
-- =========================

-- Add email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE "user" ADD COLUMN email VARCHAR(255) UNIQUE;
        RAISE NOTICE 'Added email column to user table';
    ELSE
        RAISE NOTICE 'email column already exists in user table';
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN "user".email IS 'User email address for communication and authentication';