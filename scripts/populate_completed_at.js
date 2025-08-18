const pool = require('../config/db');

/**
 * Script to populate completed_at field for existing completed bounties
 * This helps the achievement system work with existing data
 */
async function populateCompletedAt() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting to populate completed_at field...');
    
    // Update completed_at for existing completed bounties
    const updateQuery = `
      UPDATE user_bounty_participation 
      SET completed_at = modified_on 
      WHERE status = 'completed' 
        AND completed_at IS NULL
        AND modified_on IS NOT NULL
    `;
    
    const result = await client.query(updateQuery);
    console.log(`✅ Updated ${result.rowCount} completed bounties with completed_at timestamp`);
    
    // Show summary
    const summaryQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(completed_at) as with_completed_at
      FROM user_bounty_participation 
      GROUP BY status
      ORDER BY status
    `;
    
    const summary = await client.query(summaryQuery);
    console.log('\n📊 Current status summary:');
    summary.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} total, ${row.with_completed_at} with completed_at`);
    });
    
    console.log('\n🎯 Achievement system is now ready to use!');
    
  } catch (error) {
    console.error('❌ Error populating completed_at:', error);
  } finally {
    client.release();
    process.exit();
  }
}

if (require.main === module) {
  populateCompletedAt();
}
