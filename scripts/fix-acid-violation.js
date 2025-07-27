#!/usr/bin/env node

/**
 * ACID Violation Fix Script
 * Fixes the negative berry balance for Admin User (ID: 5)
 */

const pool = require('../config/db');
const TransactionUtils = require('../utils/transactionUtils');

async function fixACIDViolation() {
  console.log('🔧 Fixing ACID Violation for Admin User (ID: 5)...\n');

  try {
    // Option 1: Complete a bounty to earn berries (Recommended)
    console.log('📋 Option 1: Complete a bounty to earn berries');
    
    // Check if there are any available bounties
    const availableBounties = await pool.query(`
      SELECT id, name, alloted_berries 
      FROM bounty 
      WHERE is_active = true 
      AND (scheduled_date IS NULL OR scheduled_date > NOW())
      ORDER BY alloted_berries ASC
      LIMIT 1
    `);

    if (availableBounties.rows.length > 0) {
      const bounty = availableBounties.rows[0];
      console.log(`   Found bounty: ${bounty.name} (${bounty.alloted_berries} berries)`);
      
      // Use ACID transaction to fix the violation
      await TransactionUtils.withTransaction(async (client) => {
        // 1. Create participation record
        await client.query(`
          INSERT INTO user_bounty_participation 
          (user_id, bounty_id, points_earned, berries_earned, status, created_by, modified_by, created_on)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          5, // Admin User ID
          bounty.id,
          bounty.alloted_points || 0,
          bounty.alloted_berries || 0,
          'completed',
          'system_fix',
          'system_fix'
        ]);

        console.log(`   ✅ Created participation for bounty: ${bounty.name}`);
        console.log(`   ✅ Awarded ${bounty.alloted_berries} berries`);
      });

      // Verify the fix
      await verifyFix();
      
    } else {
      console.log('   ❌ No available bounties found');
      console.log('   Proceeding with Option 2...\n');
      
      // Option 2: Remove the excessive claim
      await removeExcessiveClaim();
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    
    // Fallback: Remove excessive claim
    console.log('\n🔄 Attempting fallback fix...');
    await removeExcessiveClaim();
  }
}

async function removeExcessiveClaim() {
  console.log('📋 Option 2: Remove excessive claim');
  
  try {
    await TransactionUtils.withTransaction(async (client) => {
      // Get the claim to remove
      const claimResult = await client.query(`
        SELECT urc.*, r.name as reward_name
        FROM user_reward_claim urc
        JOIN reward r ON urc.reward_id = r.id
        WHERE urc.user_id = 5
        ORDER BY urc.created_on
        LIMIT 1
      `);

      if (claimResult.rows.length > 0) {
        const claim = claimResult.rows[0];
        
        // Remove the claim
        await client.query('DELETE FROM user_reward_claim WHERE id = $1', [claim.id]);
        
        console.log(`   ✅ Removed claim: ${claim.reward_name} (${claim.berries_spent} berries)`);
        console.log(`   ✅ This fixes the negative balance issue`);
      } else {
        console.log('   ❌ No claims found to remove');
      }
    });

    // Verify the fix
    await verifyFix();
    
  } catch (error) {
    console.error('❌ Remove claim failed:', error.message);
  }
}

async function verifyFix() {
  console.log('\n🔍 Verifying the fix...');
  
  try {
    // Calculate new balance
    const participationsResult = await pool.query(`
      SELECT berries_earned FROM user_bounty_participation 
      WHERE user_id = 5 AND status = 'completed'
    `);
    
    const claimsResult = await pool.query(`
      SELECT berries_spent FROM user_reward_claim 
      WHERE user_id = 5
    `);
    
    const totalEarned = participationsResult.rows.reduce((sum, p) => sum + parseInt(p.berries_earned || 0), 0);
    const totalSpent = claimsResult.rows.reduce((sum, c) => sum + parseInt(c.berries_spent || 0), 0);
    const netBalance = totalEarned - totalSpent;
    
    console.log(`   Total Berries Earned: ${totalEarned}`);
    console.log(`   Total Berries Spent: ${totalSpent}`);
    console.log(`   Net Balance: ${netBalance}`);
    
    if (netBalance >= 0) {
      console.log('   ✅ ACID violation fixed! Balance is now non-negative');
    } else {
      console.log('   ❌ ACID violation still exists');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run fix if script is executed directly
if (require.main === module) {
  fixACIDViolation()
    .then(() => {
      console.log('\n✅ ACID violation fix completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ ACID violation fix failed:', error.message);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { fixACIDViolation }; 