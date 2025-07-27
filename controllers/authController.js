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
        message: 'Incorrect role for this user' 
      });
    } else {
      res.status(500).json({ 
        error: 'Login failed', 
        details: err.message 
      });
    }
  }
};

module.exports = { login }; 