const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles, authorize } = require('../middleware/authMiddleware');
const rewardController = require('../controllers/rewardController');
const { claimReward } = require('../controllers/rewardController');
const { asyncHandler } = require('../middleware/errorHandler');
const getUpload = require('../middleware/uploadCategory');

// List all available rewards (open to all authenticated users)
router.get('/', authenticateToken, rewardController.getAllRewards);

// Get reward by ID (open to all authenticated users)
router.get('/:id', authenticateToken, rewardController.getRewardById);

// Create a reward (only creators)
router.post('/', authenticateToken, authorizeRoles('creator'), getUpload('rewards_imgs').single('image'), rewardController.createReward);

// Update a reward (only creators)
router.put('/:id', authenticateToken, authorizeRoles('creator'), getUpload('rewards_imgs').single('image'), rewardController.updateReward);

// Delete a reward (only creators)
router.delete('/:id', authenticateToken, authorizeRoles('creator'), rewardController.deleteReward);

// Claim a reward (protected, permission required)
router.post('/:id/claim', authenticateToken, authorize('claimReward'), rewardController.claimReward);

// List claimed rewards for the current user (protected, permission required)
router.get('/user/claimed', authenticateToken, authorize('viewRewards'), rewardController.getClaimedRewards);

// Unified search/filter endpoint for rewards
router.post('/search', authenticateToken, rewardController.searchAndFilterRewards);

// Add claim reward route
router.post('/claim/:id', authenticateToken, asyncHandler(claimReward));

module.exports = router; 