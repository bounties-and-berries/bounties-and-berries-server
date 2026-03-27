#!/bin/bash
# =============================================================================
# Docker PostgreSQL Init Script
# This script runs all schema files in the correct dependency order.
# Place this as the ONLY file in /docker-entrypoint-initdb.d/
# =============================================================================

set -e

echo "🔧 Initializing Bounties & Berries database schema..."

SCHEMA_DIR="/docker-entrypoint-initdb.d/schema"

# Execute in dependency order
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL

  -- 1. Functions (required by triggers in all other tables)
  \i $SCHEMA_DIR/01_create_functions.sql

  -- 2. Independent tables (no foreign keys to other app tables)
  \i $SCHEMA_DIR/role.sql
  \i $SCHEMA_DIR/college.sql

  -- 3. User table (depends on role, college)
  \i $SCHEMA_DIR/user.sql

  -- 4. Bounty table (independent)
  \i $SCHEMA_DIR/bounty.sql

  -- 5. Reward table (independent)
  \i $SCHEMA_DIR/reward.sql

  -- 6. Tables depending on user + bounty
  \i $SCHEMA_DIR/user_bounty_participation.sql

  -- 7. Tables depending on user + reward
  \i $SCHEMA_DIR/user_reward_claim.sql

  -- 8. Point request (depends on user, user_bounty_participation)
  \i $SCHEMA_DIR/point_request.sql

  -- 9. Berry rules and purchases
  \i $SCHEMA_DIR/berry_rules.sql
  \i $SCHEMA_DIR/berry_purchases.sql

  -- 10. Support queries
  \i $SCHEMA_DIR/support_query.sql

  -- 11. Additional columns and indexes (ALTER TABLE statements)
  \i $SCHEMA_DIR/add_email_column.sql
  \i $SCHEMA_DIR/add_achievement_columns.sql
  \i $SCHEMA_DIR/add_reviewer_capability.sql
  \i $SCHEMA_DIR/add_soft_delete.sql
  \i $SCHEMA_DIR/add_image_hash_to_bounty.sql
  \i $SCHEMA_DIR/add_indexes.sql

EOSQL

echo "✅ Database schema initialized successfully!"
