CREATE TABLE IF NOT EXISTS user_bounty_participation (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id),
    bounty_id BIGINT NOT NULL REFERENCES bounty(id),
    points_earned BIGINT DEFAULT 0,
    berries_earned BIGINT DEFAULT 0,
    status VARCHAR(255),
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_ubp_user_id ON user_bounty_participation(user_id);
CREATE INDEX IF NOT EXISTS idx_ubp_bounty_id ON user_bounty_participation(bounty_id);

