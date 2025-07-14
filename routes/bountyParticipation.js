const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/bountyParticipationController');
const { asyncHandler } = require('../middleware/errorHandler');

// Only creators can create, update, delete
const authorizeCreator = (req, res, next) => {
  if (req.user.role !== 'creator') return res.status(403).json({ error: 'Forbidden: Only creators allowed' });
  next();
};

// Creators, admins, and faculty can view all
const authorizeView = (req, res, next) => {
  if (!['creator', 'admin', 'faculty'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Only creators, admins, or faculty allowed' });
  }
  next();
};

// 1. View all students in a specific bounty (admin/faculty/creator)
router.get('/bounty/:bountyId', authenticateToken, authorizeView, asyncHandler(controller.getBountyParticipants));

// 2. View own bounty participation (any authenticated user)
router.get('/my', authenticateToken, asyncHandler(controller.getMyParticipations));

// CRUD routes
router.post('/', authenticateToken, authorizeCreator, asyncHandler(controller.createParticipation));
router.get('/', authenticateToken, authorizeView, asyncHandler(controller.listParticipations));
router.put('/:id', authenticateToken, authorizeCreator, asyncHandler(controller.updateParticipation));
router.delete('/:id', authenticateToken, authorizeCreator, asyncHandler(controller.deleteParticipation));

module.exports = router; 