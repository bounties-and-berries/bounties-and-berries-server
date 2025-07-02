const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { createUser, bulkCreateUsers, changePassword } = require('../controllers/userController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Create a single user (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), asyncHandler(createUser));

// Bulk create users from CSV/Excel (admin only)
router.post('/bulk', authenticateToken, authorizeRoles('admin'), upload.single('file'), asyncHandler(bulkCreateUsers));

// Change password (user or admin)
router.post('/change-password', authenticateToken, asyncHandler(changePassword));

module.exports = router; 