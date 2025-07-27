const statusService = require('../services/statusService');

/**
 * Get basic server status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getStatus = async (req, res) => {
  try {
    const status = await statusService.getBasicStatus();
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get server status',
      error: error.message
    });
  }
};

/**
 * Get detailed server status with system information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDetailedStatus = async (req, res) => {
  try {
    const status = await statusService.getDetailedStatus();
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get detailed server status',
      error: error.message
    });
  }
};

/**
 * Get health status for monitoring
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getHealthStatus = async (req, res) => {
  try {
    const health = await statusService.getHealthStatus();
    
    if (health.status === 'healthy') {
      res.status(200).json(health);
    } else {
      res.status(503).json(health);
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

module.exports = {
  getStatus,
  getDetailedStatus,
  getHealthStatus
}; 