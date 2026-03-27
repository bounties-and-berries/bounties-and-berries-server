const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function addCreatorRole() {
  try {
    console.log('🔄 Adding creator role and test user...');
    
    // Add creator role
    await pool.query(
      'INSERT INTO role (id, name) VALUES (4, $1) ON CONFLICT (id) DO NOTHING', 
      ['creator']
    );
    console.log('✅ Creator role added');
    
    // Create hashed password for creator user
    const hashedPassword = await bcrypt.hash('creator123', 10);
    
    // Add creator test user
    await pool.query(`
      INSERT INTO "user" (id, username, mobilenumber, name, mobile, role_id, password, is_active, college_id, created_on) 
      VALUES (7, $1, $2, $3, $4, 4, $5, true, 1, CURRENT_TIMESTAMP) 
      ON CONFLICT (id) DO NOTHING
    `, ['creator1', '1234567896', 'Creator User', '1234567896', hashedPassword]);
    
    console.log('✅ Creator test user added');
    console.log('📋 Creator Login Credentials:');
    console.log('   👑 Creator: username="creator1", password="creator123"');
    
    // Verify the setup
    const roleResult = await pool.query('SELECT * FROM role WHERE name = $1', ['creator']);
    const userResult = await pool.query('SELECT id, username, name, role_id FROM "user" WHERE username = $1', ['creator1']);
    
    console.log('\n🔍 Verification:');
    console.log('   Creator role:', roleResult.rows[0]);
    console.log('   Creator user:', userResult.rows[0]);
    
    pool.end();
    console.log('\n✅ Creator role setup completed successfully!');
    
  } catch(err) {
    console.error('❌ Error:', err.message);
    pool.end();
    process.exit(1);
  }
}

addCreatorRole();