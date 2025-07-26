const pool = require('../config/db');
const { getFileHash } = require('../fileHash');
const fs = require('fs');
const path = require('path');

// Get all bounties
exports.getAllBounties = async (req, res) => {
  try {
    const { name, venue, type, date_from, date_to, status } = req.query;
    let query = 'SELECT * FROM bounty WHERE is_active = TRUE';
    const params = [];
    let idx = 1;

    // Pagination
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    // Dynamic sorting
    const allowedSortFields = ['scheduled_date', 'created_on', 'alloted_points', 'alloted_berries', 'name', 'type', 'venue'];
    const sortBy = allowedSortFields.includes(req.query.sort_by) ? req.query.sort_by : 'scheduled_date';
    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    if (status === 'upcoming') {
      query += ' AND scheduled_date > NOW()';
    } else if (status === 'ongoing') {
      query += ' AND DATE(scheduled_date) = CURRENT_DATE';
    } else if (status === 'completed') {
      query = 'SELECT b.* FROM bounty b JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id WHERE b.is_active = TRUE AND ubp.user_id = $' + (idx++) + ' AND ubp.status = $' + (idx++);
      params.push(req.user.id, 'completed');
    } else if (status === 'trending') {
      // Trending: weighted score based on recent and total participants, registration rate, upcoming, and newness
      const trendingQuery = `
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
        LIMIT 10;
      `;
      const result = await pool.query(trendingQuery);
      return res.json(result.rows);
    }

    if (name) {
      query += ` AND name ILIKE $${idx++}`;
      params.push(`%${name}%`);
    }
    if (venue) {
      query += ` AND venue ILIKE $${idx++}`;
      params.push(`%${venue}%`);
    }
    if (type) {
      query += ` AND type ILIKE $${idx++}`;
      params.push(`%${type}%`);
    }
    if (date_from) {
      query += ` AND scheduled_date >= $${idx++}`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND scheduled_date <= $${idx++}`;
      params.push(date_to);
    }

    query += ` ORDER BY ${sortBy} ${order}`;
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Create a new bounty
exports.createBounty = async (req, res) => {
  const {
    name,
    description,
    type,
    alloted_points,
    alloted_berries,
    scheduled_date,
    venue,
    capacity,
    is_active,
    created_by,
    modified_by
  } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    let image_hash = null;
    let img_url = null;
    if (req.file) {
      img_url = `/uploads/bounty_imgs/${req.file.filename}`;
      const fileBuffer = fs.readFileSync(req.file.path);
      image_hash = getFileHash(fileBuffer);
    } else if (req.body.img_url) {
      img_url = req.body.img_url;
      try {
        const fileBuffer = fs.readFileSync('.' + img_url);
        image_hash = getFileHash(fileBuffer);
      } catch (e) {
        image_hash = null;
      }
    }
    const result = await pool.query(
      `INSERT INTO bounty (name, description, type, img_url, image_hash, alloted_points, alloted_berries, scheduled_date, venue, capacity, is_active, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [name, description, type, img_url, image_hash, alloted_points, alloted_berries, scheduled_date, venue, capacity, is_active, created_by, modified_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      res.status(409).json({ error: 'A bounty with this name already exists.' });
    } else {
      res.status(500).json({ error: 'Database error', details: err.message });
    }
  }
};

// Get a bounty by ID
exports.getBountyById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM bounty WHERE id = $1 AND is_active = TRUE', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Update a bounty
exports.updateBounty = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    type,
    alloted_points,
    alloted_berries,
    scheduled_date,
    venue,
    capacity,
    is_active,
    modified_by
  } = req.body;
  try {
    let image_hash = null;
    let img_url = null;
    // Get old image URL
    const bountyResult = await pool.query('SELECT img_url FROM bounty WHERE id = $1', [id]);
    if (req.file) {
      img_url = `/uploads/bounty_imgs/${req.file.filename}`;
      const fileBuffer = fs.readFileSync(req.file.path);
      image_hash = getFileHash(fileBuffer);
      // Delete old image if present
      if (bountyResult.rows.length > 0 && bountyResult.rows[0].img_url) {
        const oldPath = path.join(__dirname, '..', bountyResult.rows[0].img_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    } else if (req.body.img_url) {
      img_url = req.body.img_url;
      try {
        const fileBuffer = fs.readFileSync('.' + img_url);
        image_hash = getFileHash(fileBuffer);
      } catch (e) {
        image_hash = null;
      }
    } else if (bountyResult.rows.length > 0) {
      img_url = bountyResult.rows[0].img_url;
    }
    const result = await pool.query(
      `UPDATE bounty SET name=$1, description=$2, type=$3, img_url=$4, image_hash=$5, alloted_points=$6, alloted_berries=$7, scheduled_date=$8, venue=$9, capacity=$10, is_active=$11, modified_by=$12, modified_on=NOW() WHERE id=$13 RETURNING *`,
      [name, description, type, img_url, image_hash, alloted_points, alloted_berries, scheduled_date, venue, capacity, is_active, modified_by, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Delete a bounty
exports.deleteBounty = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE bounty SET is_active = FALSE, modified_on = NOW() WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    res.json({ message: 'Bounty soft deleted', bounty: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// PATCH: Update a bounty by name (partial update)
exports.patchBountyByName = async (req, res) => {
  const { name } = req.params;
  if (!name) {
    return res.status(400).json({ error: 'Bounty name is required in the URL.' });
  }
  try {
    // Fetch the existing bounty
    const existing = await pool.query('SELECT * FROM bounty WHERE name = $1', [name]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    const old = existing.rows[0];
    // Ignore any client-sent created_on or modified_on
    const {
      description,
      type,
      img_url,
      alloted_points,
      alloted_berries,
      scheduled_date,
      venue,
      capacity,
      is_active,
      modified_by
    } = req.body;
    // Use provided values or fallback to old values
    const updated = {
      description: description !== undefined ? description : old.description,
      type: type !== undefined ? type : old.type,
      img_url: img_url !== undefined ? img_url : old.img_url,
      alloted_points: alloted_points !== undefined ? alloted_points : old.alloted_points,
      alloted_berries: alloted_berries !== undefined ? alloted_berries : old.alloted_berries,
      scheduled_date: scheduled_date !== undefined ? scheduled_date : old.scheduled_date,
      venue: venue !== undefined ? venue : old.venue,
      capacity: capacity !== undefined ? capacity : old.capacity,
      is_active: is_active !== undefined ? is_active : old.is_active,
      modified_by: modified_by !== undefined ? modified_by : old.modified_by
    };
    // Update the bounty
    const result = await pool.query(
      `UPDATE bounty SET description=$1, type=$2, img_url=$3, alloted_points=$4, alloted_berries=$5, scheduled_date=$6, venue=$7, capacity=$8, is_active=$9, modified_by=$10, modified_on=NOW() WHERE name=$11 RETURNING *`,
      [
        updated.description,
        updated.type,
        updated.img_url,
        updated.alloted_points,
        updated.alloted_berries,
        updated.scheduled_date,
        updated.venue,
        updated.capacity,
        updated.is_active,
        updated.modified_by,
        name
      ]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Get all bounties (including soft deleted) - Admin use
exports.getAllBountiesAdmin = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bounty ORDER BY scheduled_date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Unified search/filter endpoint for bounties
exports.searchAndFilterBounties = async (req, res) => {
  try {
    const {
      filters = {},
      sortBy = 'name',
      sortOrder = 'asc',
      pageNumber = 1,
      pageSize = 10
    } = req.body;

    let query = 'SELECT * FROM bounty WHERE is_active = TRUE';
    const params = [];
    let idx = 1;

    // Status filter logic
    if (filters.status === 'upcoming') {
      query += ' AND scheduled_date > NOW()';
    } else if (filters.status === 'ongoing') {
      query += ' AND DATE(scheduled_date) = CURRENT_DATE';
    } else if (filters.status === 'completed') {
      query = 'SELECT b.* FROM bounty b JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id WHERE b.is_active = TRUE AND ubp.user_id = $' + (idx++) + ' AND ubp.status = $' + (idx++);
      params.push(req.user.id, 'completed');
    } else if (filters.status === 'registered') {
      query = 'SELECT b.* FROM bounty b JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id WHERE b.is_active = TRUE AND ubp.user_id = $' + (idx++);
      params.push(req.user.id);
    } else if (filters.status === 'trending') {
      // Trending: weighted score based on recent and total participants, registration rate, upcoming, and newness
      const trendingQuery = `
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
        LIMIT $1 OFFSET $2;
      `;
      const limit = parseInt(pageSize, 10) || 10;
      const offset = ((parseInt(pageNumber, 10) || 1) - 1) * limit;
      const result = await pool.query(trendingQuery, [limit, offset]);
      // Get total count for trending (without LIMIT/OFFSET)
      const countTrendingQuery = `
        SELECT COUNT(*) FROM (
          SELECT b.id
          FROM bounty b
          LEFT JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id
          WHERE b.is_active = TRUE
          GROUP BY b.id
        ) AS trending_bounties;
      `;
      const countResult = await pool.query(countTrendingQuery);
      const totalResults = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalResults / limit);
      return res.json({
        filters,
        results: result.rows,
        sortBy: 'trending_score',
        sortOrder: 'desc',
        pageNumber: parseInt(pageNumber, 10) || 1,
        pageSize: limit,
        totalResults,
        totalPages
      });
    }

    // Other filters
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
    if (filters.scheduledStart) {
      query += ` AND scheduled_date >= $${idx++}`;
      params.push(filters.scheduledStart);
    }
    if (filters.scheduledEnd) {
      query += ` AND scheduled_date <= $${idx++}`;
      params.push(filters.scheduledEnd);
    }

    // Sorting
    const allowedSortFields = ['scheduled_date', 'created_on', 'alloted_points', 'alloted_berries', 'name', 'type', 'venue'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${order}`;

    // Pagination
    const limit = parseInt(pageSize, 10) || 10;
    const offset = ((parseInt(pageNumber, 10) || 1) - 1) * limit;
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM bounty WHERE is_active = TRUE';
    let countParams = [];
    let countIdx = 1;
    // Status filter for count
    if (filters.status === 'upcoming') {
      countQuery += ' AND scheduled_date > NOW()';
    } else if (filters.status === 'ongoing') {
      countQuery += ' AND DATE(scheduled_date) = CURRENT_DATE';
    } else if (filters.status === 'completed') {
      countQuery = 'SELECT COUNT(b.*) FROM bounty b JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id WHERE b.is_active = TRUE AND ubp.user_id = $' + (countIdx++) + ' AND ubp.status = $' + (countIdx++);
      countParams.push(req.user.id, 'completed');
    } else if (filters.status === 'registered') {
      countQuery = 'SELECT COUNT(b.*) FROM bounty b JOIN user_bounty_participation ubp ON b.id = ubp.bounty_id WHERE b.is_active = TRUE AND ubp.user_id = $' + (countIdx++);
      countParams.push(req.user.id);
    }
    if (filters.name) {
      countQuery += ` AND name ILIKE $${countIdx++}`;
      countParams.push(`%${filters.name}%`);
    }
    if (filters.venue) {
      countQuery += ` AND venue ILIKE $${countIdx++}`;
      countParams.push(`%${filters.venue}%`);
    }
    if (filters.type) {
      countQuery += ` AND type ILIKE $${countIdx++}`;
      countParams.push(`%${filters.type}%`);
    }
    if (filters.scheduledStart) {
      countQuery += ` AND scheduled_date >= $${countIdx++}`;
      countParams.push(filters.scheduledStart);
    }
    if (filters.scheduledEnd) {
      countQuery += ` AND scheduled_date <= $${countIdx++}`;
      countParams.push(filters.scheduledEnd);
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);
    const totalResults = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalResults / limit);

    // If status is 'upcoming', add is_registered field to each bounty
    let resultsWithRegistration = result.rows;
    if (filters.status === 'upcoming' && req.user && req.user.id) {
      // Get all bounty_ids the user is registered for
      const regRes = await pool.query(
        'SELECT bounty_id FROM user_bounty_participation WHERE user_id = $1',
        [req.user.id]
      );
      const registeredIds = new Set(regRes.rows.map(row => row.bounty_id));
      resultsWithRegistration = result.rows.map(bounty => ({
        ...bounty,
        is_registered: registeredIds.has(bounty.id)
      }));
    }

    res.json({
      filters,
      results: resultsWithRegistration,
      sortBy: sortField,
      sortOrder: order.toLowerCase(),
      pageNumber: parseInt(pageNumber, 10) || 1,
      pageSize: limit,
      totalResults,
      totalPages
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Register for a bounty
exports.registerForBounty = async (req, res) => {
  const userId = req.user.id;
  const bountyId = req.params.bountyId;

  // 1. Check for double registration
  const existing = await pool.query(
    'SELECT 1 FROM user_bounty_participation WHERE user_id = $1 AND bounty_id = $2',
    [userId, bountyId]
  );
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: 'Already registered for this bounty' });
  }

  // 2. Check if bounty is expired or inactive
  const bountyResult = await pool.query('SELECT * FROM bounty WHERE id = $1', [bountyId]);
  if (bountyResult.rows.length === 0) {
    return res.status(404).json({ error: 'Bounty not found' });
  }
  const bounty = bountyResult.rows[0];
  if (!bounty.is_active || new Date(bounty.scheduled_date) < new Date()) {
    return res.status(400).json({ error: 'Cannot register for expired or inactive bounty' });
  }

  // 3. Register
  await pool.query(
    'INSERT INTO user_bounty_participation (user_id, bounty_id, status, created_by, modified_by) VALUES ($1, $2, $3, $4, $5)',
    [userId, bountyId, 'registered', userId, userId]
  );

  // 4. Fetch all registered bounties for the user
  const registeredBountiesResult = await pool.query(
    'SELECT bounty_id FROM user_bounty_participation WHERE user_id = $1',
    [userId]
  );
  const registeredBounties = registeredBountiesResult.rows.map(row => row.bounty_id);

  // 5. Respond
  res.status(201).json({
    message: 'registered successfully',
    registeredBounties
  });
}; 