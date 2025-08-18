const ACHIEVEMENT_CONSTANTS = require('../config/achievementConstants');

/**
 * Format achievement data for API response
 * @param {Object} achievement - Raw achievement data
 * @returns {Object} Formatted achievement
 */
function formatAchievement(achievement) {
  return {
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    badge: achievement.badge,
    type: achievement.type,
    status: achievement.status,
    earned: achievement.earned,
    progress: achievement.progress || 0,
    ...(achievement.points && { points: achievement.points }),
    ...(achievement.threshold && { threshold: achievement.threshold }),
    ...(achievement.activityType && { activityType: achievement.activityType }),
    ...(achievement.percentage && { percentage: achievement.percentage })
  };
}

/**
 * Calculate achievement progress percentage
 * @param {number} current - Current value
 * @param {number} target - Target value
 * @returns {number} Progress percentage (0-100)
 */
function calculateProgress(current, target) {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

/**
 * Get achievement status based on progress
 * @param {number} progress - Progress percentage
 * @param {boolean} earned - Whether achievement is earned
 * @returns {string} Achievement status
 */
function getAchievementStatus(progress, earned) {
  if (earned) return ACHIEVEMENT_CONSTANTS.STATUS.EARNED;
  if (progress > 0) return ACHIEVEMENT_CONSTANTS.STATUS.IN_PROGRESS;
  return ACHIEVEMENT_CONSTANTS.STATUS.LOCKED;
}

/**
 * Sort achievements by priority (earned first, then by progress)
 * @param {Array} achievements - Array of achievements
 * @returns {Array} Sorted achievements
 */
function sortAchievementsByPriority(achievements) {
  return achievements.sort((a, b) => {
    // Earned achievements first
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    
    // Then by progress (highest first)
    if (a.progress !== b.progress) {
      return b.progress - a.progress;
    }
    
    // Finally by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Validate achievement configuration
 * @param {Object} config - Achievement configuration
 * @returns {Object} Validation result
 */
function validateAchievementConfig(config) {
  const errors = [];
  
  // Check points thresholds
  if (config.POINTS_THRESHOLDS) {
    Object.entries(config.POINTS_THRESHOLDS).forEach(([key, achievement]) => {
      if (!achievement.threshold || achievement.threshold <= 0) {
        errors.push(`Invalid threshold for ${key}: ${achievement.threshold}`);
      }
      if (!achievement.name || !achievement.description) {
        errors.push(`Missing name or description for ${key}`);
      }
    });
  }
  
  // Check activity specialization
  if (config.ACTIVITY_SPECIALIZATION) {
    Object.entries(config.ACTIVITY_SPECIALIZATION).forEach(([key, achievement]) => {
      if (!achievement.threshold || achievement.threshold <= 0 || achievement.threshold > 100) {
        errors.push(`Invalid threshold for ${key}: ${achievement.threshold} (must be 1-100)`);
      }
      if (!achievement.minTotalPoints || achievement.minTotalPoints <= 0) {
        errors.push(`Invalid minTotalPoints for ${key}: ${achievement.minTotalPoints}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate achievement summary for user
 * @param {Object} achievements - User achievements
 * @returns {Object} Achievement summary
 */
function generateAchievementSummary(achievements) {
  const totalAchievements = achievements.pointsBased.length + 
                           achievements.activityBased.length + 
                           achievements.specialBadges.length;
  
  const earnedAchievements = achievements.pointsBased.filter(a => a.earned).length +
                            achievements.activityBased.filter(a => a.earned).length +
                            achievements.specialBadges.filter(a => a.earned).length;
  
  const progressPercentage = totalAchievements > 0 ? 
    Math.round((earnedAchievements / totalAchievements) * 100) : 0;
  
  return {
    total: totalAchievements,
    earned: earnedAchievements,
    progress: progressPercentage,
    remaining: totalAchievements - earnedAchievements,
    completionRate: progressPercentage
  };
}

/**
 * Check if user has earned specific achievement
 * @param {Array} achievements - User achievements
 * @param {string} achievementId - Achievement ID to check
 * @returns {boolean} True if earned
 */
function hasAchievement(achievements, achievementId) {
  const allAchievements = [
    ...achievements.pointsBased,
    ...achievements.activityBased,
    ...achievements.specialBadges
  ];
  
  return allAchievements.some(a => a.id === achievementId && a.earned);
}

module.exports = {
  formatAchievement,
  calculateProgress,
  getAchievementStatus,
  sortAchievementsByPriority,
  validateAchievementConfig,
  generateAchievementSummary,
  hasAchievement
};
