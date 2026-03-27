const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// List of new migration files
const newFiles = [
  'add_email_column.sql',
  'berry_rules.sql'
];

async function runNewMigrations() {
  const client = await pool.connect();
  try {
    console.log('✅ Connected to PostgreSQL database');
    
    for (const file of newFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`Running new migration: ${file}`);
        await client.query(sql);
        console.log(`✅ ${file} completed`);
      } else {
        console.log(`⚠️  File not found: ${file}`);
      }
    }
    console.log('✅ All new migrations executed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    client.release();
    process.exit();
  }
}

if (require.main === module) {
  runNewMigrations();
}