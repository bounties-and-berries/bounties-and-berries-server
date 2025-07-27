const userRewardClaimService = require('../services/userRewardClaimService');

// CREATE
exports.createClaim = async (req, res) => {
  try {
    const { user_id, reward_id, berries_spent, redeemable_code } = req.body;
    
    const claimData = {
      user_id,
      reward_id,
      berries_spent,
      redeemable_code,
      created_by: req.user.id,
      modified_by: req.user.id
    };

    const claim = await userRewardClaimService.createClaim(claimData);
    res.status(201).json({ message: 'Reward claim created', claim });
  } catch (err) {
    if (err.message.includes('USER_ID_REWARD_ID_AND_BERRIES_SPENT_REQUIRED')) {
      res.status(400).json({ error: 'User ID, Reward ID, and Berries Spent are required' });
    } else if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else if (err.message.includes('REWARD_NOT_FOUND')) {
      res.status(404).json({ error: 'Reward not found' });
    } else if (err.message.includes('REWARD_EXPIRED')) {
      res.status(400).json({ error: 'Reward has expired' });
    } else if (err.message.includes('REWARD_ALREADY_CLAIMED')) {
      res.status(409).json({ error: 'User has already claimed this reward' });
    } else if (err.message.includes('INVALID_BERRIES_SPENT')) {
      res.status(400).json({ error: 'Berries spent must be greater than 0' });
    } else if (err.message.includes('INSUFFICIENT_BERRIES')) {
      res.status(400).json({ error: 'User does not have enough berries to claim this reward' });
    } else {
      res.status(500).json({ error: 'Failed to create reward claim', details: err.message });
    }
  }
};

// READ (list all)
exports.listClaims = async (req, res) => {
  try {
    const claims = await userRewardClaimService.getAllClaims();
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims', details: err.message });
  }
};

// UPDATE
exports.updateClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { berries_spent, redeemable_code } = req.body;
    
    const updateData = {
      berries_spent,
      redeemable_code,
      modified_by: req.user.id
    };

    const claim = await userRewardClaimService.updateClaim(id, updateData);
    res.json({ message: 'Reward claim updated', claim });
  } catch (err) {
    if (err.message.includes('CLAIM_NOT_FOUND')) {
      res.status(404).json({ error: 'Claim not found' });
    } else if (err.message.includes('INVALID_BERRIES_SPENT')) {
      res.status(400).json({ error: 'Berries spent must be greater than 0' });
    } else if (err.message.includes('INSUFFICIENT_BERRIES')) {
      res.status(400).json({ error: 'User does not have enough berries for this update' });
    } else {
      res.status(500).json({ error: 'Failed to update reward claim', details: err.message });
    }
  }
};

// DELETE (hard delete)
exports.deleteClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const claim = await userRewardClaimService.deleteClaim(id);
    res.json({ message: 'Reward claim deleted', claim });
  } catch (err) {
    if (err.message.includes('CLAIM_NOT_FOUND')) {
      res.status(404).json({ error: 'Claim not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete reward claim', details: err.message });
    }
  }
};

// Get claim by ID
exports.getClaimById = async (req, res) => {
  try {
    const { id } = req.params;
    const claim = await userRewardClaimService.getClaimById(id);
    res.json(claim);
  } catch (err) {
    if (err.message.includes('CLAIM_NOT_FOUND')) {
      res.status(404).json({ error: 'Claim not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch claim', details: err.message });
    }
  }
};

// Get claim with details
exports.getClaimWithDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const claim = await userRewardClaimService.getClaimWithDetails(id);
    res.json(claim);
  } catch (err) {
    if (err.message.includes('CLAIM_NOT_FOUND')) {
      res.status(404).json({ error: 'Claim not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch claim details', details: err.message });
    }
  }
};

// Get all claims with details
exports.getClaimsWithDetails = async (req, res) => {
  try {
    const claims = await userRewardClaimService.getClaimsWithDetails();
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims with details', details: err.message });
  }
};

// Get claims by user
exports.getClaimsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const claims = await userRewardClaimService.getClaimsByUser(userId);
    res.json(claims);
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch claims by user', details: err.message });
    }
  }
};

// Get claims by reward
exports.getClaimsByReward = async (req, res) => {
  try {
    const { rewardId } = req.params;
    const claims = await userRewardClaimService.getClaimsByReward(rewardId);
    res.json(claims);
  } catch (err) {
    if (err.message.includes('REWARD_NOT_FOUND')) {
      res.status(404).json({ error: 'Reward not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch claims by reward', details: err.message });
    }
  }
};

// Get claims by date range
exports.getClaimsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const claims = await userRewardClaimService.getClaimsByDateRange(startDate, endDate);
    res.json(claims);
  } catch (err) {
    if (err.message.includes('INVALID_DATE_RANGE')) {
      res.status(400).json({ error: 'Invalid date range' });
    } else {
      res.status(500).json({ error: 'Failed to fetch claims by date range', details: err.message });
    }
  }
};

