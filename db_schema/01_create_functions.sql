-- =========================
-- UTILITY FUNCTIONS
-- =========================

-- Function to automatically update modified_on timestamp
CREATE OR REPLACE FUNCTION update_modified_on_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_on = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_modified_on_column() IS 'Trigger function to automatically update modified_on timestamp on row updates';