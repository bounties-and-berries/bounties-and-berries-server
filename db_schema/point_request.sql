-- Point Request Table Schema
-- This table stores student point requests for activities completed outside the bounty system

CREATE TABLE IF NOT EXISTS point_request (
    -- Primary identification
    id BIGSERIAL PRIMARY KEY,
    
    -- User relationships
    student_id BIGINT NOT NULL REFERENCES "user"(id),
    faculty_id BIGINT REFERENCES "user"(id),
    
    -- Request details
    activity_title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    activity_date DATE NOT NULL,
    
    -- Evidence and proof
    proof_url TEXT,
    proof_description TEXT NOT NULL,
    proof_file_hash TEXT,
    
    -- Points and rewards
    points_requested INTEGER NOT NULL DEFAULT 0,
    berries_requested INTEGER NOT NULL DEFAULT 0,
    points_awarded INTEGER DEFAULT 0,
    berries_awarded INTEGER DEFAULT 0,
    
    -- Status and workflow
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    -- Faculty feedback
    faculty_comment TEXT,
    approval_date TIMESTAMP,
    
    -- Audit fields (following existing pattern)
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    
    -- Tracking fields
    submission_date TIMESTAMP,
    
    -- Integration fields
    bounty_participation_id BIGINT REFERENCES user_bounty_participation(id)
);

-- Performance indexes only
CREATE INDEX IF NOT EXISTS idx_pr_student_id ON point_request(student_id);
CREATE INDEX IF NOT EXISTS idx_pr_faculty_id ON point_request(faculty_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON point_request(status);
CREATE INDEX IF NOT EXISTS idx_pr_category ON point_request(category);
CREATE INDEX IF NOT EXISTS idx_pr_created_on ON point_request(created_on);
CREATE INDEX IF NOT EXISTS idx_pr_submission_date ON point_request(submission_date);

-- Standard trigger for modified_on
CREATE TRIGGER update_point_request_modified_on
BEFORE UPDATE ON point_request
FOR EACH ROW
EXECUTE PROCEDURE update_modified_on_column();

-- Table comment
COMMENT ON TABLE point_request IS 'Student point requests for activity completion outside bounty system';