const pool = require('../config/db');

class RoleRepository {
  async findAll() {
    try {
      const query = 'SELECT * FROM role ORDER BY name ASC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findAll: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM role WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findById: ${error.message}`);
    }
  }

  async findByName(name) {
    try {
      const query = 'SELECT * FROM role WHERE name = $1';
      const result = await pool.query(query, [name]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findByName: ${error.message}`);
    }
  }

  async create(roleData) {
    try {
      const query = 'INSERT INTO role (name) VALUES ($1) RETURNING *';
      const result = await pool.query(query, [roleData.name]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('DUPLICATE_NAME');
      }
      throw new Error(`Database error in create: ${error.message}`);
    }
  }

  async update(id, updateData) {
    try {
      const query = 'UPDATE role SET name = $1 WHERE id = $2 RETURNING *';
      const result = await pool.query(query, [updateData.name, id]);
      
      if (result.rows.length === 0) {
        throw new Error('ROLE_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('DUPLICATE_NAME');
      }
      throw new Error(`Database error in update: ${error.message}`);
    }
  }

  async patch(id, patchData) {
    try {
      const updateColumns = [];
      const updateValues = [];
      let paramIndex = 1;

      if (patchData.name !== undefined) {
        updateColumns.push(`name = $${paramIndex++}`);
        updateValues.push(patchData.name);
      }

      if (updateColumns.length === 0) {
        throw new Error('No fields to update');
      }

      updateValues.push(id);
      const query = `UPDATE role SET ${updateColumns.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, updateValues);
      
      if (result.rows.length === 0) {
        throw new Error('ROLE_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('DUPLICATE_NAME');
      }
      throw new Error(`Database error in patch: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const query = 'DELETE FROM role WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('ROLE_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in delete: ${error.message}`);
    }
  }

  async searchByName(name) {
    try {
      const query = 'SELECT * FROM role WHERE name ILIKE $1 ORDER BY name ASC';
      const result = await pool.query(query, [`%${name}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in searchByName: ${error.message}`);
    }
  }
}

module.exports = new RoleRepository(); 