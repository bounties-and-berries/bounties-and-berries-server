const { getFileHash } = require('../fileHash');
const path = require('path');
const fs = require('fs');
const rewardService = require('../services/rewardService');

// List all available rewards
exports.getAllRewards = async (req, res) => {
  try {
    const rewards = await rewardService.getAllRewards();
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rewards', details: err.message });
  }
};

// Get reward by ID
exports.getRewardById = async (req, res) => {
  try {
    const { id } = req.params;
    const reward = await rewardService.getRewardById(id);
    res.json(reward);
  } catch (err) {
    if (err.message.includes('REWARD_NOT_FOUND')) {
      res.status(404).json({ error: 'Reward not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch reward', details: err.message });
    }
  }
};

// Create a reward (only creators)
exports.createReward = async (req, res) => {
  try {
    const { name, description, berries_required, expiry_date, ...otherFields } = req.body;
    const createdBy = req.user.id;

    // Handle file upload
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

    const rewardData = {
      name,
      description,
      berries_required,
      expiry_date,
      img_url,
      image_hash,
      created_by: createdBy,
      modified_by: createdBy
    };

    const reward = await rewardService.createReward(rewardData);
    res.status(201).json(reward);
  } catch (err) {
    if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'Name and berries_required are required' });
    } else if (err.message.includes('BERRIES_REQUIRED_REQUIRED')) {
      res.status(400).json({ error: 'Berries required must be greater than 0' });
    } else if (err.message.includes('DUPLICATE_NAME')) {
      res.status(409).json({ error: 'A reward with this name already exists' });
    } else if (err.message.includes('INVALID_EXPIRY_DATE')) {
      res.status(400).json({ error: 'Expiry date cannot be in the past' });
    } else {
      res.status(500).json({ error: 'Failed to create reward', details: err.message });
    }
  }
};

// Update a reward (only creator can update)
exports.updateReward = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description, berries_required, expiry_date, ...otherFields } = req.body;

    // Handle file upload
    let image_hash = null;
    let img_url = null;
    
    // Get current reward to check existing image
    const currentReward = await rewardService.getRewardById(id);
    
    if (req.file) {
      img_url = `/uploads/rewards_imgs/${req.file.filename}`;
      const fileBuffer = fs.readFileSync(req.file.path);
      image_hash = getFileHash(fileBuffer);
      // Delete old image if present
      if (currentReward.img_url) {
        const oldPath = path.join(__dirname, '..', currentReward.img_url);
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
      img_url = currentReward.img_url;
      image_hash = currentReward.image_hash;
    }

    const updateData = {
      name,
      description,
      berries_required,
      expiry_date,
      img_url,
      image_hash,
      modified_by: userId
    };

    const reward = await rewardService.updateReward(id, updateData, userId);
    res.json(reward);
  } catch (err) {
    if (err.message.includes('REWARD_NOT_FOUND')) {
      res.status(404).json({ error: 'Reward not found' });
    } else if (err.message.includes('UNAUTHORIZED_UPDATE')) {
      res.status(403).json({ error: 'Forbidden: not the creator' });
    } else if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'Name is required' });
    } else if (err.message.includes('BERRIES_REQUIRED_REQUIRED')) {
      res.status(400).json({ error: 'Berries required must be greater than 0' });
    } else if (err.message.includes('DUPLICATE_NAME')) {
      res.status(409).json({ error: 'A reward with this name already exists' });
    } else if (err.message.includes('INVALID_EXPIRY_DATE')) {
      res.status(400).json({ error: 'Expiry date cannot be in the past' });
    } else {
      res.status(500).json({ error: 'Failed to update reward', details: err.message });
    }
  }
};

// Delete a reward (only creator can delete)
exports.deleteReward = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const reward = await rewardService.deleteReward(id, userId);
    res.json({ message: 'Reward deleted successfully', reward });
  } catch (err) {
    if (err.message.includes('REWARD_NOT_FOUND')) {
      res.status(404).json({ error: 'Reward not found' });
    } else if (err.message.includes('UNAUTHORIZED_DELETE')) {
      res.status(403).json({ error: 'Forbidden: not the creator' });
    } else {
      res.status(500).json({ error: 'Failed to delete reward', details: err.message });
    }
  }
};

