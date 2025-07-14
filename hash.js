const bcrypt = require('bcrypt');

const password = 'user@123'; // Change this to your desired password

bcrypt.hash(password, 10).then(hash => {
  console.log('Hashed password:', hash);
}); 