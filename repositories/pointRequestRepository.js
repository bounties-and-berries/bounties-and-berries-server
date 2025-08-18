const pool = require('../config/db');

class PointRequestRepository {
  async findAll(filters = {}, pagination = {}, sorting = {}) {
    try {
      let query = `
        SELECT pr.*, 
               s.name as student_name,
               s.mobile as student_mobile,
               f.name as faculty_name,
               f.mobile as faculty_mobile,
               c.name as college_name
        FROM point_request pr
        LEFT JOIN "user" s ON pr.student_id = s.id
        LEFT JOIN "user" f ON pr.faculty_id = f.id
        LEFT JOIN college c ON s.college_id = c.id
        WHERE 1=1
      `;
      const params = [];
      let idx = 1;

      // Apply filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query += ` AND pr.status = ANY($${idx++})`;
          params.push(filters.status);
        } else {
          query += ` AND pr.status = $${idx++}`;
          params.push(filters.status);
        }
      }

      if (filters.category) {
        if (Array.isArray(filters.category)) {
          query += ` AND pr.category = ANY($${idx++})`;
          params.push(filters.category);
        } else {
          query += ` AND pr.category = $${idx++}`;
          params.push(filters.category);
        }
      }

      if (filters.student_id) {
        query += ` AND pr.student_id = $${idx++}`;
        params.push(filters.student_id);
      }

      if (filters.faculty_id) {
        query += ` AND pr.faculty_id = $${idx++}`;
        params.push(filters.faculty_id);
      }

      if (filters.college_id) {
        query += ` AND s.college_id = $${idx++}`;
        params.push(filters.college_id);
      }

      if (filters.activity_title) {
        query += ` AND pr.activity_title ILIKE $${idx++}`;
        params.push(`%${filters.activity_title}%`);
      }

