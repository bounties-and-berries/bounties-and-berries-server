const pool = require('./config/db');

async function checkExistingUsers() {
  try {
    console.log('🔍 Checking existing user records...\n');
    
    const result = await pool.query(`
      SELECT id, username, mobilenumber, name, mobile, role_id 
      FROM "user" 
      LIMIT 5
    `);
    
    console.log('Existing users:');
    result.rows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });
    
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

checkExistingUsers();