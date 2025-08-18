const rewardRepository = require('../repositories/rewardRepository');

class RewardService {
  async getAllRewards() {
    try {
      return await rewardRepository.findAll();
    } catch (error) {
      throw new Error(`Service error in getAllRewards: ${error.message}`);
    }
  }

  async getRewardById(id) {
    try {
      const reward = await rewardRepository.findById(id);
      if (!reward) {
        throw new Error('REWARD_NOT_FOUND');
      }
      return reward;
    } catch (error) {
      throw new Error(`Service error in getRewardById: ${error.message}`);
    }
  }

  async createReward(rewardData) {
    try {
      // Business logic validation
      if (!rewardData.name || rewardData.name.trim() === '') {
        throw new Error('NAME_REQUIRED');
      }

      if (!rewardData.berries_required || rewardData.berries_required <= 0) {
        throw new Error('BERRIES_REQUIRED_REQUIRED');
      }

      // Check for duplicate name
      const existing = await rewardRepository.findByName(rewardData.name.trim());
      if (existing) {
        throw new Error('DUPLICATE_NAME');
      }

      // Validate expiry date if provided
      if (rewardData.expiry_date && new Date(rewardData.expiry_date) <= new Date()) {
        throw new Error('INVALID_EXPIRY_DATE');
      }

      // Normalize data
      const normalizedData = {
        name: rewardData.name.trim(),
        description: rewardData.description?.trim() || null,
        berries_required: rewardData.berries_required,
        expiry_date: rewardData.expiry_date || null,
        img_url: rewardData.img_url || null,
        image_hash: rewardData.image_hash || null,
        created_by: rewardData.created_by,
        modified_by: rewardData.modified_by || rewardData.created_by
      };

      return await rewardRepository.create(normalizedData);
    } catch (error) {
      throw new Error(`Service error in createReward: ${error.message}`);
    }
  }

  async updateReward(id, updateData, userId) {
    try {
      // Business logic validation
      if (updateData.name !== undefined && (!updateData.name || updateData.name.trim() === '')) {
        throw new Error('NAME_REQUIRED');
      }

      if (updateData.berries_required !== undefined && updateData.berries_required <= 0) {
        throw new Error('BERRIES_REQUIRED_REQUIRED');
      }

      // Check if reward exists
      const existing = await rewardRepository.findById(id);
      if (!existing) {
        throw new Error('REWARD_NOT_FOUND');
      }

      // Check if user is the creator
      if (existing.created_by !== userId) {
        throw new Error('UNAUTHORIZED_UPDATE');
      }

      // Check for duplicate name if name is being updated
      if (updateData.name && updateData.name.trim() !== existing.name) {
        const duplicate = await rewardRepository.findByName(updateData.name.trim());
        if (duplicate) {
          throw new Error('DUPLICATE_NAME');
        }
      }

      // Validate expiry date if provided
      if (updateData.expiry_date && new Date(updateData.expiry_date) <= new Date()) {
        throw new Error('INVALID_EXPIRY_DATE');
      }

      // Normalize update data
      const normalizedData = {};
      if (updateData.name !== undefined) {
        normalizedData.name = updateData.name.trim();
      }
      if (updateData.description !== undefined) {
        normalizedData.description = updateData.description?.trim() || null;
      }
      if (updateData.berries_required !== undefined) {
        normalizedData.berries_required = updateData.berries_required;
      }
      if (updateData.expiry_date !== undefined) {
        normalizedData.expiry_date = updateData.expiry_date;
      }
      if (updateData.img_url !== undefined) {
        normalizedData.img_url = updateData.img_url;
      }
      if (updateData.image_hash !== undefined) {
        normalizedData.image_hash = updateData.image_hash;
      }
      if (updateData.modified_by !== undefined) {
        normalizedData.modified_by = updateData.modified_by;
      }

      return await rewardRepository.update(id, normalizedData);
    } catch (error) {
      throw new Error(`Service error in updateReward: ${error.message}`);
    }
  }

