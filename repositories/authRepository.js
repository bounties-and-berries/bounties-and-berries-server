const pool = require('../config/db');

class AuthRepository {
  async findUserByName(name) {
    try {
      const query = `
        SELECT u.*, r.name as role_name 
        FROM "user" u 
        JOIN role r ON u.role_id = r.id 
        WHERE u.name = $1 
        LIMIT 1
      `;
      const { rows } = await pool.query(query, [name]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`Database error in findUserByName: ${error.message}`);
    }
  }

  async findUserById(id) {
    try {
      const query = `
        SELECT u.*, r.name as role_name 
        FROM "user" u 
        JOIN role r ON u.role_id = r.id 
        WHERE u.id = $1 
        LIMIT 1
      `;
      const { rows } = await pool.query(query, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`Database error in findUserById: ${error.message}`);
    }
  }
}

module.exports = new AuthRepository(); 