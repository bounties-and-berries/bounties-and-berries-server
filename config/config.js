require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 443,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Application settings
  appName: 'Bounties and Berries Server',
  version: '1.0.0',
  
  // Security settings
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // API settings
  apiPrefix: '/api',
  
  // Server info
  serverInfo: {
    name: 'Bounties and Berries Server',
    description: 'A Node.js server for Bounties and Berries application',
    version: '1.0.0',
    author: 'KASDA',
    license: 'MIT'
  }
};

module.exports = config; 