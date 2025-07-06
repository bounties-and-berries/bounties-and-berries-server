const config = require('../config/config');
const os = require('os');

/**
 * Get basic server status & status for monitoring
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getStatus = (req, res) => {
  try {
    const status = {
      status: 'running',
      message: 'Server is operational',
      timestamp: new Date().toISOString(),
      server: {
        name: config.serverInfo.name,
        version: config.serverInfo.version,
        environment: config.nodeEnv
      },
      uptime: {
        server: process.uptime(),
        formatted: formatUptime(process.uptime())
      }
    };

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
const getDetailedStatus = (req, res) => {
  try {
    const status = {
      status: 'running',
      message: 'Server is operational',
      timestamp: new Date().toISOString(),
      server: {
        name: config.serverInfo.name,
        version: config.serverInfo.version,
        description: config.serverInfo.description,
        environment: config.nodeEnv,
        port: config.port
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        },
        cpu: {
          cores: os.cpus().length,
          loadAverage: os.loadavg()
        },
        uptime: {
          system: os.uptime(),
          server: process.uptime(),
          formatted: {
            system: formatUptime(os.uptime()),
            server: formatUptime(process.uptime())
          }
        }
      },
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

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
const getHealthStatus = (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        server: 'pass',
        memory: checkMemoryHealth(),
        uptime: 'pass'
      },
      version: config.serverInfo.version
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

/**
 * Format uptime in human readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
};

/**
 * Check memory health
 * @returns {string} Memory health status
 */
const checkMemoryHealth = () => {
  const memUsage = (os.totalmem() - os.freemem()) / os.totalmem();
  return memUsage < 0.9 ? 'pass' : 'warn';
};

module.exports = {
  getStatus,
  getDetailedStatus,
  getHealthStatus
}; 