// Claim a reward
exports.claimReward = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user can claim the reward
    const claimCheck = await rewardService.checkUserCanClaimReward(userId, id);
    
    if (!claimCheck.canClaim) {
      return res.status(400).json({ error: claimCheck.reason });
    }

    // This would require a new service method for claiming rewards
    // For now, we'll use the existing logic but move it to service layer later
    const pool = require('../config/db');
    
    // Calculate total berries earned from COMPLETED bounties only
    const earnedResult = await pool.query(
      'SELECT COALESCE(SUM(berries_earned), 0) AS total_earned FROM user_bounty_participation WHERE user_id = $1 AND status = $2',
      [userId, 'completed']
    );
    const totalEarned = parseInt(earnedResult.rows[0].total_earned, 10);
    
    // Calculate total berries spent
    const spentResult = await pool.query(
      'SELECT COALESCE(SUM(berries_spent), 0) AS total_spent FROM user_reward_claim WHERE user_id = $1',
      [userId]
    );
    const totalSpent = parseInt(spentResult.rows[0].total_spent, 10);
    
    // Calculate available berries
    const availableBerries = totalEarned - totalSpent;
    
    // Check if user has enough berries
    if (availableBerries < claimCheck.reward.berries_required) {
      return res.status(400).json({ error: 'Not enough berries to claim this reward' });
    }
    
    // Log the claim
    await pool.query('BEGIN');
    const claimResult = await pool.query(
      'INSERT INTO user_reward_claim (user_id, reward_id, berries_spent, redeemable_code, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, claimCheck.reward.id, claimCheck.reward.berries_required, Math.random().toString(36).substring(2, 10).toUpperCase(), userId, userId]
    );
    await pool.query('COMMIT');
    
    res.status(201).json({
      message: 'Reward claimed successfully',
      reward: { id: claimCheck.reward.id, name: claimCheck.reward.name, cost: claimCheck.reward.berries_required },
      remaining_berries: availableBerries - claimCheck.reward.berries_required,
      claim_id: claimResult.rows[0].id,
      redeem_code: claimResult.rows[0].redeemable_code
    });
  } catch (err) {
    const pool = require('../config/db');
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to claim reward', details: err.message });
  }
};

// List claimed rewards for the current user
exports.getClaimedRewards = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const claimedRewards = await rewardService.getClaimedRewards(userId);
    res.json(claimedRewards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claimed rewards', details: err.message });
  }
};

// Get rewards by creator
exports.getRewardsByCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const rewards = await rewardService.getRewardsByCreator(creatorId);
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rewards by creator', details: err.message });
  }
};

// Get available rewards
exports.getAvailableRewards = async (req, res) => {
  try {
    const rewards = await rewardService.getAvailableRewards();
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch available rewards', details: err.message });
  }
};

// Get expired rewards
exports.getExpiredRewards = async (req, res) => {
  try {
    const rewards = await rewardService.getExpiredRewards();
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expired rewards', details: err.message });
  }
};

// Search rewards by name
exports.searchRewardsByName = async (req, res) => {
  try {
    const { name } = req.query;
    const rewards = await rewardService.searchRewardsByName(name);
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search rewards', details: err.message });
  }
};

// Search rewards by description
exports.searchRewardsByDescription = async (req, res) => {
  try {
    const { description } = req.query;
    const rewards = await rewardService.searchRewardsByDescription(description);
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search rewards', details: err.message });
  }
};

// Search rewards by berries range
exports.searchRewardsByBerriesRange = async (req, res) => {
  try {
    const { min_berries, max_berries } = req.query;
    const rewards = await rewardService.searchRewardsByBerriesRange(
      min_berries ? parseInt(min_berries) : undefined,
      max_berries ? parseInt(max_berries) : undefined
    );
    res.json(rewards);
  } catch (err) {
    if (err.message.includes('INVALID_MIN_BERRIES')) {
      res.status(400).json({ error: 'Minimum berries cannot be negative' });
    } else if (err.message.includes('INVALID_MAX_BERRIES')) {
      res.status(400).json({ error: 'Maximum berries cannot be negative' });
    } else if (err.message.includes('INVALID_BERRIES_RANGE')) {
      res.status(400).json({ error: 'Minimum berries cannot be greater than maximum berries' });
    } else {
      res.status(500).json({ error: 'Failed to search rewards', details: err.message });
    }
  }
};

// Get expiring soon rewards
exports.getExpiringSoonRewards = async (req, res) => {
  try {
    const { days } = req.query;
    const rewards = await rewardService.getExpiringSoonRewards(days ? parseInt(days) : 7);
    res.json(rewards);
  } catch (err) {
    if (err.message.includes('INVALID_DAYS_PARAMETER')) {
      res.status(400).json({ error: 'Days parameter must be at least 1' });
    } else {
      res.status(500).json({ error: 'Failed to fetch expiring rewards', details: err.message });
    }
  }
};

// Get all rewards including expired
exports.getAllRewardsIncludingExpired = async (req, res) => {
  try {
    const rewards = await rewardService.getAllRewardsIncludingExpired();
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all rewards', details: err.message });
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

    // Use service method for search and filter
    const results = await rewardService.searchAndFilterRewards(filters);

    // Handle pagination manually since the service doesn't handle it yet
    const limit = parseInt(pageSize, 10) || 10;
    const offset = ((parseInt(pageNumber, 10) || 1) - 1) * limit;
    const paginatedResults = results.slice(offset, offset + limit);
    const totalResults = results.length;
    const totalPages = Math.ceil(totalResults / limit);

    res.json({
      filters,
      results: paginatedResults,
      sortBy,
      sortOrder: sortOrder.toLowerCase(),
      pageNumber: parseInt(pageNumber, 10) || 1,
      pageSize: limit,
      totalResults,
      totalPages
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search rewards', details: err.message });
  }
}; 