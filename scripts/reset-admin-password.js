const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function resetAdminPassword() {
  try {
    console.log('🔧 Resetting admin password to original value...\n');
    
    // Hash the original password
    const originalPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(originalPassword, 10);
    
    // Update admin password
    const result = await pool.query(`
      UPDATE "user" 
      SET password = $1 
      WHERE username = 'admin'
      RETURNING id, username, name
    `, [hashedPassword]);
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log('Updated user:', result.rows[0]);
    } else {
      console.log('❌ Admin user not found');
    }
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

resetAdminPassword();