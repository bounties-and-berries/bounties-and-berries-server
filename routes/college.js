const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const collegeController = require('../controllers/collegeController');
const { asyncHandler } = require('../middleware/errorHandler');

const { validate } = require('../middleware/validate');
const { collegeSchema, collegeUpdateSchema } = require('../utils/validators');

// All endpoints require 'creator' role
router.get('/', authenticateToken, authorizeRoles('creator'), collegeController.getAllColleges);
router.get('/search', authenticateToken, authorizeRoles('creator'), collegeController.searchColleges);
router.get('/:id', authenticateToken, authorizeRoles('creator'), collegeController.getCollegeById);
router.post('/', authenticateToken, authorizeRoles('creator'), validate(collegeSchema), asyncHandler(collegeController.createCollege));
router.put('/:id', authenticateToken, authorizeRoles('creator'), validate(collegeUpdateSchema), asyncHandler(collegeController.updateCollege));
router.patch('/:id', authenticateToken, authorizeRoles('creator'), validate(collegeUpdateSchema), asyncHandler(collegeController.patchCollege));
router.delete('/:id', authenticateToken, authorizeRoles('creator'), asyncHandler(collegeController.deleteCollege));
router.get('/admin/all', authenticateToken, authorizeRoles('creator'), collegeController.getAllCollegesAdmin);

module.exports = router; 