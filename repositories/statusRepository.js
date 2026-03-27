const pool = require('../config/db');

class StatusRepository {
  async checkDatabaseConnection() {
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      return {
        status: 'connected',
        timestamp: result.rows[0].current_time
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error.message
      };
    }
  }

  async getDatabaseStats() {
    try {
      const stats = {};
      
      // Get table counts
      const tables = ['user', 'role', 'college', 'bounty', 'reward', 'user_bounty_participation', 'user_reward_claim'];
      
      for (const table of tables) {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = parseInt(result.rows[0].count, 10);
      }
      
      return stats;
    } catch (error) {
      throw new Error(`Database error in getDatabaseStats: ${error.message}`);
    }
  }

  async checkLedgerIntegrity() {
    try {
      // Check for any imbalanced transactions in the last 10 minutes
      const result = await pool.query(`
        SELECT txn_id
        FROM ledger_entry
        WHERE created_on > NOW() - INTERVAL '10 minutes'
        GROUP BY txn_id
        HAVING SUM(direction * amount) != 0;
      `);
      
      return {
        status: result.rows.length === 0 ? 'pass' : 'fail',
        imbalanced_count: result.rows.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new StatusRepository(); 