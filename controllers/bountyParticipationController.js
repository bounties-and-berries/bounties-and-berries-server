const pool = require('../config/db');

// CREATE
exports.createParticipation = async (req, res) => {
  const { user_id, bounty_id, points_earned, berries_earned, status } = req.body;
  await pool.query(
    'INSERT INTO user_bounty_participation (user_id, bounty_id, points_earned, berries_earned, status, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6, $6)',
    [user_id, bounty_id, points_earned || 0, berries_earned || 0, status || 'registered', req.user.id]
  );
  res.status(201).json({ message: 'Participation created' });
};

// READ (list all)
exports.listParticipations = async (req, res) => {
  const result = await pool.query('SELECT * FROM user_bounty_participation');
  res.json(result.rows);
};

// UPDATE
exports.updateParticipation = async (req, res) => {
  const { id } = req.params;
  const { points_earned, berries_earned, status } = req.body;
  await pool.query(
    'UPDATE user_bounty_participation SET points_earned = $1, berries_earned = $2, status = $3, modified_by = $4, modified_on = NOW() WHERE id = $5',
    [points_earned, berries_earned, status, req.user.id, id]
  );
  res.json({ message: 'Participation updated' });
};

// DELETE (hard delete)
exports.deleteParticipation = async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM user_bounty_participation WHERE id = $1', [id]);
  res.json({ message: 'Participation deleted' });
};

// 1. Admin/Faculty: View all students in a specific bounty
exports.getBountyParticipants = async (req, res) => {
  const bountyId = req.params.bountyId;
  // Get bounty info
  const bountyResult = await pool.query('SELECT id, name FROM bounty WHERE id = $1', [bountyId]);
  if (bountyResult.rows.length === 0) {
    return res.status(404).json({ error: 'Bounty not found' });
  }
  const bounty = bountyResult.rows[0];
  // Get participants
  const participantsResult = await pool.query(
    `SELECT ubp.id as participation_id, u.id as user_id, u.name as student_name, ubp.status, ubp.points_earned, ubp.berries_earned
     FROM user_bounty_participation ubp
     JOIN "user" u ON ubp.user_id = u.id
     WHERE ubp.bounty_id = $1`,
    [bountyId]
  );
  res.json({
    bounty_id: bounty.id,
    bounty_name: bounty.name,
    participants: participantsResult.rows
  });
};

// 2. Student: View their own bounty participation
exports.getMyParticipations = async (req, res) => {
  const userId = req.user.id;
  // Get user info
  const userResult = await pool.query('SELECT id, name FROM "user" WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  const user = userResult.rows[0];
  // Get participations with bounty info
  const participationsResult = await pool.query(
    `SELECT ubp.id as participation_id, b.id as bounty_id, b.name as bounty_name, ubp.status, ubp.points_earned, ubp.berries_earned
     FROM user_bounty_participation ubp
     JOIN bounty b ON ubp.bounty_id = b.id
     WHERE ubp.user_id = $1`,
    [userId]
  );
  res.json({
    user_id: user.id,
    student_name: user.name,
    participations: participationsResult.rows
  });
}; 