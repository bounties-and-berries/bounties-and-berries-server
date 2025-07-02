const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ApiError } = require('../middleware/errorHandler');
const { findUserByUsernameOrMobile } = require('./userController');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '1h';

/**
 * POST /api/auth/login
 * Body: { identifier, password, role }
 * identifier can be username or mobilenumber
 */
const login = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;
    if (!identifier || !password || !role) {
      throw new ApiError('Identifier (username or mobilenumber), password, and role are required', 400);
    }
    const user = findUserByUsernameOrMobile(identifier, role);
    if (!user) {
      throw new ApiError('Invalid identifier or role', 401);
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new ApiError('Invalid password', 401);
    }
    const token = jwt.sign({ username: user.username, mobilenumber: user.mobilenumber, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token });
  } catch (err) {
    next(err);
  }
};

module.exports = { login }; 