

CREATE TABLE IF NOT EXISTS "user" (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(255) NOT NULL UNIQUE,
    role_id BIGINT NOT NULL REFERENCES role(id),
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    college_id BIGINT NOT NULL REFERENCES college(id),
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_user_role_id ON "user"(role_id);
CREATE INDEX IF NOT EXISTS idx_user_college_id ON "user"(college_id);
