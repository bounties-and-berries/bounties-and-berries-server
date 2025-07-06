-- =========================
-- ROLE TABLE
-- =========================
CREATE TABLE IF NOT EXISTS role (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

COMMENT ON TABLE role IS 'Defines the user''s role in the system (e.g., admin, participant)'; 