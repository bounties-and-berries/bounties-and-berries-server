#!/usr/bin/env node

/**
 * ACID Violation Investigation Script
 * Investigates specific violations in detail
 */

const pool = require('../config/db');

async function investigateViolation() {
  console.log('🔍 Investigating ACID Violation for Admin User (ID: 5)...\n');

  try {
    // 1. Get user details
    console.log('📋 User Details:');
    const userResult = await pool.query('SELECT * FROM "user" WHERE id = 5');
    const user = userResult.rows[0];
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role_id}`);
    console.log(`   Created: ${user.created_on}\n`);

    // 2. Get all bounty participations for this user
    console.log('📋 Bounty Participations:');
    const participationsResult = await pool.query(`
      SELECT 
        ubp.*,
        b.name as bounty_name,
        b.alloted_points,
        b.alloted_berries
      FROM user_bounty_participation ubp
      JOIN bounty b ON ubp.bounty_id = b.id
      WHERE ubp.user_id = 5
      ORDER BY ubp.created_on
    `);
    
    console.log(`   Total participations: ${participationsResult.rows.length}`);
    participationsResult.rows.forEach((part, index) => {
      console.log(`   ${index + 1}. Bounty: ${part.bounty_name}`);
      console.log(`      Status: ${part.status}`);
      console.log(`      Points Earned: ${part.points_earned}`);
      console.log(`      Berries Earned: ${part.berries_earned}`);
      console.log(`      Created: ${part.created_on}`);
      console.log(`      Modified: ${part.modified_on}\n`);
    });

    // 3. Get all reward claims for this user
    console.log('📋 Reward Claims:');
    const claimsResult = await pool.query(`
      SELECT 
        urc.*,
        r.name as reward_name
      FROM user_reward_claim urc
      JOIN reward r ON urc.reward_id = r.id
      WHERE urc.user_id = 5
      ORDER BY urc.created_on
    `);
    
    console.log(`   Total claims: ${claimsResult.rows.length}`);
    claimsResult.rows.forEach((claim, index) => {
      console.log(`   ${index + 1}. Reward: ${claim.reward_name}`);
      console.log(`      Berries Spent: ${claim.berries_spent}`);
      console.log(`      Created: ${claim.created_on}\n`);
    });

    // 4. Calculate totals
    console.log('📊 Balance Calculation:');
    
    const totalEarned = participationsResult.rows
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseInt(p.berries_earned || 0), 0);
    
    const totalSpent = claimsResult.rows
      .reduce((sum, c) => sum + parseInt(c.berries_spent || 0), 0);
    
    const netBalance = totalEarned - totalSpent;
    
    console.log(`   Total Berries Earned: ${totalEarned}`);
    console.log(`   Total Berries Spent: ${totalSpent}`);
    console.log(`   Net Balance: ${netBalance}`);
    console.log(`   Status: ${netBalance < 0 ? '❌ NEGATIVE' : '✅ POSITIVE'}\n`);

    // 5. Identify the problem
    console.log('🔍 Problem Analysis:');
    
    if (netBalance < 0) {
      console.log('❌ ISSUE: User has spent more berries than earned!');
      
      // Check if there are claims without corresponding earnings
      const completedParticipations = participationsResult.rows.filter(p => p.status === 'completed');
      if (completedParticipations.length === 0) {
        console.log('   - User has no completed bounties but has claimed rewards');
        console.log('   - This suggests rewards were claimed before bounties were completed');
      } else {
        console.log('   - User has completed bounties but still has negative balance');
        console.log('   - This suggests a data inconsistency or missing earnings');
      }
      
      // Check for claims that exceed earnings
      const excessiveClaims = claimsResult.rows.filter(claim => {
        const claimAmount = parseInt(claim.berries_spent || 0);
        return claimAmount > totalEarned;
      });
      
      if (excessiveClaims.length > 0) {
        console.log('   - Found claims that exceed total earnings:');
        excessiveClaims.forEach(claim => {
          console.log(`     * ${claim.reward_name}: ${claim.berries_spent} berries`);
        });
      }
    }

    // 6. Suggest fixes
    console.log('\n🔧 Suggested Fixes:');
    
    if (netBalance < 0) {
      console.log('1. Review the order of operations:');
      console.log('   - Ensure bounties are completed BEFORE rewards are claimed');
      console.log('   - Check if there are any manual data insertions');
      
      console.log('\n2. Data correction options:');
      console.log('   - Option A: Complete missing bounties to earn required berries');
      console.log('   - Option B: Remove excessive claims');
      console.log('   - Option C: Adjust berry amounts to match expected balance');
      
      console.log('\n3. Prevent future violations:');
      console.log('   - Ensure ACID transactions are used for all operations');
      console.log('   - Add validation to prevent claims exceeding available berries');
      console.log('   - Implement proper order of operations in the application');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run investigation if script is executed directly
if (require.main === module) {
  investigateViolation()
    .then(() => {
      console.log('\n✅ Investigation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Investigation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { investigateViolation }; 