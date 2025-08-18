const pool = require('../config/db');

class BountyRepository {
  async findAll(filters = {}, pagination = {}, sorting = {}) {
    try {
      let query = 'SELECT * FROM bounty WHERE is_active = TRUE';
      const params = [];
      let idx = 1;

      // Apply filters
      if (filters.name) {
        query += ` AND name ILIKE $${idx++}`;
        params.push(`%${filters.name}%`);
      }
      if (filters.venue) {
        query += ` AND venue ILIKE $${idx++}`;
        params.push(`%${filters.venue}%`);
      }
      if (filters.type) {
        query += ` AND type ILIKE $${idx++}`;
        params.push(`%${filters.type}%`);
      }
      if (filters.date_from) {
        query += ` AND scheduled_date >= $${idx++}`;
        params.push(filters.date_from);
      }
      if (filters.date_to) {
        query += ` AND scheduled_date <= $${idx++}`;
        params.push(filters.date_to);
      }

      // Apply sorting
      const allowedSortFields = ['scheduled_date', 'created_on', 'alloted_points', 'alloted_berries', 'name', 'type', 'venue'];
      const sortBy = allowedSortFields.includes(sorting.sortBy) ? sorting.sortBy : 'scheduled_date';
      const order = sorting.order === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sortBy} ${order}`;

      // Apply pagination
      if (pagination.limit) {
        query += ` LIMIT $${idx++}`;
        params.push(pagination.limit);
      }
      if (pagination.offset) {
        query += ` OFFSET $${idx++}`;
        params.push(pagination.offset);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findAll: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM bounty WHERE id = $1 AND is_active = TRUE';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Database error in findById: ${error.message}`);
    }
  }

  async findUpcoming() {
    try {
      const query = 'SELECT * FROM bounty WHERE is_active = TRUE AND scheduled_date > NOW() ORDER BY scheduled_date ASC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findUpcoming: ${error.message}`);
    }
  }

  async findOngoing() {
    try {
      const query = 'SELECT * FROM bounty WHERE is_active = TRUE AND DATE(scheduled_date) = CURRENT_DATE ORDER BY scheduled_date ASC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findOngoing: ${error.message}`);
    }
  }

  async findCompletedByUser(userId) {
    try {
      const query = `
        SELECT b.* FROM bounty b 
        JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id 
        WHERE b.is_active = TRUE AND ubp.user_id = $1 AND ubp.status = $2
        ORDER BY b.scheduled_date DESC
      `;
      const result = await pool.query(query, [userId, 'completed']);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findCompletedByUser: ${error.message}`);
    }
  }

  async findTrending() {
    try {
      const query = `
        SELECT
          b.*,
          COUNT(ubp.id) AS total_participants,
          SUM(CASE WHEN ubp.created_on >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) AS recent_participants,
          SUM(CASE WHEN ubp.created_on >= NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) AS registration_rate_24h,
          (SUM(CASE WHEN ubp.created_on >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) * 3) +
          (COUNT(ubp.id) * 1) +
          (SUM(CASE WHEN ubp.created_on >= NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) * 4) +
          (CASE WHEN b.scheduled_date > NOW() THEN 5 ELSE 0 END) +
          (CASE WHEN b.created_on >= NOW() - INTERVAL '3 days' THEN 2 ELSE 0 END) AS trending_score
        FROM bounty b
        LEFT JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id
        WHERE b.is_active = TRUE
        GROUP BY b.id
        ORDER BY trending_score DESC, b.scheduled_date ASC
        LIMIT 10
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findTrending: ${error.message}`);
    }
  }

  async create(bountyData) {
    try {
      const query = `
        INSERT INTO bounty (name, description, type, img_url, image_hash, alloted_points, alloted_berries, scheduled_date, venue, capacity, is_active, created_by, modified_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
        RETURNING *
      `;
      const values = [
        bountyData.name,
        bountyData.description,
        bountyData.type,
        bountyData.img_url,
        bountyData.image_hash,
        bountyData.alloted_points,
        bountyData.alloted_berries,
        bountyData.scheduled_date,
        bountyData.venue,
        bountyData.capacity,
        bountyData.is_active !== undefined ? bountyData.is_active : true,
        bountyData.created_by,
        bountyData.modified_by
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
      const query = `UPDATE bounty SET ${updateColumns.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, updateValues);
      
      if (result.rows.length === 0) {
        throw new Error('BOUNTY_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in update: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const query = 'UPDATE bounty SET is_active = FALSE WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('BOUNTY_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database error in delete: ${error.message}`);
    }
  }

  async getRegisteredBounties(userId) {
    try {
      const query = 'SELECT bounty_id FROM user_bounty_participation WHERE user_id = $1';
      const result = await pool.query(query, [userId]);
      return result.rows.map(row => row.bounty_id);
    } catch (error) {
      throw new Error(`Database error in getRegisteredBounties: ${error.message}`);
    }
  }

  async searchByName(name) {
    try {
      const query = 'SELECT * FROM bounty WHERE name ILIKE $1 AND is_active = TRUE ORDER BY scheduled_date ASC';
      const result = await pool.query(query, [`%${name}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in searchByName: ${error.message}`);
    }
  }

  async findByType(type) {
    try {
      const query = 'SELECT * FROM bounty WHERE type ILIKE $1 AND is_active = TRUE ORDER BY scheduled_date ASC';
      const result = await pool.query(query, [`%${type}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByType: ${error.message}`);
    }
  }

  async findByVenue(venue) {
    try {
      const query = 'SELECT * FROM bounty WHERE venue ILIKE $1 AND is_active = TRUE ORDER BY scheduled_date ASC';
      const result = await pool.query(query, [`%${venue}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findByVenue: ${error.message}`);
    }
  }

  async findWithRegistrationStatus(userId) {
    try {
      const query = `
        SELECT b.*, 
               CASE WHEN ubp.bounty_id IS NOT NULL THEN true ELSE false END as is_registered
        FROM bounty b
        LEFT JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id AND ubp.user_id = $1
        WHERE b.is_active = TRUE AND b.scheduled_date > NOW()
        ORDER BY b.scheduled_date ASC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findWithRegistrationStatus: ${error.message}`);
    }
  }

  async findRegisteredByUser(userId) {
    try {
      const query = `
        SELECT b.* 
        FROM bounty b
        JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id
        WHERE b.is_active = TRUE AND ubp.user_id = $1 AND ubp.status = 'registered'
        ORDER BY b.scheduled_date ASC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Database error in findRegisteredByUser: ${error.message}`);
    }
  }
}

module.exports = new BountyRepository(); 