const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { createUser, bulkCreateUsers, changePassword } = require('../controllers/userController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const getUpload = require('../middleware/uploadCategory');
const { getFileHash } = require('../fileHash');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// Create a single user (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), asyncHandler(createUser));

// Bulk create users from CSV/Excel (admin only)
router.post('/bulk', authenticateToken, authorizeRoles('admin'), upload.single('file'), asyncHandler(bulkCreateUsers));

// Change password (user or admin)
router.post('/change-password', authenticateToken, asyncHandler(changePassword));

// PATCH /profile-image: Update user's profile image
router.patch('/profile-image', authenticateToken, getUpload('user_imgs').single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/user_imgs/${req.file.filename}`;
  const fileBuffer = fs.readFileSync(req.file.path);
  const imageHash = getFileHash(fileBuffer);
  // Get old image URL
  const userResult = await pool.query('SELECT img_url FROM "user" WHERE id = $1', [req.user.id]);
  if (userResult.rows.length > 0 && userResult.rows[0].img_url) {
    const oldPath = path.join(__dirname, '..', userResult.rows[0].img_url);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }
  // Update user record with imageUrl and imageHash
  await pool.query('UPDATE "user" SET img_url = $1, image_hash = $2 WHERE id = $3', [imageUrl, imageHash, req.user.id]);
  res.json({ imageUrl, imageHash });
}));

module.exports = router; 