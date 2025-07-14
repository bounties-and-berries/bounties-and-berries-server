const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ApiError } = require('../middleware/errorHandler');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '1h';

/**
 * POST /api/auth/login
 * Body: { mobile, name, password, role }
 */
const login = async (req, res, next) => {
  try {
    const { mobile, name, password, role } = req.body;
    if (!mobile || !name || !password || !role) {
      throw new ApiError('Mobile, name, password, and role are required', 400);
    }
    // Query the database for the user by mobile and name
    const userQuery = `SELECT u.*, r.name as role_name FROM "user" u JOIN role r ON u.role_id = r.id WHERE u.mobile = $1 AND u.name = $2 LIMIT 1`;
    const { rows } = await pool.query(userQuery, [mobile, name]);
    if (rows.length === 0) {
      throw new ApiError('Invalid mobile or name', 401);
    }
    const user = rows[0];
    // Check that the provided role matches the user's actual role
    if (user.role_name !== role) {
      throw new ApiError('Incorrect role for this user', 401);
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new ApiError('Invalid password', 401);
    }
    const token = jwt.sign({ id: user.id, mobile: user.mobile, name: user.name, role: user.role_name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token });
  } catch (err) {
    next(err);
  }
};

module.exports = { login }; 