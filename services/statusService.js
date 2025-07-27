const config = require('../config/config');
const os = require('os');
const statusRepository = require('../repositories/statusRepository');

class StatusService {
  formatUptime(seconds) {
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
  }

  checkMemoryHealth() {
    const memUsage = (os.totalmem() - os.freemem()) / os.totalmem();
    return memUsage < 0.9 ? 'pass' : 'warn';
  }

  async getBasicStatus() {
    try {
      const dbStatus = await statusRepository.checkDatabaseConnection();
      
      return {
        status: 'running',
        message: 'Server is operational',
        timestamp: new Date().toISOString(),
        server: {
          name: config.serverInfo.name,
          version: config.serverInfo.version,
          environment: config.nodeEnv
        },
        database: dbStatus,
        uptime: {
          server: process.uptime(),
          formatted: this.formatUptime(process.uptime())
        }
      };
    } catch (error) {
      throw new Error(`Service error in getBasicStatus: ${error.message}`);
    }
  }

  async getDetailedStatus() {
    try {
      const dbStatus = await statusRepository.checkDatabaseConnection();
      const dbStats = await statusRepository.getDatabaseStats();
      
      return {
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
        database: {
          ...dbStatus,
          stats: dbStats
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
              system: this.formatUptime(os.uptime()),
              server: this.formatUptime(process.uptime())
            }
          }
        },
        process: {
          pid: process.pid,
          memory: process.memoryUsage(),
          uptime: process.uptime()
        }
      };
    } catch (error) {
      throw new Error(`Service error in getDetailedStatus: ${error.message}`);
    }
  }

  async getHealthStatus() {
    try {
      const dbStatus = await statusRepository.checkDatabaseConnection();
      const memoryHealth = this.checkMemoryHealth();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          server: 'pass',
          database: dbStatus.status === 'connected' ? 'pass' : 'fail',
          memory: memoryHealth,
          uptime: 'pass'
        },
        version: config.serverInfo.version
      };

      // Overall health status
      const failedChecks = Object.values(health.checks).filter(check => check === 'fail').length;
      if (failedChecks > 0) {
        health.status = 'unhealthy';
      }

      return health;
    } catch (error) {
      throw new Error(`Service error in getHealthStatus: ${error.message}`);
    }
  }
}

module.exports = new StatusService(); 