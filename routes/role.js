const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const roleController = require('../controllers/roleController');
const { asyncHandler } = require('../middleware/errorHandler');

// All endpoints require 'creator' role
router.get('/', authenticateToken, authorizeRoles('creator'), roleController.getAllRoles);
router.get('/search', authenticateToken, authorizeRoles('creator'), roleController.searchRoles);
router.get('/:id', authenticateToken, authorizeRoles('creator'), roleController.getRoleById);
router.post('/', authenticateToken, authorizeRoles('creator'), asyncHandler(roleController.createRole));
router.put('/:id', authenticateToken, authorizeRoles('creator'), asyncHandler(roleController.updateRole));
router.patch('/:id', authenticateToken, authorizeRoles('creator'), asyncHandler(roleController.patchRole));
router.delete('/:id', authenticateToken, authorizeRoles('creator'), asyncHandler(roleController.deleteRole));

module.exports = router; 