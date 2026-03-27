const pool = require('./config/db');

async function checkFacultyCredentials() {
  try {
    console.log('🔍 Checking Faculty Login Credentials...\n');
    
    // Get faculty users with role names
    const result = await pool.query(`
      SELECT u.id, u.username, u.name, u.mobile, u.mobilenumber, r.name as role_name
      FROM "user" u
      JOIN role r ON u.role_id = r.id
      WHERE r.name = 'faculty'
      ORDER BY u.id
    `);
    
    console.log('Faculty users found:');
    result.rows.forEach((user, index) => {
      console.log(`\n👨‍🏫 Faculty ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Display Name: ${user.name}`);
      console.log(`   Role: ${user.role_name}`);
      console.log(`   Mobile: ${user.mobile}`);
      console.log(`\n   🔐 Login with:`);
      console.log(`   {`);
      console.log(`     "name": "${user.username}",`);
      console.log(`     "password": "faculty123",`);
      console.log(`     "role": "${user.role_name}"`);
      console.log(`   }`);
    });

    // Also check all available roles
    console.log('\n📋 All available roles:');
    const rolesResult = await pool.query('SELECT id, name FROM role ORDER BY id');
    rolesResult.rows.forEach(role => {
      console.log(`   ${role.id}: ${role.name}`);
    });
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

checkFacultyCredentials();