  async deleteReward(id, userId) {
    try {
      // Check if reward exists
      const existing = await rewardRepository.findById(id);
      if (!existing) {
        throw new Error('REWARD_NOT_FOUND');
      }

      // Check if user is the creator
      if (existing.created_by !== userId) {
        throw new Error('UNAUTHORIZED_DELETE');
      }

      return await rewardRepository.delete(id);
    } catch (error) {
      throw new Error(`Service error in deleteReward: ${error.message}`);
    }
  }

  async getRewardsByCreator(createdBy) {
    try {
      return await rewardRepository.findByCreator(createdBy);
    } catch (error) {
      throw new Error(`Service error in getRewardsByCreator: ${error.message}`);
    }
  }

  async getAvailableRewards() {
    try {
      return await rewardRepository.findAvailable();
    } catch (error) {
      throw new Error(`Service error in getAvailableRewards: ${error.message}`);
    }
  }

  async getExpiredRewards() {
    try {
      return await rewardRepository.findExpired();
    } catch (error) {
      throw new Error(`Service error in getExpiredRewards: ${error.message}`);
    }
  }

  async searchRewardsByName(name) {
    try {
      if (!name || name.trim() === '') {
        return await rewardRepository.findAll();
      }
      return await rewardRepository.searchByName(name.trim());
    } catch (error) {
      throw new Error(`Service error in searchRewardsByName: ${error.message}`);
    }
  }

  async searchRewardsByDescription(description) {
    try {
      if (!description || description.trim() === '') {
        return await rewardRepository.findAll();
      }
      return await rewardRepository.searchByDescription(description.trim());
    } catch (error) {
      throw new Error(`Service error in searchRewardsByDescription: ${error.message}`);
    }
  }

  async searchRewardsByBerriesRange(minBerries, maxBerries) {
    try {
      if (minBerries !== undefined && minBerries < 0) {
        throw new Error('INVALID_MIN_BERRIES');
      }
      if (maxBerries !== undefined && maxBerries < 0) {
        throw new Error('INVALID_MAX_BERRIES');
      }
      if (minBerries !== undefined && maxBerries !== undefined && minBerries > maxBerries) {
        throw new Error('INVALID_BERRIES_RANGE');
      }

      return await rewardRepository.findByBerriesRange(minBerries, maxBerries);
    } catch (error) {
      throw new Error(`Service error in searchRewardsByBerriesRange: ${error.message}`);
    }
  }

  async getExpiringSoonRewards(days = 7) {
    try {
      if (days < 1) {
        throw new Error('INVALID_DAYS_PARAMETER');
      }
      return await rewardRepository.findExpiringSoon(days);
    } catch (error) {
      throw new Error(`Service error in getExpiringSoonRewards: ${error.message}`);
    }
  }

  async getAllRewardsIncludingExpired() {
    try {
      return await rewardRepository.getAllIncludingExpired();
    } catch (error) {
      throw new Error(`Service error in getAllRewardsIncludingExpired: ${error.message}`);
    }
  }

  async getClaimedRewards(userId) {
    try {
      return await rewardRepository.getClaimedRewards(userId);
    } catch (error) {
      throw new Error(`Service error in getClaimedRewards: ${error.message}`);
    }
  }

  async checkUserCanClaimReward(userId, rewardId) {
    try {
      return await rewardRepository.checkUserCanClaim(userId, rewardId);
    } catch (error) {
      throw new Error(`Service error in checkUserCanClaimReward: ${error.message}`);
    }
  }

  async searchAndFilterRewards(filters) {
    try {
      const { name, description, min_berries, max_berries, creator, status } = filters;

      // Handle different filter combinations
      if (name) {
        return await this.searchRewardsByName(name);
      }

      if (description) {
        return await this.searchRewardsByDescription(description);
      }

      if (min_berries !== undefined || max_berries !== undefined) {
        return await this.searchRewardsByBerriesRange(min_berries, max_berries);
      }

      if (creator) {
        return await this.getRewardsByCreator(creator);
      }

      if (status === 'available') {
        return await this.getAvailableRewards();
      }

      if (status === 'expired') {
        return await this.getExpiredRewards();
      }

      // Default: return all rewards
      return await this.getAllRewards();
    } catch (error) {
      throw new Error(`Service error in searchAndFilterRewards: ${error.message}`);
    }
  }
}

module.exports = new RewardService(); 