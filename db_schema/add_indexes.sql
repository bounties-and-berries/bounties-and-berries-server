-- Performance Optimization: B-Tree Indexes
-- These indexes will significantly speed up common WHERE clauses and JOINs.

-- Index for User Role filtering (e.g. finding all students or admins)
CREATE INDEX IF NOT EXISTS idx_user_role_id ON "user"(role_id);

-- Index for User college filtering
CREATE INDEX IF NOT EXISTS idx_user_college_id ON "user"(college_id);

-- Index for User Reward Claims (e.g. querying a specific student's claimed rewards)
CREATE INDEX IF NOT EXISTS idx_reward_claim_user_id ON user_reward_claim(user_id);

-- Index for filtering Bounties by creator (faculty)
CREATE INDEX IF NOT EXISTS idx_bounty_created_by ON bounty(created_by);

-- Index for Bounty Participations by user (frequent query for student history)
CREATE INDEX IF NOT EXISTS idx_bounty_participation_user_id ON user_bounty_participation(user_id);

-- Index for Bounty Participations by bounty (frequent query for faculty approvals)
CREATE INDEX IF NOT EXISTS idx_bounty_participation_bounty_id ON user_bounty_participation(bounty_id);

-- Composite index for Bounty Participations by user+status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_bounty_participation_user_status ON user_bounty_participation(user_id, status);

-- Index for Point Requests by student (correct column name)
CREATE INDEX IF NOT EXISTS idx_point_request_student_id ON point_request(student_id);

-- Index for Point Requests by status (frequent query for pending faculty approvals)
CREATE INDEX IF NOT EXISTS idx_point_request_status ON point_request(status);

-- Index for Point Requests by faculty
CREATE INDEX IF NOT EXISTS idx_point_request_faculty_id ON point_request(faculty_id);

-- SaaS Scale Tenant Indexes for querying per-college dynamically
CREATE INDEX IF NOT EXISTS idx_bounty_college ON bounty(college_id);
CREATE INDEX IF NOT EXISTS idx_reward_college ON reward(college_id);
CREATE INDEX IF NOT EXISTS idx_point_request_college ON point_request(college_id);

-- Covering Composite Indexes for highly recurrent tenant queries dynamically with sorts
CREATE INDEX IF NOT EXISTS idx_bounty_college_active_cov ON bounty (college_id, is_active, created_on DESC) INCLUDE (id, name);
CREATE INDEX IF NOT EXISTS idx_pr_college_status_cov ON point_request (college_id, status, created_on DESC) INCLUDE (id, student_id);
