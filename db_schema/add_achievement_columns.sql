-- =========================
-- ADD ACHIEVEMENT SYSTEM COLUMNS
-- =========================

-- Add completed_at column to user_bounty_participation for achievement calculations
ALTER TABLE user_bounty_participation 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Create index for achievement queries
CREATE INDEX IF NOT EXISTS idx_ubp_completed_at ON user_bounty_participation(completed_at);
CREATE INDEX IF NOT EXISTS idx_ubp_status_completed ON user_bounty_participation(status, completed_at);

-- Add comment
COMMENT ON COLUMN user_bounty_participation.completed_at IS 'Timestamp when bounty was completed (for achievement calculations)';

