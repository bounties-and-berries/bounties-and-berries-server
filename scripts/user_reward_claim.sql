CREATE TABLE IF NOT EXISTS user_reward_claim (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id),
    reward_id BIGINT NOT NULL REFERENCES reward(id),
    berries_spent BIGINT NOT NULL,
    redeemable_code VARCHAR(1024) NOT NULL UNIQUE,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_urc_user_id ON user_reward_claim(user_id);
CREATE INDEX IF NOT EXISTS idx_urc_reward_id ON user_reward_claim(reward_id);