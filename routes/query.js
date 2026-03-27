const express = require('express');
const router = express.Router();
const { submitQuery, getAllQueries } = require('../controllers/queryController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, asyncHandler(submitQuery));
router.get('/', authenticateToken, authorizeRoles('admin', 'faculty'), asyncHandler(getAllQueries));

module.exports = router;
