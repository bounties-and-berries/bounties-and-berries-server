const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const rewardController = require('../controllers/rewardController');

// List all available rewards
router.get('/', rewardController.getAllRewards);

// Get reward by ID
router.get('/:id', rewardController.getRewardById);

// Claim a reward (protected, permission required)
router.post('/:id/claim', authenticateToken, authorize('claimReward'), rewardController.claimReward);

// List claimed rewards for the current user (protected, permission required)
router.get('/claimed', authenticateToken, authorize('viewRewards'), rewardController.getClaimedRewards);

module.exports = router; 