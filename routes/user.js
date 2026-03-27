const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { createUser, bulkCreateUsers, changePassword, getCurrentUser, updateCurrentUser, getUserStats, getAllUsers, getUserById, updateUser, deleteUser, addBerriesToUser } = require('../controllers/userController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const getUpload = require('../middleware/uploadCategory');
const { getFileHash } = require('../scripts/fileHash');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const { validate } = require('../middleware/validate');
const { userSchema, userUpdateSchema } = require('../utils/validators');

// Create a single user (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), validate(userSchema), asyncHandler(createUser));

// Bulk create users from CSV/Excel (admin only)
router.post('/bulk', authenticateToken, authorizeRoles('admin'), upload.single('file'), asyncHandler(bulkCreateUsers));

// Change password (user or admin)
router.post('/change-password', authenticateToken, asyncHandler(changePassword));

// PATCH /profile-image: Update user's profile image
router.patch('/profile-image', authenticateToken, getUpload('user_imgs').single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = req.file.location || `/uploads/user_imgs/${req.file.filename}`;
  // Get old image URL
  const userResult = await pool.query('SELECT img_url FROM "user" WHERE id = $1', [req.user.id]);
  if (userResult.rows.length > 0 && userResult.rows[0].img_url) {
    const oldPath = path.join(__dirname, '..', userResult.rows[0].img_url);
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
      } catch (err) {
        console.error('Failed to deleted old image:', err);
      }
    }
  }
  // Update user record with imageUrl
  await pool.query('UPDATE "user" SET img_url = $1 WHERE id = $2', [imageUrl, req.user.id]);
  res.json({ imageUrl });
}));

// PATCH /profile-image-base64: Update user's profile image via base64 encoded str
router.patch('/profile-image-base64', authenticateToken, asyncHandler(async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  // Parse base64
  const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ error: 'Invalid base64 string' });
  }
  
  const type = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  let ext = type.split('/')[1] || 'jpg';
  if (ext === 'jpeg') ext = 'jpg';
  
  const filename = `${req.user.id}-${Date.now()}.${ext}`;
  const uploadDir = path.join(__dirname, '..', 'uploads', 'user_imgs');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);
  const imageUrl = `/uploads/user_imgs/${filename}`;

  const userResult = await pool.query('SELECT img_url FROM "user" WHERE id = $1', [req.user.id]);
  if (userResult.rows.length > 0 && userResult.rows[0].img_url) {
    const oldPath = path.join(__dirname, '..', userResult.rows[0].img_url);
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
      } catch (err) {
        console.error('Failed to deleted old image:', err);
      }
    }
  }

  await pool.query('UPDATE "user" SET img_url = $1 WHERE id = $2', [imageUrl, req.user.id]);
  res.json({ imageUrl });
}));

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(getCurrentUser));

// Update current user profile
router.put('/me', authenticateToken, asyncHandler(updateCurrentUser));

// Get user statistics
router.get('/:id/stats', authenticateToken, asyncHandler(getUserStats));

// Admin user management
router.get('/', authenticateToken, authorizeRoles('admin'), asyncHandler(getAllUsers));
router.get('/:id', authenticateToken, authorizeRoles('admin'), asyncHandler(getUserById));
router.put('/:id', authenticateToken, authorizeRoles('admin'), asyncHandler(updateUser));
router.delete('/:id', authenticateToken, authorizeRoles('admin'), asyncHandler(deleteUser));
router.post('/:id/berries', authenticateToken, authorizeRoles('admin'), asyncHandler(addBerriesToUser));

module.exports = router; 