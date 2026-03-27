const pool = require('../config/db');

class RewardRepository {
  async findAll(collegeId = null) {
    try {
      let query = 'SELECT * FROM reward WHERE is_deleted = FALSE AND (expiry_date IS NULL OR expiry_date >= NOW())';
      const params = [];
      let idx = 1;
      
      if (collegeId) {
        query += ` AND (college_id = $${idx++} OR college_id IS NULL)`;
        params.push(collegeId);
      }
      query += ' ORDER BY expiry_date ASC';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findAll: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM reward WHERE id = $1 AND is_deleted = FALSE';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findById: ${error.message}`);
    }
  }

  async findByName(name) {
    try {
      const query = 'SELECT * FROM reward WHERE name = $1 AND is_deleted = FALSE';
      const result = await pool.query(query, [name]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findByName: ${error.message}`);
    }
  }

  async findByCreator(createdBy) {
    try {
      const query = 'SELECT * FROM reward WHERE created_by = $1 AND is_deleted = FALSE ORDER BY created_on DESC';
      const result = await pool.query(query, [createdBy]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByCreator: ${error.message}`);
    }
  }

  async findAvailable() {
    try {
      const query = 'SELECT * FROM reward WHERE is_deleted = FALSE AND (expiry_date IS NULL OR expiry_date >= NOW()) ORDER BY expiry_date ASC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findAvailable: ${error.message}`);
    }
  }

  async findExpired() {
    try {
      const query = 'SELECT * FROM reward WHERE is_deleted = FALSE AND expiry_date IS NOT NULL AND expiry_date < NOW() ORDER BY expiry_date DESC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findExpired: ${error.message}`);
    }
  }

  async create(rewardData) {
    try {
      const query = `
        INSERT INTO reward (name, description, berries_required, expiry_date, img_url, image_hash, college_id, created_by, modified_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *
      `;
      const values = [
        rewardData.name,
        rewardData.description,
        rewardData.berries_required,
        rewardData.expiry_date,
        rewardData.img_url,
        rewardData.image_hash,
        rewardData.college_id || null,
        rewardData.created_by,
        rewardData.modified_by
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
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
      const query = `UPDATE reward SET ${updateColumns.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, updateValues);
      
      if (result.rows.length === 0) {
        throw new Error('REWARD_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in update: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const query = 'UPDATE reward SET is_deleted = TRUE WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('REWARD_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in delete: ${error.message}`);
    }
  }

  async searchByName(name) {
    try {
      const query = 'SELECT * FROM reward WHERE name ILIKE $1 AND is_deleted = FALSE ORDER BY expiry_date ASC';
      const result = await pool.query(query, [`%${name}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in searchByName: ${error.message}`);
    }
  }

  async searchByDescription(description) {
    try {
      const query = 'SELECT * FROM reward WHERE description ILIKE $1 AND is_deleted = FALSE ORDER BY expiry_date ASC';
      const result = await pool.query(query, [`%${description}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in searchByDescription: ${error.message}`);
    }
  }

  async findByBerriesRange(minBerries, maxBerries) {
    try {
      let query = 'SELECT * FROM reward WHERE is_deleted = FALSE';
      const params = [];
      let paramIndex = 1;

      if (minBerries !== undefined) {
        query += ` AND berries_required >= $${paramIndex++}`;
        params.push(minBerries);
      }

      if (maxBerries !== undefined) {
        query += ` AND berries_required <= $${paramIndex++}`;
        params.push(maxBerries);
      }

      query += ' ORDER BY berries_required ASC';
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByBerriesRange: ${error.message}`);
    }
  }

  async findExpiringSoon(days = 7) {
    try {
      const query = `
        SELECT * FROM reward 
        WHERE is_deleted = FALSE AND expiry_date IS NOT NULL 
        AND expiry_date >= NOW() 
        AND expiry_date <= NOW() + INTERVAL '${days} days'
        ORDER BY expiry_date ASC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findExpiringSoon: ${error.message}`);
    }
  }

  async getAllIncludingExpired() {
    try {
      const query = 'SELECT * FROM reward WHERE is_deleted = FALSE ORDER BY created_on DESC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in getAllIncludingExpired: ${error.message}`);
    }
  }

  async getClaimedRewards(userId) {
    try {
      const query = `
        SELECT urc.id as claim_id, r.id as reward_id, r.name, r.description, r.img_url, r.berries_required, r.expiry_date, urc.berries_spent, urc.created_on, urc.redeemable_code
        FROM user_reward_claim urc
        JOIN reward r ON urc.reward_id = r.id
        WHERE urc.user_id = $1
        ORDER BY urc.created_on DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in getClaimedRewards: ${error.message}`);
    }
  }

  async checkUserCanClaim(userId, rewardId) {
    try {
      // Allow users to claim rewards multiple times if they have points
      // Check if reward exists and is available
      const rewardQuery = 'SELECT * FROM reward WHERE id = $1 AND is_deleted = FALSE AND (expiry_date IS NULL OR expiry_date >= NOW())';
      const rewardResult = await pool.query(rewardQuery, [rewardId]);
      
      if (rewardResult.rows.length === 0) {
        return { canClaim: false, reason: 'Reward not found or expired' };
      }

      return { canClaim: true, reward: rewardResult.rows[0] };
    } catch (error) {
      throw new Error(`Database error in checkUserCanClaim: ${error.message}`);
    }
  }
}

module.exports = new RewardRepository(); 