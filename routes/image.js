const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { getFileHash } = require('../fileHash');
const fs = require('fs');

router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/images/${req.file.filename}`;
  // Compute hash of the uploaded file
  const fileBuffer = fs.readFileSync(req.file.path);
  const imageHash = getFileHash(fileBuffer);
  res.json({ imageUrl, imageHash });
});

module.exports = router; 