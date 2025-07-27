const userRewardClaimRepository = require('../repositories/userRewardClaimRepository');
const userRepository = require('../repositories/userRepository');
const rewardRepository = require('../repositories/rewardRepository');
const bountyParticipationRepository = require('../repositories/bountyParticipationRepository');
const TransactionUtils = require('../utils/transactionUtils');

class UserRewardClaimService {
  async getAllClaims() {
    try {
      return await userRewardClaimRepository.findAll();
    } catch (error) {
      throw new Error(`Service error in getAllClaims: ${error.message}`);
    }
  }

  async getClaimById(id) {
    try {
      const claim = await userRewardClaimRepository.findById(id);
      if (!claim) {
        throw new Error('CLAIM_NOT_FOUND');
      }
      return claim;
    } catch (error) {
      throw new Error(`Service error in getClaimById: ${error.message}`);
    }
  }

  async getClaimWithDetails(id) {
    try {
      const claim = await userRewardClaimRepository.getClaimWithDetails(id);
      if (!claim) {
        throw new Error('CLAIM_NOT_FOUND');
      }
      return claim;
    } catch (error) {
      throw new Error(`Service error in getClaimWithDetails: ${error.message}`);
    }
  }

  async getClaimsWithDetails() {
    try {
      return await userRewardClaimRepository.getClaimsWithDetails();
    } catch (error) {
      throw new Error(`Service error in getClaimsWithDetails: ${error.message}`);
    }
  }

