const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// Get user notifications
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  res.json({ success: true, data: result.rows });
}));

// Mark notification as read
router.patch('/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  const result = await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );
  
  if (result.rowCount === 0) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }
  
  res.json({ success: true, data: result.rows[0] });
}));

// Mark all as read
router.patch('/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
    [userId]
  );
  res.json({ success: true, message: 'All notifications marked as read' });
}));

module.exports = router;
