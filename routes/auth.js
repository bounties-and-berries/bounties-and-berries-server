const express = require('express');
const router = express.Router();
const { login, logout } = require('../controllers/authController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/authMiddleware');

const { validate } = require('../middleware/validate');
const { loginSchema } = require('../utils/validators');

// POST /api/auth/login
router.post('/login', validate(loginSchema), asyncHandler(login));

// POST /api/auth/logout
router.post('/logout', asyncHandler(logout));

module.exports = router;