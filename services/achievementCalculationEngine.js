const ACHIEVEMENT_CONFIG = require('../config/achievementConfig');
const ACHIEVEMENT_CONSTANTS = require('../config/achievementConstants');
const achievementRepository = require('../repositories/achievementRepository');

class AchievementCalculationEngine {
  /**
   * Calculate all achievements for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Complete achievement data
   */
  async calculateUserAchievements(userId) {
    try {
      const startTime = Date.now();
      
      // Get all user data in single optimized query
      const userData = await achievementRepository.getUserParticipationData(userId);
      const userStats = await achievementRepository.getUserStatistics(userId);
      const activityBreakdown = await achievementRepository.getActivityTypeBreakdown(userId);
      const streakData = await achievementRepository.getConsecutiveCompletionStreak(userId);
      const fastestCompletion = await achievementRepository.getFastestCompletion(userId);
      
      // Calculate achievements
      const achievements = {
        pointsBased: this.calculatePointsAchievements(userStats),
        activityBased: this.calculateActivityAchievements(userStats, activityBreakdown),
        specialBadges: this.calculateSpecialBadges(userData, userStats, streakData, fastestCompletion),
        statistics: this.calculateStatistics(userStats, activityBreakdown, streakData, fastestCompletion)
      };
      
      const calculationTime = Date.now() - startTime;
      
      // Performance check
      if (calculationTime > ACHIEVEMENT_CONSTANTS.PERFORMANCE.MAX_CALCULATION_TIME) {
        console.warn(`Achievement calculation for user ${userId} took ${calculationTime}ms (exceeds ${ACHIEVEMENT_CONSTANTS.PERFORMANCE.MAX_CALCULATION_TIME}ms limit)`);
      }
      
      return achievements;
    } catch (error) {
      throw new Error(`Calculation engine error: ${error.message}`);
    }
  }

  /**
   * Calculate points-based achievements
   * @param {Object} userStats - User statistics
   * @returns {Array} Points-based achievements
   */
  calculatePointsAchievements(userStats) {
    const totalPoints = parseInt(userStats.total_points) || 0;
    const achievements = [];
    
    Object.entries(ACHIEVEMENT_CONFIG.POINTS_THRESHOLDS).forEach(([key, config]) => {
      if (totalPoints >= config.threshold) {
        achievements.push({
          id: key,
          name: config.name,
          description: config.description,
          badge: config.badge,
          type: ACHIEVEMENT_CONSTANTS.ACHIEVEMENT_TYPES.POINTS_BASED,
          points: totalPoints,
          threshold: config.threshold,
          progress: 100,
          status: ACHIEVEMENT_CONSTANTS.STATUS.EARNED,
          earned: true
        });
      }
      // Remove all unearned achievements - don't include them at all
    });
    
    return achievements;
  }

  /**
   * Calculate activity-based achievements
   * @param {Object} userStats - User statistics
   * @param {Array} activityBreakdown - Activity type breakdown
   * @returns {Array} Activity-based achievements
   */
  calculateActivityAchievements(userStats, activityBreakdown) {
    const totalPoints = parseInt(userStats.total_points) || 0;
    const achievements = [];
    
    if (totalPoints < 1000) {
      // Not enough total points for activity specialization - don't include any
      return achievements;
    }
    
    // Calculate activity specialization
    Object.entries(ACHIEVEMENT_CONFIG.ACTIVITY_SPECIALIZATION).forEach(([key, config]) => {
      const activityData = activityBreakdown.find(a => a.bounty_type === config.activityType);
      
      if (activityData) {
        const activityPoints = parseInt(activityData.total_points) || 0;
        const percentage = Math.round((activityPoints / totalPoints) * 100);
        const earned = percentage >= config.threshold;
        
        // Only include earned achievements
        if (earned) {
          achievements.push({
            id: key,
            name: config.name,
            description: config.description,
            badge: config.badge,
            type: ACHIEVEMENT_CONSTANTS.ACHIEVEMENT_TYPES.ACTIVITY_BASED,
            activityType: config.activityType,
            percentage: percentage,
            points: activityPoints,
            threshold: config.threshold,
            status: ACHIEVEMENT_CONSTANTS.STATUS.EARNED,
            earned: true
          });
        }
      }
    });
    
    return achievements;
  }

