const pool = require('../config/db');

// CREATE
exports.createClaim = async (req, res) => {
  const { user_id, reward_id, berries_spent, redeemable_code } = req.body;
  await pool.query(
    'INSERT INTO user_reward_claim (user_id, reward_id, berries_spent, redeemable_code, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $5)',
    [user_id, reward_id, berries_spent, redeemable_code, req.user.id]
  );
  res.status(201).json({ message: 'Reward claim created' });
};

// READ (list all)
exports.listClaims = async (req, res) => {
  const result = await pool.query('SELECT * FROM user_reward_claim');
  res.json(result.rows);
};

// UPDATE
exports.updateClaim = async (req, res) => {
  const { id } = req.params;
  const { berries_spent, redeemable_code } = req.body;
  await pool.query(
    'UPDATE user_reward_claim SET berries_spent = $1, redeemable_code = $2, modified_by = $3, modified_on = NOW() WHERE id = $4',
    [berries_spent, redeemable_code, req.user.id, id]
  );
  res.json({ message: 'Reward claim updated' });
};

// DELETE (hard delete)
exports.deleteClaim = async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM user_reward_claim WHERE id = $1', [id]);
  res.json({ message: 'Reward claim deleted' });
}; 