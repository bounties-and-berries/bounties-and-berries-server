const knex = require('knex');
const config = require('./config');

const db = knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false
  },
  pool: {
    min: 2,
    max: 10
  }
});

module.exports = db;
