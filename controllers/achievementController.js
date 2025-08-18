const achievementService = require('../services/achievementService');

/**
 * Get user achievements with statistics and progress (consolidated endpoint)
 * @route POST /api/achievements/user
 */
exports.getUserAchievements = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required in request body' 
      });
    }
    
    // Check if user is requesting their own achievements or has admin access
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized access to achievements' 
      });
    }
    
    // Get all achievement data in one call
    const achievements = await achievementService.getUserAchievements(userId);
    const progress = await achievementService.getAchievementProgress(userId);
    
    // Consolidate response
    const response = {
      achievements: {
        pointsBased: achievements.pointsBased,
        activityBased: achievements.activityBased,
        specialBadges: achievements.specialBadges
      },
      statistics: achievements.statistics,
      progress: progress
    };
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error getting user achievements:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user achievements',
      details: error.message 
    });
  }
};

/**
 * Get achievement leaderboard
 * @route GET /api/achievements/leaderboard
 */
exports.getAchievementLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    if (limit > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Limit cannot exceed 100' 
      });
    }
    
    const leaderboard = await achievementService.getAchievementLeaderboard(limit);
    
    res.json({
      success: true,
      data: {
        leaderboard,
        total: leaderboard.length,
        limit
      }
    });
  } catch (error) {
    console.error('Error getting achievement leaderboard:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get achievement leaderboard',
      details: error.message 
    });
  }
};

/**
 * Get system achievement statistics (admin only)
 * @route GET /api/achievements/system/stats
 */
exports.getSystemAchievementStats = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }
    
    const stats = await achievementService.getSystemAchievementStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting system achievement stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get system achievement statistics',
      details: error.message 
    });
  }
};

/**
 * Clear achievement cache (admin only)
 * @route POST /api/achievements/cache/clear
 */
exports.clearAchievementCache = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }
    
    achievementService.clearAllCache();
    
    res.json({
      success: true,
      message: 'Achievement cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing achievement cache:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear achievement cache',
      details: error.message 
    });
  }
};

/**
 * Invalidate specific user achievement cache (admin only)
 * @route POST /api/achievements/cache/invalidate/:userId
 */
exports.invalidateUserCache = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }
    
    const { userId } = req.params;
    achievementService.invalidateUserCache(userId);
    
    res.json({
      success: true,
      message: `Achievement cache invalidated for user ${userId}`
    });
  } catch (error) {
    console.error('Error invalidating user cache:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to invalidate user cache',
      details: error.message 
    });
  }
};
