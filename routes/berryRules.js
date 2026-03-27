const express = require('express');
const router = express.Router();
const berryRulesController = require('../controllers/berryRulesController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/berry-rules
 * @desc Get all berry rules
 * @access Authenticated users
 */
router.get('/', asyncHandler(berryRulesController.getAllRules));

/**
 * @route GET /api/berry-rules/category/:category
 * @desc Get rules by category
 * @access Authenticated users
 */
router.get('/category/:category', asyncHandler(berryRulesController.getRulesByCategory));

/**
 * @route GET /api/berry-rules/:id
 * @desc Get berry rule by ID
 * @access Authenticated users
 */
router.get('/:id', asyncHandler(berryRulesController.getRuleById));

/**
 * @route POST /api/berry-rules
 * @desc Create a new berry rule
 * @access Admin only
 */
router.post('/', authorizeRoles('admin'), asyncHandler(berryRulesController.createRule));

/**
 * @route PUT /api/berry-rules/:id
 * @desc Update a berry rule
 * @access Admin only
 */
router.put('/:id', authorizeRoles('admin'), asyncHandler(berryRulesController.updateRule));

/**
 * @route DELETE /api/berry-rules/:id
 * @desc Delete a berry rule (soft delete)
 * @access Admin only
 */
router.delete('/:id', authorizeRoles('admin'), asyncHandler(berryRulesController.deleteRule));

module.exports = router;
