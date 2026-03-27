const pool = require('../config/db');

class AchievementService {
  async checkAndGrantAchievements(userId) {
    try {
      // 1. Get user statistics
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM user_bounty_participation WHERE user_id = $1 AND status = 'completed') as completed_bounties,
          (SELECT COALESCE(SUM(points_earned), 0) FROM user_bounty_participation WHERE user_id = $1 AND status = 'completed') +
          (SELECT COALESCE(SUM(points_awarded), 0) FROM point_request WHERE student_id = $1 AND status = 'approved') as total_points
      `;
      const { rows: stats } = await pool.query(statsQuery, [userId]);
      const userStats = stats[0];

      // 2. Get achievements the user hasn't unlocked yet
      const potentialAchievements = await pool.query(`
        SELECT a.* 
        FROM achievements a
        WHERE a.id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = $1)
      `, [userId]);

      const newlyUnlocked = [];

      for (const achievement of potentialAchievements.rows) {
        let unlock = false;
        
        if (achievement.type === 'bounty') {
          const required = achievement.name.includes('Bronze') ? 5 : achievement.name.includes('Silver') ? 10 : 25;
          if (parseInt(userStats.completed_bounties) >= required) {
            unlock = true;
          }
        } else if (achievement.points_required > 0) {
          if (parseInt(userStats.total_points) >= achievement.points_required) {
            unlock = true;
          }
        }

        if (unlock) {
          await pool.query(
            'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, achievement.id]
          );
          
          // Create a notification for the unlock
          await pool.query(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES ($1, 'New Achievement Unlocked!', $2, 'achievement')
          `, [userId, `You've earned the "${achievement.name}" achievement!`]);
          
          newlyUnlocked.push(achievement);
        }
      }

      // Also update user level and XP
      await this.updateUserLevel(userId, parseInt(userStats.total_points));

      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  async updateUserLevel(userId, totalPoints) {
    // Basic level logic: Level 1 (0-499), Level 2 (500-999), Level 3 (1000-1999), Level 4 (2000-3499), Level 5 (3500+)
    const levelThresholds = [0, 500, 1000, 2000, 3500, 5500, 8000, 11000];
    let level = 1;
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (totalPoints >= levelThresholds[i]) {
        level = i + 1;
        break;
      }
    }

    const currentXp = totalPoints - (levelThresholds[level - 1] || 0);
    
    await pool.query(
      'UPDATE "user" SET level = $1, xp = $2 WHERE id = $3',
      [level, currentXp, userId]
    );
  }

  async getUserAchievements(userId) {
    const query = `
      SELECT a.*, ua.unlocked_at
      FROM achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }
}

module.exports = new AchievementService();
