/*const { Pool } = require('pg');
require('dotenv').config();
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'rdspg176.calkki2y43ti.us-east-1.rds.amazonaws.com',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'Goal1bnaws',
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

// Debug: print host & masked password
console.log('🔧 Database Config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  password: dbConfig.password ? dbConfig.password.replace(/.(?=.{4})/g, '*') : '(not set)',
  port: dbConfig.port,
});



// Test query
(async () => {
  try {
    const res = await pool.query('SELECT NOW() as now');
    console.log('⏱️ Test query successful:', res.rows[0].now);
  } catch (err) {
    console.error('🚨 Test query failed:', err);
  }
})();

module.exports = pool;*/

const { Pool } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'rdspg176.calkki2y43ti.us-east-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'Goal1bnaws',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
  // Connection pool settings for better reliability
  max: 10, // Maximum number of clients in the pool
  min: 2,  // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  acquireTimeoutMillis: 10000, // Return an error after 10 seconds if a client could not be acquired
  // Retry configuration
  retryDelayMs: 1000,
  maxRetries: 3,
};

const pool = new Pool(dbConfig);

// Debug: print host & masked password
console.log('🔧 Database Config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  password: dbConfig.password ? dbConfig.password.replace(/.(?=.{4})/g, '*') : '(not set)',
  port: dbConfig.port,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('🚨 Unexpected error on idle client:', err);
});

// Test connection on startup
(async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as now');
    console.log('✅ Database connected successfully:', res.rows[0].now);
    client.release();
  } catch (err) {
    console.error('🚨 Database connection test failed:', err.message);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down database pool...');
  await pool.end();
  process.exit(0);
});

module.exports = pool;