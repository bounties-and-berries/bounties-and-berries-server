const { ApiError } = require('../middleware/errorHandler');
const pool = require('../config/db');

const submitQuery = async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      throw new ApiError('Subject and message are required', 400);
    }
    
    // Insert into DB
    const query = `
      INSERT INTO support_query (user_id, subject, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [req.user.id, subject, message];
    
    const result = await pool.query(query, values);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getAllQueries = async (req, res, next) => {
  try {
    const query = `
      SELECT sq.*, u.name as user_name, u.role as user_role 
      FROM support_query sq
      JOIN "user" u ON sq.user_id = u.id
      ORDER BY sq.created_at DESC
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitQuery, getAllQueries };
