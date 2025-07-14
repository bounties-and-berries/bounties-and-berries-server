const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/userRewardClaimController');
const { asyncHandler } = require('../middleware/errorHandler');

// Only creators allowed
const authorizeCreator = (req, res, next) => {
  if (req.user.role !== 'creator') return res.status(403).json({ error: 'Forbidden: Only creators allowed' });
  next();
};

router.post('/', authenticateToken, authorizeCreator, asyncHandler(controller.createClaim));
router.get('/', authenticateToken, authorizeCreator, asyncHandler(controller.listClaims));
router.put('/:id', authenticateToken, authorizeCreator, asyncHandler(controller.updateClaim));
router.delete('/:id', authenticateToken, authorizeCreator, asyncHandler(controller.deleteClaim));

module.exports = router; 