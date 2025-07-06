const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const bountyController = require('../controllers/bountyController');

// CRUD routes
router.get('/', authenticateToken, bountyController.getAllBounties);
router.post('/', authenticateToken, bountyController.createBounty);
router.get('/:id', authenticateToken, bountyController.getBountyById);
router.put('/:id', authenticateToken, bountyController.updateBounty);
router.delete('/:id', authenticateToken, bountyController.deleteBounty);

module.exports = router; 