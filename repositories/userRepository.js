const pool = require('../config/db');

class UserRepository {
  async findByMobile(mobile) {
    try {
      const query = 'SELECT * FROM "user" WHERE mobile = $1';
      const result = await pool.query(query, [mobile]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findByMobile: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM "user" WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findById: ${error.message}`);
    }
  }

  async findByMobileAndNameAndRole(mobile, name, role) {
    try {
      const query = `
        SELECT u.*, r.name as role_name 
        FROM "user" u 
        JOIN role r ON u.role_id = r.id 
        WHERE u.mobile = $1 AND u.name = $2 AND r.name = $3 
        LIMIT 1
      `;
      const result = await pool.query(query, [mobile, name, role]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findByMobileAndNameAndRole: ${error.message}`);
    }
  }

  async findRoleByName(roleName) {
    try {
      const query = 'SELECT id FROM role WHERE name = $1';
      const result = await pool.query(query, [roleName]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findRoleByName: ${error.message}`);
    }
  }

  async create(userData) {
    try {
      const query = `
        INSERT INTO "user" (mobile, name, role_id, password, college_id, is_active) 
        VALUES ($1, $2, $3, $4, $5, TRUE) 
        RETURNING id, mobile, name, role_id, college_id
      `;
      const values = [
        userData.mobile,
        userData.name,
        userData.role_id,
        userData.password,
        userData.college_id
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('DUPLICATE_MOBILE');
      }
      throw new Error(`Database error in create: ${error.message}`);
    }
  }

  async updatePassword(userId, hashedPassword) {
    try {
      const query = 'UPDATE "user" SET password = $1 WHERE id = $2';
      const result = await pool.query(query, [hashedPassword, userId]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Database error in updatePassword: ${error.message}`);
    }
  }

  async bulkCreate(usersData) {
    try {
      const created = [];
      for (const userData of usersData) {
        const query = `
          INSERT INTO "user" (mobile, name, role_id, password, college_id, is_active) 
          VALUES ($1, $2, $3, $4, $5, TRUE) 
          RETURNING id, mobile, name, role_id, college_id
        `;
        const values = [
          userData.mobile,
          userData.name,
          userData.role_id,
          userData.password,
          userData.college_id
        ];
        const result = await pool.query(query, values);
        created.push(result.rows[0]);
      }
      return created;
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('DUPLICATE_MOBILE');
      }
      throw new Error(`Database error in bulkCreate: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const query = 'SELECT * FROM "user" WHERE is_active = TRUE ORDER BY name ASC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findAll: ${error.message}`);
    }
  }

  async findByCollegeId(collegeId) {
    try {
      const query = 'SELECT * FROM "user" WHERE college_id = $1 AND is_active = TRUE ORDER BY name ASC';
      const result = await pool.query(query, [collegeId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByCollegeId: ${error.message}`);
    }
  }

  async findByRoleId(roleId) {
    try {
      const query = 'SELECT * FROM "user" WHERE role_id = $1 AND is_active = TRUE ORDER BY name ASC';
      const result = await pool.query(query, [roleId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByRoleId: ${error.message}`);
    }
  }

  async update(userId, updateData) {
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

      updateValues.push(userId);
      const query = `UPDATE "user" SET ${updateColumns.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, updateValues);
      
      if (result.rows.length === 0) {
        throw new Error('USER_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('DUPLICATE_MOBILE');
      }
      throw new Error(`Database error in update: ${error.message}`);
    }
  }

  async delete(userId) {
    try {
      const query = 'UPDATE "user" SET is_active = FALSE WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        throw new Error('USER_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in delete: ${error.message}`);
    }
  }

  async searchByName(name) {
    try {
      const query = 'SELECT * FROM "user" WHERE name ILIKE $1 AND is_active = TRUE ORDER BY name ASC';
      const result = await pool.query(query, [`%${name}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in searchByName: ${error.message}`);
    }
  }

  async searchByMobile(mobile) {
    try {
      const query = 'SELECT * FROM "user" WHERE mobile ILIKE $1 AND is_active = TRUE ORDER BY name ASC';
      const result = await pool.query(query, [`%${mobile}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in searchByMobile: ${error.message}`);
    }
  }
}

module.exports = new UserRepository(); 