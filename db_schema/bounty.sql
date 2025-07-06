-- =========================
-- BOUNTY TABLE
-- =========================
CREATE TABLE IF NOT EXISTS bounty (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(255),
    img_url TEXT,
    alloted_points BIGINT,
    alloted_berries BIGINT,
    scheduled_date TIMESTAMP,
    venue VARCHAR(255),
    capacity BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
);

COMMENT ON TABLE bounty IS 'Represents tasks or events that users can participate in to earn points and berries';

CREATE TRIGGER update_bounty_modified_on
BEFORE UPDATE ON bounty
FOR EACH ROW
EXECUTE PROCEDURE update_modified_on_column(); 