-- =========================
-- BERRY RULES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS berry_rules (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    points INTEGER NOT NULL,
    max_per_semester INTEGER DEFAULT NULL,
    auto_grant BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_berry_rules_category ON berry_rules(category);
CREATE INDEX IF NOT EXISTS idx_berry_rules_active ON berry_rules(is_active);

-- Add trigger for modified_on
CREATE OR REPLACE TRIGGER update_berry_rules_modified_on
BEFORE UPDATE ON berry_rules
FOR EACH ROW
EXECUTE PROCEDURE update_modified_on_column();

COMMENT ON TABLE berry_rules IS 'Stores rules for berry allocation based on achievements and categories';

-- =========================
-- BERRY PURCHASES TABLE  
-- =========================
CREATE TABLE IF NOT EXISTS berry_purchases (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES "user"(id),
    quantity INTEGER NOT NULL,
    payment_ref VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_berry_purchases_admin_id ON berry_purchases(admin_id);
CREATE INDEX IF NOT EXISTS idx_berry_purchases_status ON berry_purchases(status);
CREATE INDEX IF NOT EXISTS idx_berry_purchases_payment_ref ON berry_purchases(payment_ref);

-- Add trigger for modified_on
CREATE OR REPLACE TRIGGER update_berry_purchases_modified_on
BEFORE UPDATE ON berry_purchases
FOR EACH ROW
EXECUTE PROCEDURE update_modified_on_column();

COMMENT ON TABLE berry_purchases IS 'Stores admin berry purchase transactions with payment references';