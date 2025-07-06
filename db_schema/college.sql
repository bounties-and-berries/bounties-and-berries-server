-- =========================
-- COLLEGE TABLE
-- =========================
CREATE TABLE IF NOT EXISTS college (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    berries_purchased BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE college IS 'Stores details of educational institutions linked with users'; 