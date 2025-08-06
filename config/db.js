const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', // Change to your DB user
  host: 'localhost',
  database: 'postgres',
  password: '8660199288', // Change to your DB password
  port: 5432,
  // In production, use environment variables for credentials
});

module.exports = pool; 