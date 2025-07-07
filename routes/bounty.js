const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const bountyController = require('../controllers/bountyController');

// CRUD routes at root, since router is mounted at /api/bounties
router.get('/', authenticateToken, authorize('viewBounties'), bountyController.getAllBounties);
router.post('/', authenticateToken, authorize('createBounty'), bountyController.createBounty);
router.get('/:id', authenticateToken, authorize('viewBounties'), bountyController.getBountyById);
router.put('/:id', authenticateToken, authorize('editBounty'), bountyController.updateBounty);
// Soft delete a bounty (sets is_active = false)
router.delete('/:id', authenticateToken, authorize('deleteBounty'), bountyController.deleteBounty);
router.patch('/:name', authenticateToken, authorize('editBounty'), bountyController.patchBountyByName);
// Admin: Get all bounties (including soft deleted)
router.get('/admin/all', authenticateToken, authorize('viewAllBounties'), bountyController.getAllBountiesAdmin);

module.exports = router; 