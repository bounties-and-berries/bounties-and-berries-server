-- =========================
-- REWARD TABLE
-- =========================
CREATE TABLE IF NOT EXISTS reward (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    berries_required BIGINT NOT NULL,
    expiry_date TIMESTAMP,
    img_url TEXT,
    image_hash TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255)
);

COMMENT ON TABLE reward IS 'Represents available rewards users can claim using their berries';

CREATE TRIGGER update_reward_modified_on
BEFORE UPDATE ON reward
FOR EACH ROW
EXECUTE PROCEDURE update_modified_on_column(); 