  async getClaimsByUser(userId) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      return await userRewardClaimRepository.findByUserId(userId);
    } catch (error) {
      throw new Error(`Service error in getClaimsByUser: ${error.message}`);
    }
  }

  async getClaimsByReward(rewardId) {
    try {
      // Check if reward exists
      const reward = await rewardRepository.findById(rewardId);
      if (!reward) {
        throw new Error('REWARD_NOT_FOUND');
      }

      return await userRewardClaimRepository.findByRewardId(rewardId);
    } catch (error) {
      throw new Error(`Service error in getClaimsByReward: ${error.message}`);
    }
  }

  async createClaim(claimData) {
    try {
      // Business logic validation
      if (!claimData.user_id || !claimData.reward_id || !claimData.berries_spent) {
        throw new Error('USER_ID_REWARD_ID_AND_BERRIES_SPENT_REQUIRED');
      }

      // Check if user exists
      const user = await userRepository.findById(claimData.user_id);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Check if reward exists
      const reward = await rewardRepository.findById(claimData.reward_id);
      if (!reward) {
        throw new Error('REWARD_NOT_FOUND');
      }

      // Check if reward is available
      if (reward.expiry_date && new Date(reward.expiry_date) < new Date()) {
        throw new Error('REWARD_EXPIRED');
      }

      // Check if user has already claimed this reward
      const existingClaim = await userRewardClaimRepository.findByUserAndReward(
        claimData.user_id, 
        claimData.reward_id
      );
      if (existingClaim) {
        throw new Error('REWARD_ALREADY_CLAIMED');
      }

      // Validate berries spent
      if (claimData.berries_spent <= 0) {
        throw new Error('INVALID_BERRIES_SPENT');
      }

      // Check if user has enough berries
      const userEarnings = await bountyParticipationRepository.getTotalEarningsByUser(claimData.user_id);
      const availableBerries = userEarnings.net_berries;
      
      if (availableBerries < claimData.berries_spent) {
        throw new Error('INSUFFICIENT_BERRIES');
      }

      // Generate unique redeemable code
      const redeemableCode = await userRewardClaimRepository.generateUniqueRedeemableCode();

      // Normalize data
      const normalizedData = {
        user_id: claimData.user_id,
        reward_id: claimData.reward_id,
        berries_spent: claimData.berries_spent,
        redeemable_code: redeemableCode,
        created_by: claimData.created_by,
        modified_by: claimData.modified_by || claimData.created_by
      };

      return await userRewardClaimRepository.create(normalizedData);
    } catch (error) {
      throw new Error(`Service error in createClaim: ${error.message}`);
    }
  }

  async updateClaim(id, updateData) {
    try {
      // Check if claim exists
      const existing = await userRewardClaimRepository.findById(id);
      if (!existing) {
        throw new Error('CLAIM_NOT_FOUND');
      }

      // Validate berries spent if being updated
      if (updateData.berries_spent !== undefined && updateData.berries_spent <= 0) {
        throw new Error('INVALID_BERRIES_SPENT');
      }

      // Check if user has enough berries if berries_spent is being updated
      if (updateData.berries_spent !== undefined) {
        const userEarnings = await bountyParticipationRepository.getTotalEarningsByUser(existing.user_id);
        const availableBerries = userEarnings.net_berries + existing.berries_spent;
        
        if (availableBerries < updateData.berries_spent) {
          throw new Error('INSUFFICIENT_BERRIES');
        }
      }

      // Normalize update data
      const normalizedData = {};
      if (updateData.berries_spent !== undefined) {
        normalizedData.berries_spent = updateData.berries_spent;
      }
      if (updateData.redeemable_code !== undefined) {
        normalizedData.redeemable_code = updateData.redeemable_code;
      }
      if (updateData.modified_by !== undefined) {
        normalizedData.modified_by = updateData.modified_by;
      }

      return await userRewardClaimRepository.update(id, normalizedData);
    } catch (error) {
      throw new Error(`Service error in updateClaim: ${error.message}`);
    }
  }

  async deleteClaim(id) {
    try {
      return await userRewardClaimRepository.delete(id);
    } catch (error) {
      throw new Error(`Service error in deleteClaim: ${error.message}`);
    }
  }

  async getClaimsByDateRange(startDate, endDate) {
    try {
      // Validate dates
      if (startDate && new Date(startDate) > new Date(endDate)) {
        throw new Error('INVALID_DATE_RANGE');
      }

      return await userRewardClaimRepository.findClaimsByDateRange(startDate, endDate);
    } catch (error) {
      throw new Error(`Service error in getClaimsByDateRange: ${error.message}`);
    }
  }

  async getClaimsByBerriesRange(minBerries, maxBerries) {
    try {
      // Validate berries range
      if (minBerries !== undefined && minBerries < 0) {
        throw new Error('INVALID_MIN_BERRIES');
      }
      if (maxBerries !== undefined && maxBerries < 0) {
        throw new Error('INVALID_MAX_BERRIES');
      }
      if (minBerries !== undefined && maxBerries !== undefined && minBerries > maxBerries) {
        throw new Error('INVALID_BERRIES_RANGE');
      }

      return await userRewardClaimRepository.findClaimsByBerriesRange(minBerries, maxBerries);
    } catch (error) {
      throw new Error(`Service error in getClaimsByBerriesRange: ${error.message}`);
    }
  }

  async getTotalBerriesSpentByUser(userId) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      return await userRewardClaimRepository.getTotalBerriesSpentByUser(userId);
    } catch (error) {
      throw new Error(`Service error in getTotalBerriesSpentByUser: ${error.message}`);
    }
  }

  async getTotalBerriesSpentByReward(rewardId) {
    try {
      // Check if reward exists
      const reward = await rewardRepository.findById(rewardId);
      if (!reward) {
        throw new Error('REWARD_NOT_FOUND');
      }

      return await userRewardClaimRepository.getTotalBerriesSpentByReward(rewardId);
    } catch (error) {
      throw new Error(`Service error in getTotalBerriesSpentByReward: ${error.message}`);
    }
  }

  async getClaimStats() {
    try {
      return await userRewardClaimRepository.getClaimStats();
    } catch (error) {
      throw new Error(`Service error in getClaimStats: ${error.message}`);
    }
  }

  async searchClaims(filters) {
    try {
      return await userRewardClaimRepository.searchClaims(filters);
    } catch (error) {
      throw new Error(`Service error in searchClaims: ${error.message}`);
    }
  }

  async checkUserHasClaimedReward(userId, rewardId) {
    try {
      return await userRewardClaimRepository.checkUserHasClaimedReward(userId, rewardId);
    } catch (error) {
      throw new Error(`Service error in checkUserHasClaimedReward: ${error.message}`);
    }
  }

  async claimReward(userId, rewardId, createdBy) {
    try {
      return await TransactionUtils.withTransaction(async (client) => {
        // 1. Lock and validate user exists
        const user = await TransactionUtils.findAndLockRow(client, 'user', 'id', userId);
        
        // 2. Lock and validate reward exists and is available
        const reward = await TransactionUtils.findAndLockRow(client, 'reward', 'id', rewardId);
        
        // 3. Check if reward is expired
        if (reward.expiry_date && new Date(reward.expiry_date) < new Date()) {
          throw new Error('REWARD_EXPIRED');
        }
        
        // 4. Check if user has already claimed this reward (with lock)
        const existingClaim = await client.query(
          'SELECT id FROM user_reward_claim WHERE user_id = $1 AND reward_id = $2 FOR UPDATE',
          [userId, rewardId]
        );
        
        if (existingClaim.rows.length > 0) {
          throw new Error('REWARD_ALREADY_CLAIMED');
        }
        
        // 5. Calculate user's net berries (atomic calculation)
        const earningsResult = await client.query(`
          SELECT 
            COALESCE(SUM(berries_earned), 0) as total_berries_earned
          FROM user_bounty_participation 
          WHERE user_id = $1 AND status = 'completed'
        `, [userId]);
        
        const spentResult = await client.query(`
          SELECT COALESCE(SUM(berries_spent), 0) as total_berries_spent
          FROM user_reward_claim 
          WHERE user_id = $1
        `, [userId]);
        
        const totalEarned = parseInt(earningsResult.rows[0].total_berries_earned, 10);
        const totalSpent = parseInt(spentResult.rows[0].total_berries_spent, 10);
        const availableBerries = totalEarned - totalSpent;
        
        // 6. Validate sufficient berries
        if (availableBerries < reward.berries_spent) {
          throw new Error('INSUFFICIENT_BERRIES');
        }
        
        // 7. Generate unique redeemable code
        const redeemableCode = await this.generateUniqueRedeemableCode(client);
        
        // 8. Create claim record
        const claimData = {
          user_id: userId,
          reward_id: rewardId,
          berries_spent: reward.berries_spent,
          redeemable_code: redeemableCode,
          created_by: createdBy,
          modified_by: createdBy
        };
        
        const claimResult = await client.query(`
          INSERT INTO user_reward_claim 
          (user_id, reward_id, berries_spent, redeemable_code, created_by, modified_by, created_on)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING *
        `, [
          claimData.user_id,
          claimData.reward_id,
          claimData.berries_spent,
          claimData.redeemable_code,
          claimData.created_by,
          claimData.modified_by
        ]);
        
        const claim = claimResult.rows[0];
        
        return {
          claim,
          remaining_berries: availableBerries - reward.berries_spent,
          reward_name: reward.name,
          berries_spent: reward.berries_spent
        };
      });
    } catch (error) {
      throw new Error(`Service error in claimReward: ${error.message}`);
    }
  }

  // Helper method to generate unique redeemable code within transaction
  async generateUniqueRedeemableCode(client) {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const code = 'RWD' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
      
      const existing = await client.query(
        'SELECT id FROM user_reward_claim WHERE redeemable_code = $1',
        [code]
      );
      
      if (existing.rows.length === 0) {
        return code;
      }
      
      attempts++;
    }
    
    throw new Error('UNABLE_TO_GENERATE_UNIQUE_CODE');
  }

  async validateRedeemableCode(redeemableCode) {
    try {
      const claim = await userRewardClaimRepository.findByRedeemableCode(redeemableCode);
      if (!claim) {
        throw new Error('INVALID_REDEEMABLE_CODE');
      }

      // Get claim details with user and reward info
      const claimWithDetails = await userRewardClaimRepository.getClaimWithDetails(claim.id);
      return claimWithDetails;
    } catch (error) {
      throw new Error(`Service error in validateRedeemableCode: ${error.message}`);
    }
  }

  async getUserClaimHistory(userId) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const claims = await userRewardClaimRepository.findByUserId(userId);
      
      // Calculate total berries spent
      const totalBerries = await userRewardClaimRepository.getTotalBerriesSpentByUser(userId);
      
      // Get user earnings for net calculation
      const userEarnings = await bountyParticipationRepository.getTotalEarningsByUser(userId);
      
      return {
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile
        },
        claims,
        total_berries_spent: totalBerries.total_berries_spent,
        total_berries_earned: userEarnings.total_berries_earned,
        net_berries: userEarnings.net_berries,
        total_claims: claims.length
      };
    } catch (error) {
      throw new Error(`Service error in getUserClaimHistory: ${error.message}`);
    }
  }

  async getRewardClaimHistory(rewardId) {
    try {
      // Check if reward exists
      const reward = await rewardRepository.findById(rewardId);
      if (!reward) {
        throw new Error('REWARD_NOT_FOUND');
      }

      const claims = await userRewardClaimRepository.findByRewardId(rewardId);
      
      // Calculate total berries spent
      const totalBerries = await userRewardClaimRepository.getTotalBerriesSpentByReward(rewardId);
      
      return {
        reward: {
          id: reward.id,
          name: reward.name,
          description: reward.description
        },
        claims,
        total_berries_spent: totalBerries.total_berries_spent,
        total_claims: claims.length
      };
    } catch (error) {
      throw new Error(`Service error in getRewardClaimHistory: ${error.message}`);
    }
  }
}

module.exports = new UserRewardClaimService(); 