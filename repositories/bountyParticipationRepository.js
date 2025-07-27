const pool = require('../config/db');

class BountyParticipationRepository {
  async findAll() {
    try {
      const query = 'SELECT * FROM user_bounty_participation ORDER BY created_on DESC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findAll: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM user_bounty_participation WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findById: ${error.message}`);
    }
  }

  async findByUserId(userId) {
    try {
      const query = `
        SELECT ubp.*, b.name as bounty_name, b.type as bounty_type, b.scheduled_date
        FROM user_bounty_participation ubp
        JOIN bounty b ON ubp.bounty_id = b.id
        WHERE ubp.user_id = $1
        ORDER BY ubp.created_on DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByUserId: ${error.message}`);
    }
  }

  async findByBountyId(bountyId) {
    try {
      const query = `
        SELECT ubp.*, u.name as user_name, u.mobile
        FROM user_bounty_participation ubp
        JOIN "user" u ON ubp.user_id = u.id
        WHERE ubp.bounty_id = $1
        ORDER BY ubp.created_on DESC
      `;
      const result = await pool.query(query, [bountyId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByBountyId: ${error.message}`);
    }
  }

  async findByUserAndBounty(userId, bountyId) {
    try {
      const query = 'SELECT * FROM user_bounty_participation WHERE user_id = $1 AND bounty_id = $2';
      const result = await pool.query(query, [userId, bountyId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findByUserAndBounty: ${error.message}`);
    }
  }

  async findByStatus(status) {
    try {
      const query = `
        SELECT ubp.*, u.name as user_name, b.name as bounty_name
        FROM user_bounty_participation ubp
        JOIN "user" u ON ubp.user_id = u.id
        JOIN bounty b ON ubp.bounty_id = b.id
        WHERE ubp.status = $1
        ORDER BY ubp.created_on DESC
      `;
      const result = await pool.query(query, [status]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByStatus: ${error.message}`);
    }
  }

  async findByUserAndStatus(userId, status) {
    try {
      const query = `
        SELECT ubp.*, b.name as bounty_name, b.type as bounty_type, b.scheduled_date
        FROM user_bounty_participation ubp
        JOIN bounty b ON ubp.bounty_id = b.id
        WHERE ubp.user_id = $1 AND ubp.status = $2
        ORDER BY ubp.created_on DESC
      `;
      const result = await pool.query(query, [userId, status]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByUserAndStatus: ${error.message}`);
    }
  }

  async findCompletedByUser(userId) {
    try {
      const query = `
        SELECT ubp.*, b.name as bounty_name, b.type as bounty_type, b.scheduled_date
        FROM user_bounty_participation ubp
        JOIN bounty b ON ubp.bounty_id = b.id
        WHERE ubp.user_id = $1 AND ubp.status = 'completed'
        ORDER BY ubp.created_on DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findCompletedByUser: ${error.message}`);
    }
  }

  async findRegisteredByUser(userId) {
    try {
      const query = `
        SELECT ubp.*, b.name as bounty_name, b.type as bounty_type, b.scheduled_date
        FROM user_bounty_participation ubp
        JOIN bounty b ON ubp.bounty_id = b.id
        WHERE ubp.user_id = $1 AND ubp.status = 'registered'
        ORDER BY ubp.created_on DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findRegisteredByUser: ${error.message}`);
    }
  }

  async getRegisteredBountyIds(userId) {
    try {
      const query = 'SELECT bounty_id FROM user_bounty_participation WHERE user_id = $1';
      const result = await pool.query(query, [userId]);
      return result.rows.map(row => row.bounty_id);
    } catch (error) {
      throw new Error(`Database error in getRegisteredBountyIds: ${error.message}`);
    }
  }

  async create(participationData) {
    try {
      const query = `
        INSERT INTO user_bounty_participation (user_id, bounty_id, points_earned, berries_earned, status, created_by, modified_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *
      `;
      const values = [
        participationData.user_id,
        participationData.bounty_id,
        participationData.points_earned || 0,
        participationData.berries_earned || 0,
        participationData.status || 'registered',
        participationData.created_by,
        participationData.modified_by || participationData.created_by
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('DUPLICATE_PARTICIPATION');
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
      const query = `UPDATE user_bounty_participation SET ${updateColumns.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, updateValues);
      
      if (result.rows.length === 0) {
        throw new Error('PARTICIPATION_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in update: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const query = 'DELETE FROM user_bounty_participation WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('PARTICIPATION_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in delete: ${error.message}`);
    }
  }

  async getBountyParticipants(bountyId) {
    try {
      const query = `
        SELECT ubp.id as participation_id, u.id as user_id, u.name as student_name, 
               ubp.status, ubp.points_earned, ubp.berries_earned, ubp.created_on
        FROM user_bounty_participation ubp
        JOIN "user" u ON ubp.user_id = u.id
        WHERE ubp.bounty_id = $1
        ORDER BY ubp.created_on ASC
      `;
      const result = await pool.query(query, [bountyId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in getBountyParticipants: ${error.message}`);
    }
  }

  async getUserParticipations(userId) {
    try {
      const query = `
        SELECT ubp.id as participation_id, b.id as bounty_id, b.name as bounty_name, 
               b.type as bounty_type, b.scheduled_date, ubp.status, ubp.points_earned, 
               ubp.berries_earned, ubp.created_on
        FROM user_bounty_participation ubp
        JOIN bounty b ON ubp.bounty_id = b.id
        WHERE ubp.user_id = $1
        ORDER BY ubp.created_on DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in getUserParticipations: ${error.message}`);
    }
  }

  async getTotalEarningsByUser(userId) {
    try {
      // Get total points and berries earned from completed bounties
      const earningsQuery = `
        SELECT 
          COALESCE(SUM(points_earned), 0) as total_points_earned,
          COALESCE(SUM(berries_earned), 0) as total_berries_earned
        FROM user_bounty_participation 
        WHERE user_id = $1 AND status = 'completed'
      `;
      const earningsResult = await pool.query(earningsQuery, [userId]);
      const earnings = earningsResult.rows[0];

      // Get total berries spent on rewards
      const spentQuery = `
        SELECT COALESCE(SUM(berries_spent), 0) as total_berries_spent
        FROM user_reward_claim 
        WHERE user_id = $1
      `;
      const spentResult = await pool.query(spentQuery, [userId]);
      const spent = spentResult.rows[0];

      // Calculate net values
      const totalPoints = parseInt(earnings.total_points_earned, 10);
      const totalBerriesEarned = parseInt(earnings.total_berries_earned, 10);
      const totalBerriesSpent = parseInt(spent.total_berries_spent, 10);
      const netBerries = totalBerriesEarned - totalBerriesSpent;

      return {
        total_points: totalPoints,
        total_berries_earned: totalBerriesEarned,
        total_berries_spent: totalBerriesSpent,
        net_berries: netBerries
      };
    } catch (error) {
      throw new Error(`Database error in getTotalEarningsByUser: ${error.message}`);
    }
  }

  async getBountyStats(bountyId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_participants,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered_count,
          COALESCE(SUM(points_earned), 0) as total_points_awarded,
          COALESCE(SUM(berries_earned), 0) as total_berries_awarded
        FROM user_bounty_participation 
        WHERE bounty_id = $1
      `;
      const result = await pool.query(query, [bountyId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in getBountyStats: ${error.message}`);
    }
  }

  async searchParticipations(filters) {
    try {
      let query = `
        SELECT ubp.*, u.name as user_name, b.name as bounty_name
        FROM user_bounty_participation ubp
        JOIN "user" u ON ubp.user_id = u.id
        JOIN bounty b ON ubp.bounty_id = b.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.user_id) {
        query += ` AND ubp.user_id = $${paramIndex++}`;
        params.push(filters.user_id);
      }

      if (filters.bounty_id) {
        query += ` AND ubp.bounty_id = $${paramIndex++}`;
        params.push(filters.bounty_id);
      }

      if (filters.status) {
        query += ` AND ubp.status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.user_name) {
        query += ` AND u.name ILIKE $${paramIndex++}`;
        params.push(`%${filters.user_name}%`);
      }

      if (filters.bounty_name) {
        query += ` AND b.name ILIKE $${paramIndex++}`;
        params.push(`%${filters.bounty_name}%`);
      }

      query += ' ORDER BY ubp.created_on DESC';
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in searchParticipations: ${error.message}`);
    }
  }

  async checkUserParticipation(userId, bountyId) {
    try {
      const query = 'SELECT 1 FROM user_bounty_participation WHERE user_id = $1 AND bounty_id = $2';
      const result = await pool.query(query, [userId, bountyId]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Database error in checkUserParticipation: ${error.message}`);
    }
  }

  async getNetBerriesByUser(userId) {
    try {
      // Get total berries earned from completed bounties
      const earningsQuery = `
        SELECT COALESCE(SUM(berries_earned), 0) as total_berries_earned
        FROM user_bounty_participation 
        WHERE user_id = $1 AND status = 'completed'
      `;
      const earningsResult = await pool.query(earningsQuery, [userId]);
      const totalEarned = parseInt(earningsResult.rows[0].total_berries_earned, 10);

      // Get total berries spent on rewards
      const spentQuery = `
        SELECT COALESCE(SUM(berries_spent), 0) as total_berries_spent
        FROM user_reward_claim 
        WHERE user_id = $1
      `;
      const spentResult = await pool.query(spentQuery, [userId]);
      const totalSpent = parseInt(spentResult.rows[0].total_berries_spent, 10);

      // Calculate net berries
      const netBerries = totalEarned - totalSpent;

      return {
        total_earned: totalEarned,
        total_spent: totalSpent,
        net_berries: netBerries
      };
    } catch (error) {
      throw new Error(`Database error in getNetBerriesByUser: ${error.message}`);
    }
  }
}

module.exports = new BountyParticipationRepository(); 