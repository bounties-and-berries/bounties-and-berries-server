const pool = require('../config/db');

class CollegeRepository {
  async findAll() {
    try {
      const query = 'SELECT * FROM college WHERE is_active = TRUE ORDER BY name ASC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findAll: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM college WHERE id = $1 AND is_active = TRUE';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findById: ${error.message}`);
    }
  }

  async findByName(name) {
    try {
      const query = 'SELECT * FROM college WHERE name = $1 AND is_active = TRUE';
      const result = await pool.query(query, [name]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findByName: ${error.message}`);
    }
  }

  async create(collegeData) {
    try {
      const query = `
        INSERT INTO college (name, location, berries_purchased) 
        VALUES ($1, $2, $3) RETURNING *
      `;
      const values = [
        collegeData.name, 
        collegeData.location, 
        collegeData.berries_purchased || 0
      ];
      const result = await pool.query(query, values);
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
      const updateColumns = [];
      const updateValues = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          updateColumns.push(`${key} = $${paramIndex++}`);
          updateValues.push(updateData[key]);
        }
      });

      if (updateColumns.length === 0) {
        throw new Error('No fields to update');
      }

      updateValues.push(id);
      const query = `UPDATE college SET ${updateColumns.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, updateValues);
      
      if (result.rows.length === 0) {
        throw new Error('COLLEGE_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('DUPLICATE_NAME');
      }
      throw new Error(`Database error in update: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const query = 'UPDATE college SET is_active = FALSE WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('COLLEGE_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in delete: ${error.message}`);
    }
  }

  async searchByName(name) {
    try {
      const query = 'SELECT * FROM college WHERE name ILIKE $1 AND is_active = TRUE ORDER BY name ASC';
      const result = await pool.query(query, [`%${name}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in searchByName: ${error.message}`);
    }
  }

  async findAllIncludingInactive() {
    try {
      const query = 'SELECT * FROM college ORDER BY name ASC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findAllIncludingInactive: ${error.message}`);
    }
  }
}

module.exports = new CollegeRepository(); 