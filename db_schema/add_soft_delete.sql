-- Migration: Add Soft-Delete Architecture to Bounties and Rewards
-- This guarantees analytic data isn't compromised when an admin "deletes" a bounty or reward.

ALTER TABLE bounty ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE reward ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes on the new column to maintain fast query speeds when filtering out deleted items
CREATE INDEX IF NOT EXISTS idx_bounty_is_deleted ON bounty(is_deleted);
CREATE INDEX IF NOT EXISTS idx_reward_is_deleted ON reward(is_deleted);
