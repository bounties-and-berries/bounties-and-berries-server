-- =========================
-- USER TABLE
-- =========================
CREATE TABLE IF NOT EXISTS "user" (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE, -- Main user name field for login
    mobilenumber VARCHAR(255) NOT NULL UNIQUE, -- For login
    name VARCHAR(255) NOT NULL, -- Display name
    mobile VARCHAR(255) NOT NULL UNIQUE,
    role_id BIGINT NOT NULL REFERENCES role(id),
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    college_id BIGINT NOT NULL REFERENCES college(id),
    img_url TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_user_role_id ON "user"(role_id);
CREATE INDEX IF NOT EXISTS idx_user_college_id ON "user"(college_id);

COMMENT ON TABLE "user" IS 'Represents a system user, including students or administrators. Username is the main user name field.';

CREATE TRIGGER update_user_modified_on
BEFORE UPDATE ON "user"
FOR EACH ROW
EXECUTE PROCEDURE update_modified_on_column(); 