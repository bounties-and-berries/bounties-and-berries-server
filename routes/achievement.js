const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const achievementController = require('../controllers/achievementController');

// Public routes (require authentication)
router.get('/leaderboard', authenticateToken, achievementController.getAchievementLeaderboard);

// User-specific routes (require authentication and ownership)
router.post('/user', authenticateToken, achievementController.getUserAchievements);

// Admin-only routes
router.get('/system/stats', authenticateToken, authorize('viewAllPointRequests'), achievementController.getSystemAchievementStats);
router.post('/cache/clear', authenticateToken, authorize('viewAllPointRequests'), achievementController.clearAchievementCache);
router.post('/cache/invalidate/:userId', authenticateToken, authorize('viewAllPointRequests'), achievementController.invalidateUserCache);

module.exports = router;
