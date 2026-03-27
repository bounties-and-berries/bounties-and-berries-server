const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/userRewardClaimController');
const { asyncHandler } = require('../middleware/errorHandler');

// Only creators or admins allowed for management
const authorizeManager = (req, res, next) => {
  if (!['creator', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Only creators or admins allowed' });
  }
  next();
};

// NOTE: POST / (createClaim) was REMOVED — it had a race condition on berry balance.
// Use POST /claim/:rewardId (claimReward) instead, which is transactional with FOR UPDATE locks.

// Claim a reward (safe, transactional — available to students)
router.post('/claim/:rewardId', authenticateToken, authorize('claimReward'), asyncHandler(controller.claimReward));

// Read-only routes
router.get('/', authenticateToken, authorizeManager, asyncHandler(controller.listClaims));
router.get('/:id', authenticateToken, authorizeManager, asyncHandler(controller.getClaimById));

// Management routes (update/delete) — restricted to creators/admins
router.put('/:id', authenticateToken, authorizeManager, asyncHandler(controller.updateClaim));
router.delete('/:id', authenticateToken, authorizeManager, asyncHandler(controller.deleteClaim));

module.exports = router;