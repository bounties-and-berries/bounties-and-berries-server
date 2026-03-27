-- =========================
-- BERRY_PURCHASES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS berry_purchases (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES "user"(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    payment_ref VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_bp_admin_id ON berry_purchases(admin_id);
CREATE INDEX IF NOT EXISTS idx_bp_payment_ref ON berry_purchases(payment_ref);

COMMENT ON TABLE berry_purchases IS 'Tracks berries purchased by administrators for the institution';

CREATE TRIGGER update_berry_purchases_modified_on
BEFORE UPDATE ON berry_purchases
FOR EACH ROW
EXECUTE PROCEDURE update_modified_on_column();
