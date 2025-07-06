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
  'user_bounty_participation.sql',
  'user_reward_claim.sql',
  'add_whatsurname_to_bounty.sql', // new migration
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    for (const file of files) {
      const filePath = path.join(__dirname, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running migration: ${file}`);
      await client.query(sql);
    }
    console.log('✅ All migrations executed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    client.release();
    process.exit();
  }
}

if (require.main === module) {
  runMigrations();
} 