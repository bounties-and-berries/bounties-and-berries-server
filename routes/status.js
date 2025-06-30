const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');

// GET /api/status - Get server status
router.get('/', statusController.getStatus);

// GET /api/status/detailed - Get detailed server status
router.get('/detailed', statusController.getDetailedStatus);

// GET /api/status/health - Get health status
router.get('/health', statusController.getHealthStatus);

module.exports = router; 