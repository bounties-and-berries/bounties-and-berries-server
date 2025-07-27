const pool = require('../config/db');

class UserRewardClaimRepository {
  async findAll() {
    try {
      const query = 'SELECT * FROM user_reward_claim ORDER BY created_on DESC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findAll: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM user_reward_claim WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findById: ${error.message}`);
    }
  }

  async findByUserId(userId) {
    try {
      const query = `
        SELECT urc.*, r.name as reward_name, r.description as reward_description
        FROM user_reward_claim urc
        JOIN reward r ON urc.reward_id = r.id
        WHERE urc.user_id = $1
        ORDER BY urc.created_on DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByUserId: ${error.message}`);
    }
  }

  async findByRewardId(rewardId) {
    try {
      const query = `
        SELECT urc.*, u.name as user_name, u.mobile
        FROM user_reward_claim urc
        JOIN "user" u ON urc.user_id = u.id
        WHERE urc.reward_id = $1
        ORDER BY urc.created_on DESC
      `;
      const result = await pool.query(query, [rewardId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByRewardId: ${error.message}`);
    }
  }

  async findByUserAndReward(userId, rewardId) {
    try {
      const query = 'SELECT * FROM user_reward_claim WHERE user_id = $1 AND reward_id = $2';
      const result = await pool.query(query, [userId, rewardId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findByUserAndReward: ${error.message}`);
    }
  }

  async findByRedeemableCode(redeemableCode) {
    try {
      const query = 'SELECT * FROM user_reward_claim WHERE redeemable_code = $1';
      const result = await pool.query(query, [redeemableCode]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findByRedeemableCode: ${error.message}`);
    }
  }

  async findClaimsByDateRange(startDate, endDate) {
    try {
      const query = `
        SELECT urc.*, u.name as user_name, r.name as reward_name
        FROM user_reward_claim urc
        JOIN "user" u ON urc.user_id = u.id
        JOIN reward r ON urc.reward_id = r.id
        WHERE urc.created_on >= $1 AND urc.created_on <= $2
        ORDER BY urc.created_on DESC
      `;
      const result = await pool.query(query, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findClaimsByDateRange: ${error.message}`);
    }
  }

  async findClaimsByBerriesRange(minBerries, maxBerries) {
    try {
      let query = `
        SELECT urc.*, u.name as user_name, r.name as reward_name
        FROM user_reward_claim urc
        JOIN "user" u ON urc.user_id = u.id
        JOIN reward r ON urc.reward_id = r.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (minBerries !== undefined) {
        query += ` AND urc.berries_spent >= $${paramIndex++}`;
        params.push(minBerries);
      }

      if (maxBerries !== undefined) {
        query += ` AND urc.berries_spent <= $${paramIndex++}`;
        params.push(maxBerries);
      }

      query += ' ORDER BY urc.created_on DESC';
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findClaimsByBerriesRange: ${error.message}`);
    }
  }

  async create(claimData) {
    try {
      const query = `
        INSERT INTO user_reward_claim (user_id, reward_id, berries_spent, redeemable_code, created_by, modified_by) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `;
      const values = [
        claimData.user_id,
        claimData.reward_id,
        claimData.berries_spent,
        claimData.redeemable_code,
        claimData.created_by,
        claimData.modified_by || claimData.created_by
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('DUPLICATE_REDEEMABLE_CODE');
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
      const query = `UPDATE user_reward_claim SET ${updateColumns.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, updateValues);
      
      if (result.rows.length === 0) {
        throw new Error('CLAIM_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in update: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const query = 'DELETE FROM user_reward_claim WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('CLAIM_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in delete: ${error.message}`);
    }
  }

  async getClaimWithDetails(id) {
    try {
      const query = `
        SELECT urc.*, u.name as user_name, u.mobile, r.name as reward_name, r.description as reward_description
        FROM user_reward_claim urc
        JOIN "user" u ON urc.user_id = u.id
        JOIN reward r ON urc.reward_id = r.id
        WHERE urc.id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in getClaimWithDetails: ${error.message}`);
    }
  }

  async getClaimsWithDetails() {
    try {
      const query = `
        SELECT urc.*, u.name as user_name, u.mobile, r.name as reward_name, r.description as reward_description
        FROM user_reward_claim urc
        JOIN "user" u ON urc.user_id = u.id
        JOIN reward r ON urc.reward_id = r.id
        ORDER BY urc.created_on DESC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in getClaimsWithDetails: ${error.message}`);
    }
  }

  async getTotalBerriesSpentByUser(userId) {
    try {
      const query = `
        SELECT COALESCE(SUM(berries_spent), 0) as total_berries_spent
        FROM user_reward_claim 
        WHERE user_id = $1
      `;
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in getTotalBerriesSpentByUser: ${error.message}`);
    }
  }

  async getTotalBerriesSpentByReward(rewardId) {
    try {
      const query = `
        SELECT COALESCE(SUM(berries_spent), 0) as total_berries_spent
        FROM user_reward_claim 
        WHERE reward_id = $1
      `;
      const result = await pool.query(query, [rewardId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in getTotalBerriesSpentByReward: ${error.message}`);
    }
  }

  async getClaimStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_claims,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT reward_id) as unique_rewards,
          COALESCE(SUM(berries_spent), 0) as total_berries_spent
        FROM user_reward_claim
      `;
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in getClaimStats: ${error.message}`);
    }
  }

  async searchClaims(filters) {
    try {
      let query = `
        SELECT urc.*, u.name as user_name, r.name as reward_name
        FROM user_reward_claim urc
        JOIN "user" u ON urc.user_id = u.id
        JOIN reward r ON urc.reward_id = r.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.user_id) {
        query += ` AND urc.user_id = $${paramIndex++}`;
        params.push(filters.user_id);
      }

      if (filters.reward_id) {
        query += ` AND urc.reward_id = $${paramIndex++}`;
        params.push(filters.reward_id);
      }

      if (filters.redeemable_code) {
        query += ` AND urc.redeemable_code ILIKE $${paramIndex++}`;
        params.push(`%${filters.redeemable_code}%`);
      }

      if (filters.user_name) {
        query += ` AND u.name ILIKE $${paramIndex++}`;
        params.push(`%${filters.user_name}%`);
      }

      if (filters.reward_name) {
        query += ` AND r.name ILIKE $${paramIndex++}`;
        params.push(`%${filters.reward_name}%`);
      }

      if (filters.min_berries) {
        query += ` AND urc.berries_spent >= $${paramIndex++}`;
        params.push(filters.min_berries);
      }

      if (filters.max_berries) {
        query += ` AND urc.berries_spent <= $${paramIndex++}`;
        params.push(filters.max_berries);
      }

      if (filters.start_date) {
        query += ` AND urc.created_on >= $${paramIndex++}`;
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ` AND urc.created_on <= $${paramIndex++}`;
        params.push(filters.end_date);
      }

      query += ' ORDER BY urc.created_on DESC';
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in searchClaims: ${error.message}`);
    }
  }

  async checkUserHasClaimedReward(userId, rewardId) {
    try {
      const query = 'SELECT 1 FROM user_reward_claim WHERE user_id = $1 AND reward_id = $2';
      const result = await pool.query(query, [userId, rewardId]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Database error in checkUserHasClaimedReward: ${error.message}`);
    }
  }

  async generateUniqueRedeemableCode() {
    try {
      let code;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const existing = await this.findByRedeemableCode(code);
        attempts++;
        
        if (attempts > maxAttempts) {
          throw new Error('Unable to generate unique redeemable code');
        }
      } while (existing);

      return code;
    } catch (error) {
      throw new Error(`Database error in generateUniqueRedeemableCode: ${error.message}`);
    }
  }
}

module.exports = new UserRewardClaimRepository(); 