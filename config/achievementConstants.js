const ACHIEVEMENT_CONSTANTS = {
  // Achievement Types
  ACHIEVEMENT_TYPES: {
    POINTS_BASED: 'points_based',
    ACTIVITY_BASED: 'activity_based',
    SPECIAL_BADGE: 'special_badge'
  },

  // Activity Types
  ACTIVITY_TYPES: {
    CODING: 'coding',
    DESIGN: 'design',
    WRITING: 'writing',
    RESEARCH: 'research',
    OTHER: 'other'
  },

  // Cache Configuration
  CACHE: {
    TIMEOUT: 3600000, // 1 hour in milliseconds
    KEY_PREFIX: 'achievements_',
    BATCH_SIZE: 100
  },

  // Performance Thresholds
  PERFORMANCE: {
    MAX_CALCULATION_TIME: 200, // milliseconds
    MAX_CACHE_SIZE: 1000, // number of cached users
    BATCH_PROCESSING_LIMIT: 50
  },

  // Achievement Status
  STATUS: {
    EARNED: 'earned',
    IN_PROGRESS: 'in_progress',
    LOCKED: 'locked'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    NEW_ACHIEVEMENT: 'new_achievement',
    MILESTONE_REACHED: 'milestone_reached',
    PROGRESS_UPDATE: 'progress_update'
  }
};

module.exports = ACHIEVEMENT_CONSTANTS;
