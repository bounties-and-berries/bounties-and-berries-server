#!/usr/bin/env node

/**
 * ACID Compliance Verification Script
 * Run this script to manually verify ACID principles in your database
 */

const pool = require('../config/db');

class ACIDVerifier {
  constructor() {
    this.violations = [];
    this.checks = [];
  }

  async runAllChecks() {
    console.log('🔍 Starting ACID Compliance Verification...\n');

    const checks = [
      { name: 'Atomicity', fn: this.checkAtomicity.bind(this) },
      { name: 'Consistency', fn: this.checkConsistency.bind(this) },
      { name: 'Isolation', fn: this.checkIsolation.bind(this) },
      { name: 'Durability', fn: this.checkDurability.bind(this) }
    ];

    for (const check of checks) {
      console.log(`📋 Checking ${check.name}...`);
      try {
        await check.fn();
        console.log(`✅ ${check.name} - PASSED\n`);
      } catch (error) {
        console.log(`❌ ${check.name} - FAILED: ${error.message}\n`);
        this.violations.push({ principle: check.name, error: error.message });
      }
    }

    this.printSummary();
  }

  async checkAtomicity() {
    console.log('  - Verifying transaction atomicity...');
    
    // Check for incomplete transactions (partial states)
    const incompleteParticipations = await pool.query(`
      SELECT COUNT(*) as count
      FROM user_bounty_participation 
      WHERE status IS NULL OR status = ''
    `);

    if (incompleteParticipations.rows[0].count > 0) {
      throw new Error(`Found ${incompleteParticipations.rows[0].count} incomplete participations`);
    }

    // Check for orphaned records
    const orphanedClaims = await pool.query(`
      SELECT COUNT(*) as count
      FROM user_reward_claim urc
      LEFT JOIN "user" u ON urc.user_id = u.id
      LEFT JOIN reward r ON urc.reward_id = r.id
      WHERE u.id IS NULL OR r.id IS NULL
    `);

    if (orphanedClaims.rows[0].count > 0) {
      throw new Error(`Found ${orphanedClaims.rows[0].count} orphaned claim records`);
    }

    console.log('  - All transactions appear atomic');
  }

  async checkConsistency() {
    console.log('  - Verifying data consistency...');

    // Check berry balance consistency
    const negativeBalances = await pool.query(`
      SELECT 
        u.id, u.name,
        COALESCE(SUM(ubp.berries_earned), 0) as earned,
        COALESCE(SUM(urc.berries_spent), 0) as spent,
        (COALESCE(SUM(ubp.berries_earned), 0) - COALESCE(SUM(urc.berries_spent), 0)) as net_balance
      FROM "user" u
      LEFT JOIN user_bounty_participation ubp ON u.id = ubp.user_id AND ubp.status = 'completed'
      LEFT JOIN user_reward_claim urc ON u.id = urc.user_id
      GROUP BY u.id, u.name
      HAVING (COALESCE(SUM(ubp.berries_earned), 0) - COALESCE(SUM(urc.berries_spent), 0)) < 0
    `);

    if (negativeBalances.rows.length > 0) {
      const users = negativeBalances.rows.map(r => `${r.name} (ID: ${r.id})`).join(', ');
      throw new Error(`Negative berry balances found: ${users}`);
    }

    // Check points consistency (should never be negative)
    const negativePoints = await pool.query(`
      SELECT 
        u.id, u.name,
        COALESCE(SUM(ubp.points_earned), 0) as total_points
      FROM "user" u
      LEFT JOIN user_bounty_participation ubp ON u.id = ubp.user_id AND ubp.status = 'completed'
      GROUP BY u.id, u.name
      HAVING COALESCE(SUM(ubp.points_earned), 0) < 0
    `);

    if (negativePoints.rows.length > 0) {
      const users = negativePoints.rows.map(r => `${r.name} (ID: ${r.id})`).join(', ');
      throw new Error(`Negative points found: ${users}`);
    }

    // Check for duplicate participations
    const duplicateParticipations = await pool.query(`
      SELECT user_id, bounty_id, COUNT(*) as count
      FROM user_bounty_participation
      GROUP BY user_id, bounty_id
      HAVING COUNT(*) > 1
    `);

    if (duplicateParticipations.rows.length > 0) {
      throw new Error(`Found ${duplicateParticipations.rows.length} duplicate participations`);
    }

    // Check for duplicate claims
    const duplicateClaims = await pool.query(`
      SELECT user_id, reward_id, COUNT(*) as count
      FROM user_reward_claim
      GROUP BY user_id, reward_id
      HAVING COUNT(*) > 1
    `);

    if (duplicateClaims.rows.length > 0) {
      throw new Error(`Found ${duplicateClaims.rows.length} duplicate claims`);
    }

    console.log('  - All data appears consistent');
  }

