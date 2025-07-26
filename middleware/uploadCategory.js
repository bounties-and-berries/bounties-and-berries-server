const multer = require('multer');
const path = require('path');
const fs = require('fs');

function getUpload(category) {
  const dir = path.join('uploads', category);
  fs.mkdirSync(dir, { recursive: true });
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '_' + file.originalname);
    }
  });
  return multer({ storage });
}

module.exports = getUpload;