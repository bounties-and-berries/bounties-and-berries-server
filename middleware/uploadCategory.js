const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

// Allowed MIME types for evidence and image uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',         // Evidence documents
  'text/csv',                // Bulk uploads
  'application/vnd.ms-excel',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for evidence files

const useS3 = !!process.env.AWS_S3_BUCKET_NAME;
const s3 = useS3 ? new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
}) : null;

function getUpload(category) {
  let storage;

  if (useS3) {
    storage = multerS3({
      s3: s3,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (req, file, cb) {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
        cb(null, `${category}/${Date.now()}_${sanitizedName}`);
      }
    });
  } else {
    const dir = path.join('uploads', category);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, dir);
      },
      filename: function (req, file, cb) {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
        cb(null, Date.now() + '_' + sanitizedName);
      }
    });
  }
  
  const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed.`), false);
    }
  };
  
  return multer({ 
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
  });
}

async function deleteFromS3(fileUrl) {
  if (!useS3 || !fileUrl || !fileUrl.includes('.amazonaws.com/')) return;
  
  // Fire-and-forget background macro-task to avoid blocking the HTTP response chunk
  setImmediate(async () => {
    try {
      const urlParts = new URL(fileUrl);
      // Key usually looks like "/category/filename" after the bucket host
      const key = decodeURIComponent(urlParts.pathname.substring(1));
      
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key
      }));
      console.log(`Deleted orphaned S3 file: ${key}`);
      
    } catch (error) {
      // Idempotency: Ignore if the file was already deleted by another concurrent branch
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        return;
      }
      const keyFallback = fileUrl ? decodeURIComponent(new URL(fileUrl).pathname.substring(1)) : 'unknown';
      console.error('S3 delete failed', { key: keyFallback, err: error?.name || error });
    }
  });
}

// Export object allowing function destructing 
module.exports = getUpload;
module.exports.deleteFromS3 = deleteFromS3;