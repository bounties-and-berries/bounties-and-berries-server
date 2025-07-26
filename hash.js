const bcrypt = require('bcrypt');

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Script usage (run with `node hash.js`)
/*if (require.main === module) {
  const password = 'user@123'; // Change this to your desired password
  hashPassword(password).then(hash => {
    console.log('Hashed password:', hash);
  });
}

module.exports = { hashPassword }; */