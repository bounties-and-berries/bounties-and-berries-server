const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { asyncHandler } = require('../middleware/errorHandler');

// POST /api/auth/login
router.post('/login', asyncHandler(login));

module.exports = router; 