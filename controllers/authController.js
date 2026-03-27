const authService = require('../services/authService');

/**
 * POST /api/auth/login
 * Body: { name, password, role }
 */
const login = async (req, res, next) => {
  try {
    const loginData = req.body;
    const result = await authService.login(loginData);
    
    res.json({ token: result.token });
  } catch (err) {
    if (err.message.includes('INVALID_CREDENTIALS')) {
      res.status(401).json({ 
        error: 'Authentication failed', 
        message: 'Invalid name or password' 
      });
    } else if (err.message.includes('INVALID_ROLE')) {
      res.status(401).json({ 
        error: 'Authentication failed', 
        message: 'Wrong user role' 
      });
    } else {
      res.status(500).json({ 
        error: 'Login failed', 
        details: err.message 
      });
    }
  }
};

/**
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 */
const logout = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    const result = await authService.logout(token);
    
    res.json({
      success: true,
      message: result.message,
      user: result.user
    });
  } catch (err) {
    if (err.message.includes('NO_TOKEN_PROVIDED')) {
      res.status(400).json({ 
        error: 'Logout failed', 
        message: 'No token provided' 
      });
    } else if (err.message.includes('USER_NOT_FOUND')) {
      // Still consider logout successful even if user not found
      res.json({
        success: true,
        message: 'Logout successful (user not found)'
      });
    } else {
      res.status(500).json({ 
        error: 'Logout failed', 
        details: err.message 
      });
    }
  }
};

module.exports = { login, logout }; 