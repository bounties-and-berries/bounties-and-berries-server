const express = require('express');
const router = express.Router();
const berryPurchasesController = require('../controllers/berryPurchasesController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

/**
 * @route GET /api/berry-purchases
 * @desc Get all berry purchases
 * @access Admin only
 */
router.get('/', asyncHandler(berryPurchasesController.getAllPurchases));

/**
 * @route GET /api/berry-purchases/stats
 * @desc Get purchase statistics
 * @access Admin only
 */
router.get('/stats', asyncHandler(berryPurchasesController.getPurchaseStats));

/**
 * @route GET /api/berry-purchases/status/:status
 * @desc Get purchases by status
 * @access Admin only
 */
router.get('/status/:status', asyncHandler(berryPurchasesController.getPurchasesByStatus));

/**
 * @route GET /api/berry-purchases/admin/:adminId
 * @desc Get purchases by admin ID
 * @access Admin only
 */
router.get('/admin/:adminId', asyncHandler(berryPurchasesController.getPurchasesByAdmin));

/**
 * @route GET /api/berry-purchases/:id
 * @desc Get purchase by ID
 * @access Admin only
 */
router.get('/:id', asyncHandler(berryPurchasesController.getPurchaseById));

/**
 * @route POST /api/berry-purchases
 * @desc Create a new berry purchase
 * @access Admin only
 */
router.post('/', asyncHandler(berryPurchasesController.createPurchase));

/**
 * @route PUT /api/berry-purchases/:id/status
 * @desc Update purchase status
 * @access Admin only
 */
router.put('/:id/status', asyncHandler(berryPurchasesController.updatePurchaseStatus));

module.exports = router;
