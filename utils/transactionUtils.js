const pool = require('../config/db');

/**
 * Database Transaction Utilities for ACID Compliance
 * Provides wrapper functions for database transactions
 */

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
   * @param {Object} client - Database client
   * @param {string} table - Table name
   * @param {string} column - Column to match
   * @param {any} value - Value to match
   * @returns {Promise} - Locked row
   */
  static async lockRowForUpdate(client, table, column, value) {
    const query = `SELECT * FROM ${table} WHERE ${column} = $1 FOR UPDATE`;
    const result = await client.query(query, [value]);
    return result.rows[0];
  }

  /**
   * Check if a row exists and lock it for update
   * @param {Object} client - Database client
   * @param {string} table - Table name
   * @param {string} column - Column to match
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
   * @param {Object} client - Database client
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {string} idColumn - ID column name
   * @param {any} idValue - ID value
   * @param {number} expectedVersion - Expected version number
   * @returns {Promise} - Updated row
   */
  static async updateWithVersion(client, table, data, idColumn, idValue, expectedVersion) {
    const setClause = Object.keys(data)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const query = `
      UPDATE ${table} 
      SET ${setClause}, version = version + 1 
      WHERE ${idColumn} = $${Object.keys(data).length + 1} 
      AND version = $${Object.keys(data).length + 2}
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