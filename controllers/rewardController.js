const pool = require('../config/db');

// List all available rewards
exports.getAllRewards = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reward WHERE expiry_date IS NULL OR expiry_date >= NOW() ORDER BY expiry_date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Get reward by ID
exports.getRewardById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM reward WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Claim a reward
exports.claimReward = async (req, res) => {
  const { id } = req.params;
  const userId = req.user && req.user.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    // Get reward details
    const rewardResult = await pool.query('SELECT * FROM reward WHERE id = $1', [id]);
    if (rewardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    const reward = rewardResult.rows[0];
    // Get user berries
    const userResult = await pool.query('SELECT * FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];
    if (user.berries < reward.berries_spent) {
      return res.status(400).json({ error: 'Not enough berries to claim this reward' });
    }
    // Deduct berries and create claim
    await pool.query('BEGIN');
    await pool.query('UPDATE "user" SET berries = berries - $1 WHERE id = $2', [reward.berries_spent, userId]);
    const claimResult = await pool.query(
      'INSERT INTO user_reward_claim (user_id, reward_id, berries_spent, redeemable_code, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, reward.id, reward.berries_spent, Math.random().toString(36).substring(2, 10).toUpperCase(), userId, userId]
    );
    await pool.query('COMMIT');
    res.status(201).json({
      message: 'Reward claimed successfully',
      reward: { id: reward.id, name: reward.name, cost: reward.berries_spent },
      remaining_berries: user.berries - reward.berries_spent,
      claim_id: claimResult.rows[0].id,
      redeem_code: claimResult.rows[0].redeemable_code
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// List claimed rewards for the current user
exports.getClaimedRewards = async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pool.query(
      `SELECT urc.id as claim_id, r.id as reward_id, r.name, urc.claimed_on, urc.redeemable_code, urc.status
       FROM user_reward_claim urc
       JOIN reward r ON urc.reward_id = r.id
       WHERE urc.user_id = $1
       ORDER BY urc.claimed_on DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
}; 