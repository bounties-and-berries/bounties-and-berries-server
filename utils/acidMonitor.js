const pool = require('../config/db');

/**
 * ACID Compliance Monitor
 * Tracks and validates ACID principles in production
 */

class ACIDMonitor {
  constructor() {
    this.violations = [];
    this.metrics = {
      transactions: 0,
      rollbacks: 0,
      deadlocks: 0,
      consistencyChecks: 0,
      violations: 0
    };
  }

  /**
   * Monitor transaction execution
   */
  async monitorTransaction(operation, callback) {
    const startTime = Date.now();
    const transactionId = this.generateTransactionId();
    
    try {
      this.metrics.transactions++;
      
      // Log transaction start
      console.log(`[ACID] Transaction ${transactionId} started: ${operation}`);
      
      const result = await callback();
      
      // Log successful completion
      console.log(`[ACID] Transaction ${transactionId} completed successfully in ${Date.now() - startTime}ms`);
      
      return result;
    } catch (error) {
      this.metrics.rollbacks++;
      
      // Log rollback
      console.error(`[ACID] Transaction ${transactionId} rolled back: ${error.message}`);
      
      // Check for specific ACID violations
      this.detectViolation(operation, error, transactionId);
      
      throw error;
    }
  }

  /**
   * Detect ACID violations
   */
  detectViolation(operation, error, transactionId) {
    const violation = {
      timestamp: new Date(),
      transactionId,
      operation,
      error: error.message,
      type: this.classifyViolation(error)
    };

    this.violations.push(violation);
    this.metrics.violations++;

    console.error(`[ACID VIOLATION] ${violation.type}: ${operation} - ${error.message}`);
  }

  /**
   * Classify violation type
   */
  classifyViolation(error) {
    if (error.message.includes('deadlock')) {
      this.metrics.deadlocks++;
      return 'ISOLATION_VIOLATION';
    }
    if (error.message.includes('constraint')) {
      return 'CONSISTENCY_VIOLATION';
    }
    if (error.message.includes('rollback')) {
      return 'ATOMICITY_VIOLATION';
    }
    return 'UNKNOWN_VIOLATION';
  }

  /**
   * Verify data consistency
   */
  async verifyConsistency() {
    this.metrics.consistencyChecks++;
    
    const checks = [
      this.verifyBerryBalance(),
      this.verifyPointsIntegrity(),
      this.verifyParticipationIntegrity(),
      this.verifyClaimIntegrity()
    ];

    const results = await Promise.allSettled(checks);
    const violations = results.filter(r => r.status === 'rejected');

    if (violations.length > 0) {
      console.error(`[ACID] Consistency check failed: ${violations.length} violations detected`);
      violations.forEach(v => console.error(`[ACID] ${v.reason}`));
    } else {
      console.log('[ACID] Consistency check passed');
    }

    return violations.length === 0;
  }

  /**
   * Verify berry balance consistency
   */
  async verifyBerryBalance() {
    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name,
        COALESCE(SUM(ubp.berries_earned), 0) as earned,
        COALESCE(SUM(urc.berries_spent), 0) as spent,
        (COALESCE(SUM(ubp.berries_earned), 0) - COALESCE(SUM(urc.berries_spent), 0)) as calculated_net
      FROM "user" u
      LEFT JOIN user_bounty_participation ubp ON u.id = ubp.user_id AND ubp.status = 'completed'
      LEFT JOIN user_reward_claim urc ON u.id = urc.user_id
      GROUP BY u.id, u.name
      HAVING (COALESCE(SUM(ubp.berries_earned), 0) - COALESCE(SUM(urc.berries_spent), 0)) < 0
    `);

    if (result.rows.length > 0) {
      throw new Error(`Negative berry balance detected for users: ${result.rows.map(r => r.name).join(', ')}`);
    }
  }

  /**
   * Verify points integrity (should never decrease)
   */
  async verifyPointsIntegrity() {
    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name,
        COALESCE(SUM(ubp.points_earned), 0) as total_points
      FROM "user" u
      LEFT JOIN user_bounty_participation ubp ON u.id = ubp.user_id AND ubp.status = 'completed'
      GROUP BY u.id, u.name
      HAVING COALESCE(SUM(ubp.points_earned), 0) < 0
    `);

    if (result.rows.length > 0) {
      throw new Error(`Negative points detected for users: ${result.rows.map(r => r.name).join(', ')}`);
    }
  }

  /**
   * Verify participation integrity
   */
  async verifyParticipationIntegrity() {
    const result = await pool.query(`
      SELECT 
        user_id,
        bounty_id,
        COUNT(*) as duplicate_count
      FROM user_bounty_participation
      GROUP BY user_id, bounty_id
      HAVING COUNT(*) > 1
    `);

    if (result.rows.length > 0) {
      throw new Error(`Duplicate participations detected: ${result.rows.length} violations`);
    }
  }

  /**
   * Verify claim integrity
   */
  async verifyClaimIntegrity() {
    const result = await pool.query(`
      SELECT 
        user_id,
        reward_id,
        COUNT(*) as duplicate_count
      FROM user_reward_claim
      GROUP BY user_id, reward_id
      HAVING COUNT(*) > 1
    `);

    if (result.rows.length > 0) {
      throw new Error(`Duplicate claims detected: ${result.rows.length} violations`);
    }
  }

  /**
   * Get monitoring metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      violationRate: this.metrics.transactions > 0 ? 
        (this.metrics.violations / this.metrics.transactions * 100).toFixed(2) + '%' : '0%',
      rollbackRate: this.metrics.transactions > 0 ? 
        (this.metrics.rollbacks / this.metrics.transactions * 100).toFixed(2) + '%' : '0%',
      recentViolations: this.violations.slice(-10) // Last 10 violations
    };
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics() {
    this.metrics = {
      transactions: 0,
      rollbacks: 0,
      deadlocks: 0,
      consistencyChecks: 0,
      violations: 0
    };
    this.violations = [];
  }
}

// Export singleton instance
module.exports = new ACIDMonitor(); 