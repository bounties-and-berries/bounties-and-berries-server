-- =========================
-- ADD IMAGE_HASH COLUMN TO BOUNTY TABLE
-- =========================

-- Add image_hash column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bounty' 
        AND column_name = 'image_hash'
    ) THEN
        ALTER TABLE bounty ADD COLUMN image_hash TEXT;
        RAISE NOTICE 'Added image_hash column to bounty table';
    ELSE
        RAISE NOTICE 'image_hash column already exists in bounty table';
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN bounty.image_hash IS 'Hash of the uploaded image for integrity verification'; 