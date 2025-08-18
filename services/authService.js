const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/authRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '1h';

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

      // Verify role matches
      if (user.role_name !== role) {
        throw new Error('INVALID_ROLE');
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          name: user.name, 
          role: user.role_name 
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
}

module.exports = new AuthService(); 