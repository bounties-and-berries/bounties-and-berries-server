const achievementCalculationEngine = require('./achievementCalculationEngine');
const achievementCacheManager = require('./achievementCacheManager');
const achievementRepository = require('../repositories/achievementRepository');
const ACHIEVEMENT_CONSTANTS = require('../config/achievementConstants');

class AchievementService {
  /**
   * Get user achievements with caching
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User achievements
   */
  async getUserAchievements(userId) {
    try {
      // Check cache first
      const cachedAchievements = achievementCacheManager.getCachedAchievements(userId);
      if (cachedAchievements) {
        return cachedAchievements;
      }
      
      // Calculate fresh achievements
      const achievements = await achievementCalculationEngine.calculateUserAchievements(userId);
      
      // Calculate total achievement count
      const totalEarned = achievements.pointsBased.filter(a => a.earned).length +
                          achievements.activityBased.filter(a => a.earned).length +
                          achievements.specialBadges.filter(a => a.earned).length;
      
      achievements.statistics.achievementCount = totalEarned;
      
      // Cache the results
      achievementCacheManager.setCachedAchievements(userId, achievements);
      
      return achievements;
    } catch (error) {
      throw new Error(`Service error in getUserAchievements: ${error.message}`);
    }
  }

  /**
   * Check for new achievements after bounty completion
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Newly earned achievements
   */
  async checkForNewAchievements(userId) {
    try {
      // Get current achievements from cache
      const currentAchievements = achievementCacheManager.getCachedAchievements(userId);
      
      // Calculate fresh achievements
      const newAchievements = await achievementCalculationEngine.calculateUserAchievements(userId);
      
      // Find newly earned achievements
      const newlyEarned = this.findNewlyEarnedAchievements(currentAchievements, newAchievements);
      
      // Invalidate cache to force refresh
      if (newlyEarned.length > 0) {
        achievementCacheManager.invalidateUserCache(userId);
      }
      
      return newlyEarned;
    } catch (error) {
      throw new Error(`Service error in checkForNewAchievements: ${error.message}`);
    }
  }

  /**
   * Find newly earned achievements by comparing current and new achievement states
   * @param {Object} currentAchievements - Current cached achievements
   * @param {Object} newAchievements - Freshly calculated achievements
   * @returns {Array} Newly earned achievements
   */
  findNewlyEarnedAchievements(currentAchievements, newAchievements) {
    if (!currentAchievements) {
      // First time checking achievements, return all earned
      return [
        ...newAchievements.pointsBased.filter(a => a.earned),
        ...newAchievements.activityBased.filter(a => a.earned),
        ...newAchievements.specialBadges.filter(a => a.earned)
      ];
    }
    
    const newlyEarned = [];
    
    // Check points-based achievements
    newAchievements.pointsBased.forEach(newAchievement => {
      const currentAchievement = currentAchievements.pointsBased.find(a => a.id === newAchievement.id);
      if (newAchievement.earned && (!currentAchievement || !currentAchievement.earned)) {
        newlyEarned.push(newAchievement);
      }
    });
    
    // Check activity-based achievements
    newAchievements.activityBased.forEach(newAchievement => {
      const currentAchievement = currentAchievements.activityBased.find(a => a.id === newAchievement.id);
      if (newAchievement.earned && (!currentAchievement || !currentAchievement.earned)) {
        newlyEarned.push(newAchievement);
      }
    });
    
    // Check special badges
    newAchievements.specialBadges.forEach(newBadge => {
      const currentBadge = currentAchievements.specialBadges.find(a => a.id === newBadge.id);
      if (newBadge.earned && (!currentBadge || !currentBadge.earned)) {
        newlyEarned.push(newBadge);
      }
    });
    
    return newlyEarned;
  }

  /**
   * Get achievement leaderboard
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Leaderboard data
   */
  async getAchievementLeaderboard(limit = 10) {
    try {
      return await achievementRepository.getAchievementLeaderboard(limit);
    } catch (error) {
      throw new Error(`Service error in getAchievementLeaderboard: ${error.message}`);
    }
  }

  /**
   * Get user achievement progress
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Achievement progress
   */
  async getAchievementProgress(userId) {
    try {
      const achievements = await this.getUserAchievements(userId);
      
      // Count only earned achievements
      const earnedAchievements = achievements.statistics.achievementCount;
      
      const progress = {
        totalAchievements: earnedAchievements, // Only count earned achievements
        earnedAchievements: earnedAchievements,
        progressPercentage: 100, // Since we only show earned, progress is always 100%
        nextMilestone: achievements.statistics.nextMilestone,
        recentAchievements: []
      };
      
      // Get recent achievements (last 5 earned)
      const allEarned = [
        ...achievements.pointsBased.filter(a => a.earned),
        ...achievements.activityBased.filter(a => a.earned),
        ...achievements.specialBadges.filter(a => a.earned)
      ];
      
      progress.recentAchievements = allEarned.slice(0, 5);
      
      return progress;
    } catch (error) {
      throw new Error(`Service error in getAchievementProgress: ${error.message}`);
    }
  }

  /**
   * Get achievement statistics for admin dashboard
   * @returns {Promise<Object>} System-wide achievement statistics
   */
  async getSystemAchievementStats() {
    try {
      const cacheStats = achievementCacheManager.getCacheStats();
      
      return {
        cache: cacheStats,
        system: {
          totalUsers: await this.getTotalUsersWithAchievements(),
          averageAchievements: await this.getAverageAchievementsPerUser(),
          mostCommonAchievement: await this.getMostCommonAchievement(),
          systemPerformance: {
            averageCalculationTime: 'TBD', // Will be implemented with metrics
            cacheHitRate: this.calculateCacheHitRate(cacheStats)
          }
        }
      };
    } catch (error) {
      throw new Error(`Service error in getSystemAchievementStats: ${error.message}`);
    }
  }

  /**
   * Calculate cache hit rate
   * @param {Object} cacheStats - Cache statistics
   * @returns {number} Cache hit rate percentage
   */
  calculateCacheHitRate(cacheStats) {
    if (cacheStats.totalEntries === 0) return 0;
    return Math.round((cacheStats.validEntries / cacheStats.totalEntries) * 100);
  }

  /**
   * Get total users with achievements
   * @returns {Promise<number>} Total users count
   */
  async getTotalUsersWithAchievements() {
    try {
      const result = await achievementRepository.getAchievementLeaderboard(1000); // Large limit to get all
      return result.length;
    } catch (error) {
      console.error('Error getting total users:', error);
      return 0;
    }
  }

  /**
   * Get average achievements per user
   * @returns {Promise<number>} Average achievements count
   */
  async getAverageAchievementsPerUser() {
    try {
      // This would require additional database queries
      // For now, return a placeholder
      return 3.5; // Placeholder value
    } catch (error) {
      console.error('Error getting average achievements:', error);
      return 0;
    }
  }

  /**
   * Get most common achievement
   * @returns {Promise<string>} Most common achievement name
   */
  async getMostCommonAchievement() {
    try {
      // This would require additional database queries
      // For now, return a placeholder
      return 'First Steps'; // Placeholder value
    } catch (error) {
      console.error('Error getting most common achievement:', error);
      return 'Unknown';
    }
  }

  /**
   * Clear all achievement cache (admin function)
   */
  clearAllCache() {
    achievementCacheManager.clearAllCache();
  }

  /**
   * Invalidate specific user cache
   * @param {string} userId - User ID
   */
  invalidateUserCache(userId) {
    achievementCacheManager.invalidateUserCache(userId);
  }
}

module.exports = new AchievementService();
