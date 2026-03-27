const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * Frontend Compatibility Aliases
 * These routes provide aliases for frontend endpoints that expect different naming
 */

// Student History Alias
// Frontend expects: GET /api/students/:id/history
// Backend has: GET /api/bounty-participation/my
router.get('/students/:id/history', authenticateToken, async (req, res, next) => {
    // Forward to the actual endpoint
    req.url = '/bounty-participation/my';
    next('route');
});

// Admin Dashboard Stats Alias
// Frontend expects: GET /api/admin/dashboard-stats
// Backend has: GET /api/admin/dashboard
router.get('/admin/dashboard-stats', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
    req.url = '/admin/dashboard';
    next('route');
});

// Faculty Events Alias
// Frontend expects: GET /api/faculty/events
// Backend has: GET /api/bounties/admin/all
router.get('/faculty/events', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res, next) => {
    req.url = '/bounties/admin/all';
    next('route');
});

// User Stats Alias (already exists but adding for completeness)
// Frontend expects: GET /api/users/stats
// Backend has: GET /api/users/:id/stats
router.get('/users/stats', authenticateToken, async (req, res, next) => {
    const userId = req.user.id;
    req.url = `/users/${userId}/stats`;
    next('route');
});

module.exports = router;
