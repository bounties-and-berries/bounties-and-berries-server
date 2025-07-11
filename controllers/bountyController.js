const pool = require('../config/db');

// Get all bounties
exports.getAllBounties = async (req, res) => {
  try {
    const { name, venue, type, date_from, date_to, status } = req.query;
    let query = 'SELECT * FROM bounty WHERE is_active = TRUE';
    const params = [];
    let idx = 1;

    if (status === 'upcoming') {
      query += ' AND scheduled_date > NOW()';
    } else if (status === 'ongoing') {
      query += ' AND DATE(scheduled_date) = CURRENT_DATE';
    } else if (status === 'completed') {
      query += ' AND scheduled_date < NOW()';
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

    query += ' ORDER BY scheduled_date ASC';

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
    img_url,
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
    // Ignore any client-sent created_on or modified_on
    const result = await pool.query(
      `INSERT INTO bounty (name, description, type, img_url, alloted_points, alloted_berries, scheduled_date, venue, capacity, is_active, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [name, description, type, img_url, alloted_points, alloted_berries, scheduled_date, venue, capacity, is_active, created_by, modified_by]
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
    img_url,
    alloted_points,
    alloted_berries,
    scheduled_date,
    venue,
    capacity,
    is_active,
    modified_by
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bounty SET name=$1, description=$2, type=$3, img_url=$4, alloted_points=$5, alloted_berries=$6, scheduled_date=$7, venue=$8, capacity=$9, is_active=$10, modified_by=$11, modified_on=NOW() WHERE id=$12 RETURNING *`,
      [name, description, type, img_url, alloted_points, alloted_berries, scheduled_date, venue, capacity, is_active, modified_by, id]
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