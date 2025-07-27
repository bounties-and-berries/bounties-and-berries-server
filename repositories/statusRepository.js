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
}

module.exports = new StatusRepository(); 