  /**
   * Calculate special badges
   * @param {Array} userData - User participation data
   * @param {Object} userStats - User statistics
   * @param {Object} streakData - Consecutive completion streak
   * @param {Object} fastestCompletion - Fastest completion data
   * @returns {Array} Special badges
   */
  calculateSpecialBadges(userData, userStats, streakData, fastestCompletion) {
    const badges = [];
    
    // First Steps badge
    if (parseInt(userStats.completed_count) > 0) {
      badges.push({
        id: 'FIRST_STEPS',
        name: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.FIRST_STEPS.name,
        description: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.FIRST_STEPS.description,
        badge: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.FIRST_STEPS.badge,
        type: ACHIEVEMENT_CONSTANTS.ACHIEVEMENT_TYPES.SPECIAL_BADGE,
        status: ACHIEVEMENT_CONSTANTS.STATUS.EARNED,
        earned: true
      });
    }
    
    // Flawless Victory badge
    const perfectScore = userData.find(p => p.points_earned === p.bounty_points);
    if (perfectScore) {
      badges.push({
        id: 'FLAWLESS_VICTORY',
        name: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.FLAWLESS_VICTORY.name,
        description: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.FLAWLESS_VICTORY.description,
        badge: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.FLAWLESS_VICTORY.badge,
        type: ACHIEVEMENT_CONSTANTS.ACHIEVEMENT_TYPES.SPECIAL_BADGE,
        status: ACHIEVEMENT_CONSTANTS.STATUS.EARNED,
        earned: true
      });
    }
    
    // Consistency King badge
    const currentStreak = parseInt(streakData?.current_streak) || 0;
    if (currentStreak >= ACHIEVEMENT_CONFIG.SPECIAL_BADGES.CONSISTENCY_KING.threshold) {
      badges.push({
        id: 'CONSISTENCY_KING',
        name: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.CONSISTENCY_KING.name,
        description: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.CONSISTENCY_KING.description,
        badge: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.CONSISTENCY_KING.badge,
        type: ACHIEVEMENT_CONSTANTS.ACHIEVEMENT_TYPES.SPECIAL_BADGE,
        status: ACHIEVEMENT_CONSTANTS.STATUS.EARNED,
        earned: true,
        streak: currentStreak
      });
    }
    
    // Lightning Fast badge - only if we have completion time data
    if (fastestCompletion && fastestCompletion.completion_hours && fastestCompletion.completion_hours <= ACHIEVEMENT_CONFIG.SPECIAL_BADGES.LIGHTNING_FAST.threshold) {
      badges.push({
        id: 'LIGHTNING_FAST',
        name: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.LIGHTNING_FAST.name,
        description: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.LIGHTNING_FAST.description,
        badge: ACHIEVEMENT_CONFIG.SPECIAL_BADGES.LIGHTNING_FAST.badge,
        type: ACHIEVEMENT_CONSTANTS.ACHIEVEMENT_TYPES.SPECIAL_BADGE,
        status: ACHIEVEMENT_CONSTANTS.STATUS.EARNED,
        earned: true,
        completionTime: fastestCompletion.completion_hours
      });
    }
    
    return badges;
  }

  /**
   * Calculate comprehensive statistics
   * @param {Object} userStats - User statistics
   * @param {Array} activityBreakdown - Activity type breakdown
   * @param {Object} streakData - Consecutive completion streak
   * @param {Object} fastestCompletion - Fastest completion data
   * @returns {Object} User statistics
   */
  calculateStatistics(userStats, activityBreakdown, streakData, fastestCompletion) {
    const totalPoints = parseInt(userStats.total_points) || 0;
    const totalBerries = parseInt(userStats.total_berries) || 0;
    const completedCount = parseInt(userStats.completed_count) || 0;
    
    // Find next milestone
    let nextMilestone = null;
    const pointsThresholds = Object.values(ACHIEVEMENT_CONFIG.POINTS_THRESHOLDS);
    for (const threshold of pointsThresholds) {
      if (totalPoints < threshold.threshold) {
        nextMilestone = {
          name: threshold.name,
          threshold: threshold.threshold,
          remaining: threshold.threshold - totalPoints,
          progress: Math.round((totalPoints / threshold.threshold) * 100)
        };
        break;
      }
    }
    
    return {
      totalPoints,
      totalBerries,
      bountyCount: parseInt(userStats.total_participations) || 0,
      completedCount,
      achievementCount: 0, // Will be calculated by service
      nextMilestone,
      currentStreak: parseInt(streakData?.current_streak) || 0,
      fastestCompletion: fastestCompletion ? {
        title: fastestCompletion.bounty_title,
        type: fastestCompletion.bounty_type,
        time: Math.round(fastestCompletion.completion_hours * 100) / 100,
        points: fastestCompletion.points_earned
      } : null,
      activityBreakdown: activityBreakdown.map(activity => ({
        type: activity.bounty_type,
        count: parseInt(activity.participation_count) || 0,
        points: parseInt(activity.total_points) || 0,
        berries: parseInt(activity.total_berries) || 0
      }))
    };
  }
}

module.exports = new AchievementCalculationEngine();