      if (filters.date_from) {
        query += ` AND pr.activity_date >= $${idx++}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ` AND pr.activity_date <= $${idx++}`;
        params.push(filters.date_to);
      }

      if (filters.submission_date_from) {
        query += ` AND pr.submission_date >= $${idx++}`;
        params.push(filters.submission_date_from);
      }

      if (filters.submission_date_to) {
        query += ` AND pr.submission_date <= $${idx++}`;
        params.push(filters.submission_date_to);
      }

      if (filters.points_min) {
        query += ` AND pr.points_requested >= $${idx++}`;
        params.push(filters.points_min);
      }

      if (filters.points_max) {
        query += ` AND pr.points_requested <= $${idx++}`;
        params.push(filters.points_max);
      }

      // Apply sorting
      const allowedSortFields = ['created_on', 'submission_date', 'activity_date', 'points_requested', 'activity_title', 'status', 'category'];
      const sortBy = allowedSortFields.includes(sorting.sortBy) ? `pr.${sorting.sortBy}` : 'pr.created_on';
      const order = sorting.order === 'asc' ? 'ASC' : 'DESC';
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
      throw new Error(`Repository error in findAll: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const query = `
        SELECT pr.id, pr.student_id, pr.faculty_id, pr.activity_title, pr.category,
               pr.description, pr.activity_date, pr.proof_url, pr.proof_description,
               pr.proof_file_hash, pr.points_requested, pr.berries_requested,
               pr.status, pr.faculty_comment
        FROM point_request pr
        WHERE pr.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Repository error in findById: ${error.message}`);
    }
  }

  async create(requestData) {
    try {
      const query = `
        INSERT INTO point_request (
          student_id, activity_title, category, description,
          activity_date, proof_description, points_requested, berries_requested,
          status, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, student_id, faculty_id, activity_title, category, description,
                  activity_date, proof_description, points_requested, berries_requested,
                  status, faculty_comment
      `;
      
      const values = [
        requestData.student_id,
        requestData.activity_title,
        requestData.category,
        requestData.description,
        requestData.activity_date,
        requestData.proof_description,
        requestData.points_requested,
        requestData.berries_requested,
        requestData.status || 'draft',
        requestData.created_by,
        requestData.modified_by
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Repository error in create: ${error.message}`);
    }
  }

  async update(id, updateData) {
    try {
      console.log('Repository update - Input:', { id, updateData });
      
      const setClause = Object.keys(updateData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE point_request 
        SET ${setClause}, modified_on = CURRENT_TIMESTAMP 
        WHERE id = $1 
        RETURNING *
      `;
      
      const values = [id, ...Object.values(updateData)];
      console.log('Repository update - Query:', query);
      console.log('Repository update - Values:', values);
      
      const result = await pool.query(query, values);
      console.log('Repository update - Database result:', result.rows[0]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Repository update - Error:', error.message);
      throw new Error(`Repository error in update: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const query = 'DELETE FROM point_request WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Repository error in delete: ${error.message}`);
    }
  }

  // Specialized methods for different use cases
  async findPendingForFaculty(facultyId, filters = {}) {
    try {
      let query = `
        SELECT pr.*, 
               s.name as student_name,
               s.mobile as student_mobile,
               c.name as college_name
        FROM point_request pr
        LEFT JOIN "user" s ON pr.student_id = s.id
        LEFT JOIN college c ON s.college_id = c.id
        WHERE pr.status = 'pending'
      `;
      const params = [];
      let idx = 1;

      if (facultyId) {
        query += ` AND (pr.faculty_id = $${idx++} OR pr.faculty_id IS NULL)`;
        params.push(facultyId);
      }

      if (filters.category) {
        query += ` AND pr.category = $${idx++}`;
        params.push(filters.category);
      }

      if (filters.priority) {
        // Priority based on submission time - calculated in service layer
        if (filters.priority === 'urgent') {
          query += ` AND pr.submission_date <= NOW() - INTERVAL '3 days'`;
        } else if (filters.priority === 'high') {
          query += ` AND pr.submission_date <= NOW() - INTERVAL '2 days' AND pr.submission_date > NOW() - INTERVAL '3 days'`;
        }
      }

      query += ` ORDER BY pr.submission_date ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Repository error in findPendingForFaculty: ${error.message}`);
    }
  }

  async findAssignedToFaculty(facultyId) {
    try {
      const query = `
        SELECT pr.*, 
               s.name as student_name,
               s.mobile as student_mobile,
               c.name as college_name
        FROM point_request pr
        LEFT JOIN "user" s ON pr.student_id = s.id
        LEFT JOIN college c ON s.college_id = c.id
        WHERE pr.faculty_id = $1
        ORDER BY 
          CASE 
            WHEN pr.status = 'pending' THEN 1
            WHEN pr.status = 'approved' THEN 2
            WHEN pr.status = 'denied' THEN 3
            WHEN pr.status = 'cancelled' THEN 4
            ELSE 5
          END,
          pr.created_on DESC
      `;
      
      const result = await pool.query(query, [facultyId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Repository error in findAssignedToFaculty: ${error.message}`);
    }
  }

  async findByStudentId(studentId, filters = {}) {
    try {
      let query = `
        SELECT pr.*, 
               f.name as faculty_name
        FROM point_request pr
        LEFT JOIN "user" f ON pr.faculty_id = f.id
        WHERE pr.student_id = $1
      `;
      const params = [studentId];
      let idx = 2;

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query += ` AND pr.status = ANY($${idx++})`;
          params.push(filters.status);
        } else {
          query += ` AND pr.status = $${idx++}`;
          params.push(filters.status);
        }
      }

      if (filters.category) {
        query += ` AND pr.category = $${idx++}`;
        params.push(filters.category);
      }

      query += ` ORDER BY pr.created_on DESC`;

      if (filters.limit) {
        query += ` LIMIT $${idx++}`;
        params.push(filters.limit);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Repository error in findByStudentId: ${error.message}`);
    }
  }

  async countPendingByStudent(studentId) {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM point_request 
        WHERE student_id = $1 AND status = 'pending'
      `;
      
      const result = await pool.query(query, [studentId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Repository error in countPendingByStudent: ${error.message}`);
    }
  }

  async checkDuplicateActivity(studentId, activityTitle) {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM point_request 
        WHERE student_id = $1 
          AND LOWER(activity_title) = LOWER($2)
          AND status NOT IN ('denied', 'cancelled')
      `;
      
      const result = await pool.query(query, [studentId, activityTitle]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw new Error(`Repository error in checkDuplicateActivity: ${error.message}`);
    }
  }

  async getFacultyWorkloads(facultyIds) {
    try {
      const query = `
        SELECT 
          faculty_id, 
          COUNT(*) as pending_count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - submission_date))/3600), 0) as avg_response_time_hours
        FROM point_request 
        WHERE faculty_id = ANY($1) AND status = 'pending'
        GROUP BY faculty_id
        ORDER BY pending_count ASC, avg_response_time_hours DESC
      `;
      
      const result = await pool.query(query, [facultyIds]);
      return result.rows;
    } catch (error) {
      throw new Error(`Repository error in getFacultyWorkloads: ${error.message}`);
    }
  }

  async getStatistics(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      let idx = 1;

      if (filters.date_from) {
        whereClause += ` AND created_on >= $${idx++}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ` AND created_on <= $${idx++}`;
        params.push(filters.date_to);
      }

      if (filters.college_id) {
        whereClause += ` AND student_id IN (SELECT id FROM "user" WHERE college_id = $${idx++})`;
        params.push(filters.college_id);
      }

      const query = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN status = 'denied' THEN 1 END) as denied_requests,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_requests,
          COALESCE(AVG(CASE WHEN status = 'approved' THEN points_awarded END), 0) as avg_points_awarded,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN points_awarded END), 0) as total_points_awarded,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN berries_awarded END), 0) as total_berries_awarded,
          ROUND(
            COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN status IN ('approved', 'denied') THEN 1 END), 0), 
            2
          ) as approval_rate_percent
        FROM point_request 
        ${whereClause}
      `;
      
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Repository error in getStatistics: ${error.message}`);
    }
  }

  async getCategoryStatistics(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      let idx = 1;

      if (filters.date_from) {
        whereClause += ` AND created_on >= $${idx++}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ` AND created_on <= $${idx++}`;
        params.push(filters.date_to);
      }

      const query = `
        SELECT 
          category,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
          COALESCE(AVG(CASE WHEN status = 'approved' THEN points_awarded END), 0) as avg_points_awarded,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN points_awarded END), 0) as total_points_awarded
        FROM point_request 
        ${whereClause}
        GROUP BY category
        ORDER BY total_requests DESC
      `;
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Repository error in getCategoryStatistics: ${error.message}`);
    }
  }
}

module.exports = new PointRequestRepository();
