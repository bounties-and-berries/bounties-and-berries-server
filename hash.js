const bcrypt = require('bcryptjs');

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Script usage (run with `node hash.js`)
if (require.main === module) {
  const password = 'faculty@123'; // Change this to your desired password
  hashPassword(password).then(hash => {
    console.log('Hashed password:', hash);
  });
}

module.exports = { hashPassword }; 