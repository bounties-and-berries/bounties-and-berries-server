-- =========================
-- LEDGER ACCOUNTS
-- =========================
CREATE TABLE IF NOT EXISTS ledger_account (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,           -- 'USER' | 'SYSTEM'
  user_id BIGINT REFERENCES "user"(id),
  code VARCHAR(50),                    -- e.g., 'REWARDS_EXPENSE', 'SYSTEM_POOL'
  created_on TIMESTAMP DEFAULT NOW()
);

-- One account per user
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_account_user
ON ledger_account(user_id) WHERE type = 'USER';

-- Seed system accounts
INSERT INTO ledger_account(type, code) VALUES
('SYSTEM','REWARDS_EXPENSE'),
('SYSTEM','SYSTEM_POOL')
ON CONFLICT DO NOTHING;


-- =========================
-- LEDGER TRANSACTIONS
-- =========================
CREATE TABLE IF NOT EXISTS ledger_txn (
  id BIGSERIAL PRIMARY KEY,
  idempotency_key UUID UNIQUE,         -- guards retries
  reference_type VARCHAR(50) NOT NULL, -- 'BOUNTY','REWARD','MANUAL','REVERSAL', 'POINT_REQUEST'
  reference_id BIGINT,
  college_id BIGINT REFERENCES college(id), -- allows tenant scoping
  created_by BIGINT,                   -- actor (faculty/admin/system)
  created_on TIMESTAMP DEFAULT NOW()
);


-- =========================
-- LEDGER ENTRIES
-- =========================
CREATE TABLE IF NOT EXISTS ledger_entry (
  id BIGSERIAL PRIMARY KEY,
  txn_id BIGINT NOT NULL REFERENCES ledger_txn(id) ON DELETE RESTRICT,
  account_id BIGINT NOT NULL REFERENCES ledger_account(id),
  direction SMALLINT NOT NULL,         -- +1 credit, -1 debit
  amount BIGINT NOT NULL CHECK (amount > 0),
  created_on TIMESTAMP DEFAULT NOW()
);

-- Prevent duplicate legs for same txn/account/direction
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_entry_txn_leg
ON ledger_entry(txn_id, account_id, direction);

-- Fast reads per account
CREATE INDEX IF NOT EXISTS idx_ledger_entry_account
ON ledger_entry(account_id, created_on DESC);


-- =========================
-- BALANCE CACHE
-- =========================
CREATE TABLE IF NOT EXISTS user_balance (
  user_id BIGINT PRIMARY KEY REFERENCES "user"(id),
  balance BIGINT NOT NULL DEFAULT 0,
  updated_on TIMESTAMP DEFAULT NOW()
);
