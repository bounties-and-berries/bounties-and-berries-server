-- =========================
-- ADD REVIEWER CAPABILITY TO USER TABLE
-- =========================

-- Add reviewer capability column
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS can_review_point_requests BOOLEAN DEFAULT FALSE;

-- Add index for performance (only index TRUE values for efficiency)
CREATE INDEX IF NOT EXISTS idx_user_can_review_point_requests 
ON "user"(can_review_point_requests) 
WHERE can_review_point_requests = TRUE;

-- Add index for active reviewers by college
CREATE INDEX IF NOT EXISTS idx_user_active_reviewers_college 
ON "user"(college_id, can_review_point_requests) 
WHERE can_review_point_requests = TRUE AND is_active = TRUE;

-- Comment for documentation
COMMENT ON COLUMN "user".can_review_point_requests IS 'Indicates if this user can review and approve point requests from students';

-- Update some existing faculty users to be reviewers (optional - for testing)
-- UPDATE "user" SET can_review_point_requests = TRUE WHERE role_id = 2 AND is_active = TRUE;
