const pool = require('../config/db');
const { getFileHash } = require('../fileHash');
const path = require('path');
const fs = require('fs');

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

// Create a reward (only creators)
exports.createReward = async (req, res) => {
  try {
    const { name, description, berries_spent, expiry_date, ...otherFields } = req.body;
    if (!name || !berries_spent) {
      return res.status(400).json({ error: 'Name and berries_spent are required' });
    }
    const createdBy = req.user.id;
    let image_hash = null;
    let img_url = null;
    if (req.file) {
      img_url = `/uploads/rewards_imgs/${req.file.filename}`;
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
      `INSERT INTO reward (name, description, berries_spent, expiry_date, img_url, image_hash, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [name, description, berries_spent, expiry_date, img_url, image_hash, createdBy]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Update a reward (only creator can update)
exports.updateReward = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    // Check if reward exists and is owned by the user
    const rewardResult = await pool.query('SELECT * FROM reward WHERE id = $1', [id]);
    if (rewardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    const reward = rewardResult.rows[0];
    if (reward.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden: not the creator' });
    }
    const { name, description, berries_spent, expiry_date, ...otherFields } = req.body;
    let image_hash = null;
    let img_url = null;
    if (req.file) {
      img_url = `/uploads/rewards_imgs/${req.file.filename}`;
      const fileBuffer = fs.readFileSync(req.file.path);
      image_hash = getFileHash(fileBuffer);
      // Delete old image if present
      if (reward.img_url) {
        const oldPath = path.join(__dirname, '..', reward.img_url);
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
    } else {
      img_url = reward.img_url;
    }
    const result = await pool.query(
      `UPDATE reward SET name = $1, description = $2, berries_spent = $3, expiry_date = $4, img_url = $5, image_hash = $6, modified_by = $7, modified_on = NOW() WHERE id = $8 RETURNING *`,
      [name || reward.name, description || reward.description, berries_spent || reward.berries_spent, expiry_date || reward.expiry_date, img_url, image_hash, userId, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Delete a reward (only creator can delete)
exports.deleteReward = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    // Check if reward exists and is owned by the user
    const rewardResult = await pool.query('SELECT * FROM reward WHERE id = $1', [id]);
    if (rewardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    const reward = rewardResult.rows[0];
    if (reward.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden: not the creator' });
    }
    await pool.query('DELETE FROM reward WHERE id = $1', [id]);
    res.json({ message: 'Reward deleted successfully' });
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
    // 1. Check if user has already claimed this reward
    const existingClaim = await pool.query(
      'SELECT 1 FROM user_reward_claim WHERE user_id = $1 AND reward_id = $2',
      [userId, id]
    );
    if (existingClaim.rows.length > 0) {
      return res.status(400).json({ error: 'You have already claimed this reward' });
    }
    // 2. Calculate total berries earned
    const earnedResult = await pool.query(
      'SELECT COALESCE(SUM(berries_earned), 0) AS total_earned FROM user_bounty_participation WHERE user_id = $1',
      [userId]
    );
    const totalEarned = parseInt(earnedResult.rows[0].total_earned, 10);
    // 3. Calculate total berries spent
    const spentResult = await pool.query(
      'SELECT COALESCE(SUM(berries_spent), 0) AS total_spent FROM user_reward_claim WHERE user_id = $1',
      [userId]
    );
    const totalSpent = parseInt(spentResult.rows[0].total_spent, 10);
    // 4. Calculate available berries
    const availableBerries = totalEarned - totalSpent;
    // 5. Get reward cost (berries_required)
    const rewardResult = await pool.query('SELECT * FROM reward WHERE id = $1', [id]);
    if (rewardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    const reward = rewardResult.rows[0];
    // 6. Check if user has enough berries
    if (availableBerries < reward.berries_required) {
      return res.status(400).json({ error: 'Not enough berries to claim this reward' });
    }
    // 7. Log the claim
    await pool.query('BEGIN');
    const claimResult = await pool.query(
      'INSERT INTO user_reward_claim (user_id, reward_id, berries_spent, redeemable_code, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, reward.id, reward.berries_required, Math.random().toString(36).substring(2, 10).toUpperCase(), userId, userId]
    );
    await pool.query('COMMIT');
    res.status(201).json({
      message: 'Reward claimed successfully',
      reward: { id: reward.id, name: reward.name, cost: reward.berries_required },
      remaining_berries: availableBerries - reward.berries_required,
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
      `SELECT urc.id as claim_id, r.id as reward_id, r.name, urc.created_on, urc.redeemable_code
       FROM user_reward_claim urc
       JOIN reward r ON urc.reward_id = r.id
       WHERE urc.user_id = $1
       ORDER BY urc.created_on DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Unified search/filter endpoint for rewards
exports.searchAndFilterRewards = async (req, res) => {
  try {
    const {
      filters = {},
      sortBy = 'name',
      sortOrder = 'asc',
      pageNumber = 1,
      pageSize = 10
    } = req.body;

    let query = 'SELECT * FROM reward WHERE 1=1';
    const params = [];
    let idx = 1;

    // Example filters
    if (filters.name) {
      query += ` AND name ILIKE $${idx++}`;
      params.push(`%${filters.name}%`);
    }
    if (filters.expiryStart) {
      query += ` AND expiry_date >= $${idx++}`;
      params.push(filters.expiryStart);
    }
    if (filters.expiryEnd) {
      query += ` AND expiry_date <= $${idx++}`;
      params.push(filters.expiryEnd);
    }
    // Add more filters as needed

    // Sorting
    const allowedSortFields = ['name', 'expiry_date', 'berries_spent'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${order}`;

    // Pagination
    const limit = parseInt(pageSize, 10) || 10;
    const offset = ((parseInt(pageNumber, 10) || 1) - 1) * limit;
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM reward WHERE 1=1';
    let countParams = [];
    let countIdx = 1;
    if (filters.name) {
      countQuery += ` AND name ILIKE $${countIdx++}`;
      countParams.push(`%${filters.name}%`);
    }
    if (filters.expiryStart) {
      countQuery += ` AND expiry_date >= $${countIdx++}`;
      countParams.push(filters.expiryStart);
    }
    if (filters.expiryEnd) {
      countQuery += ` AND expiry_date <= $${countIdx++}`;
      countParams.push(filters.expiryEnd);
    }
    // Add more filters as needed

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);
    const totalResults = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalResults / limit);

    res.json({
      filters,
      results: result.rows,
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