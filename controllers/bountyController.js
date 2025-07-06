const pool = require('../config/db');

exports.getAllBounties = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bounties ORDER BY scheduled_date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

exports.createBounty = async (req, res) => {
  const { name, description, type, img_url, alloted_points, scheduled_date, venue, capacity, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO bounties (name, description, type, img_url, alloted_points, scheduled_date, venue, capacity, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, description, type, img_url, alloted_points, scheduled_date, venue, capacity, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

exports.getBountyById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM bounties WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

exports.updateBounty = async (req, res) => {
  const { id } = req.params;
  const { name, description, type, img_url, alloted_points, scheduled_date, venue, capacity, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bounties SET name=$1, description=$2, type=$3, img_url=$4, alloted_points=$5, scheduled_date=$6, venue=$7, capacity=$8, status=$9, updated_at=NOW() WHERE id=$10 RETURNING *`,
      [name, description, type, img_url, alloted_points, scheduled_date, venue, capacity, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

exports.deleteBounty = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM bounties WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    res.json({ message: 'Bounty deleted', bounty: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
}; 