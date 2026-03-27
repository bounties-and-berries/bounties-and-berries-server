const pool = require('./config/db');

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user details...\n');
    
    const result = await pool.query(`
      SELECT u.id, u.username, u.mobilenumber, u.mobile, u.name, r.name as role_name
      FROM "user" u
      JOIN role r ON u.role_id = r.id
      WHERE r.name = 'admin'
      LIMIT 5
    `);
    
    console.log('Admin users found:');
    result.rows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });
    
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

checkAdminUser();