const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// List SQL files in dependency order
const files = [
  'role.sql',
  'college.sql',
  'user.sql',
  'reward.sql',
  'bounty.sql',
  'add_image_hash_to_bounty.sql', // add image_hash column
  'user_bounty_participation.sql',
  'user_reward_claim.sql',
  'point_request.sql', // point request system
  'add_reviewer_capability.sql', // add reviewer capability to users
  'add_achievement_columns.sql', // add achievement system columns
];

async function runMigrations() {
  try {
    for (const file of files) {
      const filePath = path.join(__dirname, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
    }
    console.log('✅ All migrations executed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    process.exit();
  }
}

if (require.main === module) {
  runMigrations();
} 