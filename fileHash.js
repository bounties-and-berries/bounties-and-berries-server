const crypto = require('crypto');

function getFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { getFileHash }; 