// Get claims by berries range
exports.getClaimsByBerriesRange = async (req, res) => {
  try {
    const { min_berries, max_berries } = req.query;
    const claims = await userRewardClaimService.getClaimsByBerriesRange(
      min_berries ? parseInt(min_berries) : undefined,
      max_berries ? parseInt(max_berries) : undefined
    );
    res.json(claims);
  } catch (err) {
    if (err.message.includes('INVALID_MIN_BERRIES')) {
      res.status(400).json({ error: 'Minimum berries cannot be negative' });
    } else if (err.message.includes('INVALID_MAX_BERRIES')) {
      res.status(400).json({ error: 'Maximum berries cannot be negative' });
    } else if (err.message.includes('INVALID_BERRIES_RANGE')) {
      res.status(400).json({ error: 'Minimum berries cannot be greater than maximum berries' });
    } else {
      res.status(500).json({ error: 'Failed to fetch claims by berries range', details: err.message });
    }
  }
};

// Get total berries spent by user
exports.getTotalBerriesSpentByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const totalBerries = await userRewardClaimService.getTotalBerriesSpentByUser(userId);
    res.json(totalBerries);
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch total berries spent', details: err.message });
    }
  }
};

// Get total berries spent by reward
exports.getTotalBerriesSpentByReward = async (req, res) => {
  try {
    const { rewardId } = req.params;
    const totalBerries = await userRewardClaimService.getTotalBerriesSpentByReward(rewardId);
    res.json(totalBerries);
  } catch (err) {
    if (err.message.includes('REWARD_NOT_FOUND')) {
      res.status(404).json({ error: 'Reward not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch total berries spent', details: err.message });
    }
  }
};

// Get claim statistics
exports.getClaimStats = async (req, res) => {
  try {
    const stats = await userRewardClaimService.getClaimStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claim statistics', details: err.message });
  }
};

// Search claims
exports.searchClaims = async (req, res) => {
  try {
    const filters = req.query;
    const claims = await userRewardClaimService.searchClaims(filters);
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search claims', details: err.message });
  }
};

// Check if user has claimed reward
exports.checkUserHasClaimedReward = async (req, res) => {
  try {
    const { userId, rewardId } = req.params;
    const hasClaimed = await userRewardClaimService.checkUserHasClaimedReward(userId, rewardId);
    res.json({ hasClaimed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check user claim status', details: err.message });
  }
};

// Claim reward
exports.claimReward = async (req, res) => {
  try {
    const { rewardId } = req.params;
    const userId = req.user.id;
    
    const result = await userRewardClaimService.claimReward(userId, rewardId, userId);
    
    res.status(201).json({
      message: 'Reward claimed successfully',
      claim: result.claim,
      remaining_berries: result.remaining_berries,
      reward_name: result.reward_name,
      berries_spent: result.berries_spent,
      summary: {
        berries_available: result.remaining_berries,
        berries_spent_on_reward: result.berries_spent
      }
    });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else if (err.message.includes('REWARD_NOT_FOUND')) {
      res.status(404).json({ error: 'Reward not found' });
    } else if (err.message.includes('REWARD_EXPIRED')) {
      res.status(400).json({ error: 'Reward has expired' });
    } else if (err.message.includes('REWARD_ALREADY_CLAIMED')) {
      res.status(409).json({ error: 'You have already claimed this reward' });
    } else if (err.message.includes('INSUFFICIENT_BERRIES')) {
      res.status(400).json({ error: 'Not enough berries to claim this reward' });
    } else {
      res.status(500).json({ error: 'Failed to claim reward', details: err.message });
    }
  }
};

// Validate redeemable code
exports.validateRedeemableCode = async (req, res) => {
  try {
    const { redeemableCode } = req.params;
    const claim = await userRewardClaimService.validateRedeemableCode(redeemableCode);
    res.json({ valid: true, claim });
  } catch (err) {
    if (err.message.includes('INVALID_REDEEMABLE_CODE')) {
      res.status(404).json({ valid: false, error: 'Invalid redeemable code' });
    } else {
      res.status(500).json({ error: 'Failed to validate redeemable code', details: err.message });
    }
  }
};

// Get user claim history
exports.getUserClaimHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await userRewardClaimService.getUserClaimHistory(userId);
    res.json(history);
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch user claim history', details: err.message });
    }
  }
};

// Get reward claim history
exports.getRewardClaimHistory = async (req, res) => {
  try {
    const { rewardId } = req.params;
    const history = await userRewardClaimService.getRewardClaimHistory(rewardId);
    res.json(history);
  } catch (err) {
    if (err.message.includes('REWARD_NOT_FOUND')) {
      res.status(404).json({ error: 'Reward not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch reward claim history', details: err.message });
    }
  }
}; 