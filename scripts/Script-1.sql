
CREATE DATABASE bounties_and_berries;

-- 2. Connect to the new database
\c bounties_and_berries

-- 3. Create the bounties table
CREATE TABLE bounties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20),
    img_url TEXT,
    alloted_points INT,
    scheduled_date TIMESTAMP,
    venue VARCHAR(100),
    capacity INT,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);