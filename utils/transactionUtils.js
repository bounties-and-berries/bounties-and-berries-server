const pool = require('../config/db');

/**
 * Database Transaction Utilities for ACID Compliance
 * Provides wrapper functions for database transactions
 */

// Whitelist of allowed table and column names to prevent SQL injection
const ALLOWED_TABLES = new Set([
  'user', 'bounty', 'reward', 'college', 'role',
  'user_bounty_participation', 'user_reward_claim',
  'point_request', 'berry_rules', 'berry_purchases',
  'notifications', 'support_query', 'achievements'
]);

const ALLOWED_COLUMNS = new Set([
  'id', 'user_id', 'bounty_id', 'reward_id', 'college_id', 'role_id',
  'student_id', 'faculty_id', 'admin_id', 'name', 'email', 'mobile',
  'mobilenumber', 'username', 'redeemable_code', 'payment_ref', 'status'
]);

function validateIdentifier(value, type) {
  const allowed = type === 'table' ? ALLOWED_TABLES : ALLOWED_COLUMNS;
  if (!allowed.has(value)) {
    throw new Error(`Invalid ${type} name: ${value}`);
  }
  return value;
}

// Escape identifier for PostgreSQL (double-quote wrapping)
function escapeIdentifier(name) {
  // Remove any existing quotes and wrap in double quotes
  return `"${name.replace(/"/g, '""')}"`;
}

class TransactionUtils {
  /**
   * Execute a function within a database transaction
   * @param {Function} callback - Function to execute within transaction
   * @returns {Promise} - Result of the callback function
   */
  static async withTransaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple operations atomically
   * @param {Array} operations - Array of operations to execute
   * @returns {Promise} - Results of all operations
   */
  static async executeAtomic(operations) {
    return await this.withTransaction(async (client) => {
      const results = [];
      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }
      return results;
    });
  }

  /**
   * Lock a row for update to prevent race conditions
   * Uses whitelisted table/column names to prevent SQL injection
   * @param {Object} client - Database client
   * @param {string} table - Table name (must be whitelisted)
   * @param {string} column - Column to match (must be whitelisted)
   * @param {any} value - Value to match
   * @returns {Promise} - Locked row
   */
  static async lockRowForUpdate(client, table, column, value) {
    validateIdentifier(table, 'table');
    validateIdentifier(column, 'column');
    const query = `SELECT * FROM ${escapeIdentifier(table)} WHERE ${escapeIdentifier(column)} = $1 FOR UPDATE`;
    const result = await client.query(query, [value]);
    return result.rows[0];
  }

  /**
   * Check if a row exists and lock it for update
   * @param {Object} client - Database client
   * @param {string} table - Table name (must be whitelisted)
   * @param {string} column - Column to match (must be whitelisted)
   * @param {any} value - Value to match
   * @returns {Promise} - Locked row or null
   */
  static async findAndLockRow(client, table, column, value) {
    const row = await this.lockRowForUpdate(client, table, column, value);
    if (!row) {
      throw new Error(`${table.toUpperCase()}_NOT_FOUND`);
    }
    return row;
  }

  /**
   * Update a row with optimistic locking using version
   * Uses whitelisted table/column names to prevent SQL injection
   * @param {Object} client - Database client
   * @param {string} table - Table name (must be whitelisted)
   * @param {Object} data - Data to update
   * @param {string} idColumn - ID column name (must be whitelisted)
   * @param {any} idValue - ID value
   * @param {number} expectedVersion - Expected version number
   * @returns {Promise} - Updated row
   */
  static async updateWithVersion(client, table, data, idColumn, idValue, expectedVersion) {
    validateIdentifier(table, 'table');
    validateIdentifier(idColumn, 'column');

    // Validate all data keys are safe column names
    const dataKeys = Object.keys(data);
    // Build SET clause using escaped identifiers
    const setClause = dataKeys
      .map((key, index) => `${escapeIdentifier(key)} = $${index + 1}`)
      .join(', ');
    
    const query = `
      UPDATE ${escapeIdentifier(table)} 
      SET ${setClause}, "version" = "version" + 1 
      WHERE ${escapeIdentifier(idColumn)} = $${dataKeys.length + 1} 
      AND "version" = $${dataKeys.length + 2}
      RETURNING *
    `;
    
    const values = [...Object.values(data), idValue, expectedVersion];
    const result = await client.query(query, values);
    
    if (result.rowCount === 0) {
      throw new Error('CONCURRENT_MODIFICATION');
    }
    
    return result.rows[0];
  }

  /**
   * Validate numeric constraints
   * @param {number} value - Value to validate
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @param {string} fieldName - Field name for error message
   */
  static validateNumericConstraint(value, min, max, fieldName) {
    if (value < min || value > max) {
      throw new Error(`INVALID_${fieldName.toUpperCase()}_VALUE`);
    }
  }

  /**
   * Validate date constraints
   * @param {Date} date - Date to validate
   * @param {Date} minDate - Minimum allowed date
   * @param {Date} maxDate - Maximum allowed date
   * @param {string} fieldName - Field name for error message
   */
  static validateDateConstraint(date, minDate, maxDate, fieldName) {
    if (minDate && date < minDate) {
      throw new Error(`${fieldName.toUpperCase()}_TOO_EARLY`);
    }
    if (maxDate && date > maxDate) {
      throw new Error(`${fieldName.toUpperCase()}_TOO_LATE`);
    }
  }
}

module.exports = TransactionUtils;