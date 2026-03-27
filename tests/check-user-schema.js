const pool = require('./config/db');

async function checkUserSchema() {
  try {
    console.log('🔍 Checking user table schema...\n');
    
    const result = await pool.query(`
      SELECT column_name, is_nullable, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      ORDER BY ordinal_position
    `);
    
    console.log('User table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) default: ${row.column_default || 'none'}`);
    });
    
    // Check if username column has specific constraints
    const constraintResult = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'user'
    `);
    
    console.log('\nUser table constraints:');
    constraintResult.rows.forEach(row => {
      console.log(`- ${row.constraint_name}: ${row.constraint_type}`);
    });
    
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

checkUserSchema();