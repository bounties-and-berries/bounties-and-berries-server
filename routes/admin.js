const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { validate } = require('../middleware/validate');
const { 
  purchaseBerriesSchema, 
  createBerryRuleSchema, 
  updateProfileSchema 
} = require('../validations/adminValidation');

// All admin routes require authentication
router.use(authenticateToken);

/**
 * @route GET /admin/dashboard
 */
router.get('/dashboard', authorizeRoles('admin'), adminController.getDashboard);

/**
 * @route POST /admin/rules
 */
router.post('/rules', authorizeRoles('admin'), validate(createBerryRuleSchema), adminController.createBerryRule);

/**
 * @route POST /admin/users/bulk
 */
router.post('/users/bulk', authorizeRoles('admin'), upload.single('csv'), adminController.bulkUploadUsers);

/**
 * @route GET /admin/users/template
 */
router.get('/users/template', authorizeRoles('admin'), adminController.downloadTemplate);

/**
 *@route POST /admin/purchase-berries
 */
router.post('/purchase-berries', authorizeRoles('admin'), validate(purchaseBerriesSchema), adminController.purchaseBerries);

/**
 * @route GET /admin/profile
 */
router.get('/profile', authorizeRoles('admin'), adminController.getProfile);

/**
 * @route PUT /admin/profile
 */
router.put('/profile', authorizeRoles('admin'), validate(updateProfileSchema), adminController.updateProfile);

/**
 * @route GET /admin/transactions
 */
router.get('/transactions', authorizeRoles('admin'), adminController.getTransactions);

/**
 * @route GET /admin/students-progress
 */
router.get('/students-progress', authorizeRoles('admin', 'faculty'), adminController.getStudentsProgress);

module.exports = router;