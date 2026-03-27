const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/authRepository');
const tokenBlacklist = require('../utils/tokenBlacklist');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Parse JWT_EXPIRES_IN to milliseconds for blacklist expiry
function parseExpiryToMs(expiry) {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 3600000; // default 1 hour
  const [, num, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(num) * (multipliers[unit] || 3600000);
}

class AuthService {
  async login(loginData) {
    try {
      const { name, password, role } = loginData;

      // Validate required fields
      if (!name || !password || !role) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Find user by name
      const user = await authRepository.findUserByName(name);
      if (!user) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Verify password first
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Verify role matches (only after password is correct)
      if (user.role_name !== role) {
        throw new Error('INVALID_ROLE');
      }

      // Check if user is active
      if (user.is_active === false) {
        throw new Error('INACTIVE_USER');
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          role: user.role_name,
          college_id: user.college_id
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role_name,
          college_id: user.college_id,
          email: user.email,
          mobile: user.mobile
        }
      };
    } catch (error) {
      throw new Error(`Service error in login: ${error.message}`);
    }
  }

  async validateToken(token) {
    try {
      // Check blacklist first
      const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('TOKEN_BLACKLISTED');
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await authRepository.findUserById(decoded.id);

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      return {
        id: user.id,
        name: user.name,
        role: user.role_name
      };
    } catch (error) {
      throw new Error(`Service error in validateToken: ${error.message}`);
    }
  }

  /**
   * Logout user — blacklist their token so it can't be reused
   * @param {string} token - JWT token to invalidate
   * @returns {Object} Logout confirmation
   */
  async logout(token) {
    try {
      if (!token) {
        throw new Error('NO_TOKEN_PROVIDED');
      }

      // Attempt to decode (but don't require validity — expired tokens should still be blacklisted)
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Calculate remaining TTL for blacklist entry
        const remainingMs = (decoded.exp * 1000) - Date.now();
        if (remainingMs > 0) {
          await tokenBlacklist.add(token, remainingMs);
        }
      } catch (jwtErr) {
        // Token is already expired or invalid — no need to blacklist
      }

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      // Even on error, consider logout successful for the client
      return {
        success: true,
        message: 'Logout successful'
      };
    }
  }
}

module.exports = new AuthService();