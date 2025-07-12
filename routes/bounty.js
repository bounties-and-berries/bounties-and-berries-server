const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const bountyController = require('../controllers/bountyController');

// Admin: Get all bounties (including soft deleted)
router.get('/admin/all', authenticateToken, authorize('viewAllBounties'), bountyController.getAllBountiesAdmin);

// CRUD routes at root, since router is mounted at /api/bounties
router.get('/', authenticateToken, authorize('viewBounties'), bountyController.getAllBounties);
router.post('/', authenticateToken, authorize('createBounty'), bountyController.createBounty);
router.get('/:id', authenticateToken, authorize('viewBounties'), bountyController.getBountyById);
router.put('/:id', authenticateToken, authorize('editBounty'), bountyController.updateBounty);
// Soft delete a bounty (sets is_active = false)
router.delete('/:id', authenticateToken, authorize('deleteBounty'), bountyController.deleteBounty);
router.patch('/:name', authenticateToken, authorize('editBounty'), bountyController.patchBountyByName);
// Unified search/filter endpoint
router.post('/search', authenticateToken, authorize('viewBounties'), bountyController.searchAndFilterBounties);

module.exports = router; 