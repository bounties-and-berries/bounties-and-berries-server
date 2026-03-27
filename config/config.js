require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3001,
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

  // Database configuration
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    ssl: process.env.DB_SSL === 'true'
  },
  
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