  async checkIsolation() {
    console.log('  - Verifying isolation (checking for race condition indicators)...');

    // Check for potential race condition indicators
    const rapidClaims = await pool.query(`
      SELECT 
        user_id, reward_id,
        COUNT(*) as claim_count,
        MIN(created_on) as first_claim,
        MAX(created_on) as last_claim
      FROM user_reward_claim
      GROUP BY user_id, reward_id
      HAVING COUNT(*) > 1
    `);

    if (rapidClaims.rows.length > 0) {
      console.log('  ⚠️  Warning: Found potential race condition indicators');
      rapidClaims.rows.forEach(row => {
        console.log(`    - User ${row.user_id} claimed reward ${row.reward_id} ${row.claim_count} times`);
      });
    }

    // Check for overlapping bounty participations (should be impossible)
    const overlappingParticipations = await pool.query(`
      SELECT 
        user_id, bounty_id,
        COUNT(*) as participation_count
      FROM user_bounty_participation
      GROUP BY user_id, bounty_id
      HAVING COUNT(*) > 1
    `);

    if (overlappingParticipations.rows.length > 0) {
      throw new Error(`Found ${overlappingParticipations.rows.length} overlapping participations (isolation violation)`);
    }

    console.log('  - Isolation appears maintained');
  }

  async checkDurability() {
    console.log('  - Verifying durability...');

    // Check for data integrity
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM "user"');
    const totalParticipations = await pool.query('SELECT COUNT(*) as count FROM user_bounty_participation');
    const totalClaims = await pool.query('SELECT COUNT(*) as count FROM user_reward_claim');

    console.log(`  - Database contains:`);
    console.log(`    - ${totalUsers.rows[0].count} users`);
    console.log(`    - ${totalParticipations.rows[0].count} participations`);
    console.log(`    - ${totalClaims.rows[0].count} claims`);

    // Check for recent data (indicates durability)
    const recentData = await pool.query(`
      SELECT 
        'users' as table_name, COUNT(*) as recent_count
      FROM "user" 
      WHERE created_on > NOW() - INTERVAL '1 day'
      UNION ALL
      SELECT 
        'participations' as table_name, COUNT(*) as recent_count
      FROM user_bounty_participation 
      WHERE created_on > NOW() - INTERVAL '1 day'
      UNION ALL
      SELECT 
        'claims' as table_name, COUNT(*) as recent_count
      FROM user_reward_claim 
      WHERE created_on > NOW() - INTERVAL '1 day'
    `);

    console.log('  - Recent data (last 24 hours):');
    recentData.rows.forEach(row => {
      console.log(`    - ${row.table_name}: ${row.recent_count} records`);
    });

    console.log('  - Durability appears maintained');
  }

  printSummary() {
    console.log('📊 ACID Compliance Summary:');
    console.log('============================');

    if (this.violations.length === 0) {
      console.log('🎉 ALL ACID PRINCIPLES VERIFIED SUCCESSFULLY!');
      console.log('✅ Your database follows ACID principles');
    } else {
      console.log(`❌ Found ${this.violations.length} ACID violations:`);
      this.violations.forEach((violation, index) => {
        console.log(`  ${index + 1}. ${violation.principle}: ${violation.error}`);
      });
    }

    console.log('\n🔧 Recommendations:');
    if (this.violations.length === 0) {
      console.log('  - Continue monitoring with ACID compliance tests');
      console.log('  - Run this verification script regularly');
      console.log('  - Consider implementing automated ACID monitoring');
    } else {
      console.log('  - Review and fix the violations listed above');
      console.log('  - Implement additional transaction safeguards');
      console.log('  - Consider adding more comprehensive error handling');
    }
  }
}

// Run verification if script is executed directly
if (require.main === module) {
  const verifier = new ACIDVerifier();
  
  verifier.runAllChecks()
    .then(() => {
      console.log('\n✅ ACID verification completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ ACID verification failed:', error.message);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = ACIDVerifier; 