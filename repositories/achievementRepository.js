const pool = require('../config/db');

class AchievementRepository {
  /**
   * Get optimized user participation data for achievement calculations
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User participation data
   */
  async getUserParticipationData(userId) {
    try {
      const query = `
        SELECT 
          u.id as user_id,
          u.name as user_name,
          ubp.id as participation_id,
          ubp.bounty_id,
          ubp.points_earned,
          ubp.berries_earned,
          ubp.status,
          ubp.created_on as participation_created,
          ubp.completed_at,
          b.type as bounty_type,
          b.name as bounty_title,
          b.alloted_points as bounty_points,
          b.alloted_berries as bounty_berries,
          b.created_on as bounty_created,
          b.scheduled_date as deadline
        FROM "user" u
        LEFT JOIN user_bounty_participation ubp ON u.id = ubp.user_id
        LEFT JOIN bounty b ON ubp.bounty_id = b.id
        WHERE u.id = $1 
          AND ubp.status = 'completed'
        ORDER BY ubp.completed_at DESC
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Repository error in getUserParticipationData: ${error.message}`);
    }
  }

  /**
   * Get user statistics for achievement calculations
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStatistics(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_participations,
          COUNT(CASE WHEN ubp.status = 'completed' THEN 1 END) as completed_count,
          SUM(CASE WHEN ubp.status = 'completed' THEN ubp.points_earned ELSE 0 END) as total_points,
          SUM(CASE WHEN ubp.status = 'completed' THEN ubp.berries_earned ELSE 0 END) as total_berries,
          MIN(ubp.created_on) as first_participation,
          MAX(ubp.completed_at) as last_completion
        FROM user_bounty_participation ubp
        WHERE ubp.user_id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Repository error in getUserStatistics: ${error.message}`);
    }
  }

  /**
   * Get activity type breakdown for user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Activity type statistics
   */
  async getActivityTypeBreakdown(userId) {
    try {
      const query = `
        SELECT 
          b.type as bounty_type,
          COUNT(*) as participation_count,
          SUM(ubp.points_earned) as total_points,
          SUM(ubp.berries_earned) as total_berries
        FROM user_bounty_participation ubp
        JOIN bounty b ON ubp.bounty_id = b.id
        WHERE ubp.user_id = $1 
          AND ubp.status = 'completed'
        GROUP BY b.type
        ORDER BY total_points DESC
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Repository error in getActivityTypeBreakdown: ${error.message}`);
    }
  }

  /**
   * Get consecutive completion streak for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Streak information
   */
  async getConsecutiveCompletionStreak(userId) {
    try {
      const query = `
        WITH completion_dates AS (
          SELECT 
            DATE(ubp.completed_at) as completion_date,
            ROW_NUMBER() OVER (ORDER BY ubp.completed_at DESC) as rn
          FROM user_bounty_participation ubp
          WHERE ubp.user_id = $1 
            AND ubp.status = 'completed'
            AND ubp.completed_at IS NOT NULL
        ),
        date_gaps AS (
          SELECT 
            completion_date,
            rn,
            completion_date - INTERVAL '1 day' * (rn - 1) as expected_date
          FROM completion_dates
        ),
        streak_groups AS (
          SELECT 
            completion_date,
            CASE 
              WHEN completion_date = expected_date THEN 1
              ELSE 0
            END as is_consecutive
          FROM date_gaps
        )
        SELECT 
          COUNT(*) as current_streak,
          MAX(completion_date) as last_completion_date
        FROM streak_groups
        WHERE is_consecutive = 1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Repository error in getConsecutiveCompletionStreak: ${error.message}`);
    }
  }

  /**
   * Get fastest completion time for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Fastest completion information
   */
  async getFastestCompletion(userId) {
    try {
      const query = `
        SELECT 
          b.name as bounty_title,
          b.type as bounty_type,
          ubp.points_earned,
          EXTRACT(EPOCH FROM (ubp.completed_at - ubp.created_on)) / 3600 as completion_hours
        FROM user_bounty_participation ubp
        JOIN bounty b ON ubp.bounty_id = b.id
        WHERE ubp.user_id = $1 
          AND ubp.status = 'completed'
          AND ubp.completed_at IS NOT NULL
        ORDER BY completion_hours ASC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Repository error in getFastestCompletion: ${error.message}`);
    }
  }

  /**
   * Get achievement leaderboard
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Leaderboard data
   */
  async getAchievementLeaderboard(limit = 10) {
    try {
      const query = `
        SELECT 
          u.id,
          u.name,
          COUNT(CASE WHEN ubp.status = 'completed' THEN 1 END) as completed_bounties,
          SUM(CASE WHEN ubp.status = 'completed' THEN ubp.points_earned ELSE 0 END) as total_points,
          SUM(CASE WHEN ubp.status = 'completed' THEN ubp.berries_earned ELSE 0 END) as total_berries
        FROM "user" u
        LEFT JOIN user_bounty_participation ubp ON u.id = ubp.user_id
        GROUP BY u.id, u.name
        HAVING COUNT(CASE WHEN ubp.status = 'completed' THEN 1 END) > 0
        ORDER BY total_points DESC, total_berries DESC
        LIMIT $1
      `;
      
      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Repository error in getAchievementLeaderboard: ${error.message}`);
    }
  }
}

module.exports = new AchievementRepository();
